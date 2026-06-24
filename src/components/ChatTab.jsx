import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, MapPin, Paperclip, Info, Loader2 } from 'lucide-react';
import { chatAPI, authAPI } from '../api';

// Merge incoming messages into existing state by id instead of replacing the
// array outright. This is critical: if the backend paginates listMessages
// (e.g. only returns the most recent page), a hard `setMessages(fresh)` would
// silently drop every older message that isn't in that page. Merging by id
// guarantees messages only ever accumulate, never vanish, while still picking
// up edits (e.g. profile updates) on existing ids.
function mergeMessages(prev, incoming) {
  if (!incoming || incoming.length === 0) return prev;
  const map = new Map();
  prev.forEach((m) => map.set(m.id, m));
  incoming.forEach((m) => map.set(m.id, m));
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
}

// A DOCUMENT message whose file_url looks like an image gets rendered inline
// as a photo instead of a plain attachment link. Keeps the existing
// "DOCUMENT" message_type contract on the backend untouched.
function isImageUrl(url) {
  return !!url && /\.(png|jpe?g|gif|webp|avif|heic|heif)(\?.*)?$/i.test(url);
}

export default function ChatTab({ trekId, members }) {
  const queryClient = useQueryClient();
  const currentUser = authAPI.getCurrentUser();

  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const wsRef = useRef(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load message logs from REST on mount
  const { data: initialMessages = [] } = useQuery({
    queryKey: ['chatMessages', trekId],
    queryFn: () => chatAPI.listMessages(trekId),
  });

  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(prev => mergeMessages(prev, initialMessages));
    }
  }, [initialMessages]);

  // WebSocket Connection
  useEffect(() => {
    const wsUrl = chatAPI.getWebSocketUrl(trekId);

    // Fallback: If Channels is disabled on backend, we will just poll HTTP every 5 seconds
    let pollInterval = null;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setWsConnected(true);
        console.log('WebSocket connected to group:', trekId);
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.error("WS error:", data.error);
          return;
        }

        // Handle profile updates
        if (data.type === 'profile_update') {
          const profileUpdate = data.data;
          setMessages(prev =>
            prev.map(msg =>
              msg.sender === profileUpdate.user_id
                ? { ...msg, sender_profile: profileUpdate.profile }
                : msg
            )
          );
          console.log("Profile updated for user:", profileUpdate.username);
          return;
        }

        setMessages(prev => {
          // Prevent duplicates
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      };

      socket.onclose = () => {
        setWsConnected(false);
        // Start HTTP polling if socket closes (meaning backend doesn't support websockets locally)
        pollInterval = setInterval(async () => {
          try {
            const fresh = await chatAPI.listMessages(trekId);
            setMessages(prev => mergeMessages(prev, fresh));
          } catch (err) {
            console.error("Polling chat failed:", err);
          }
        }, 5000);
      };

      socket.onerror = () => {
        setWsConnected(false);
        console.error('WebSocket error for group:', trekId);
      };
    } catch (e) {
      console.warn("WebSocket initiation failed. Falling back to HTTP polling.", e);
      setWsConnected(false);
      pollInterval = setInterval(async () => {
        try {
          const fresh = await chatAPI.listMessages(trekId);
          setMessages(prev => mergeMessages(prev, fresh));
        } catch (err) {
          console.error("Polling chat failed:", err);
        }
      }, 5000);
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [trekId]);

  // Scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark this trek's chat as "seen" whenever messages are viewed here.
  // The floating "Manage Expeditions" dock (App.jsx) reads this timestamp
  // to compute unread message badges per expedition.
  useEffect(() => {
    try {
      localStorage.setItem(`trekkar_chat_last_seen_${trekId}`, new Date().toISOString());
    } catch (e) {
      // localStorage unavailable (e.g. private browsing) - safe to ignore
    }
  }, [messages, trekId]);

  // HTTP fallback mutation for sending message
  const sendMessageMutation = useMutation({
    mutationFn: ({ content, type, extra }) => chatAPI.sendMessage(trekId, content, type, extra),
    onSuccess: (data) => {
      setMessages(prev => [...prev, data]);
    }
  });

  const dispatchMessage = (msgType, textContent, extra = {}) => {
    if (wsConnected && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        message_type: msgType,
        content: textContent,
        token_user_id: currentUser.id, // Fallback identifier
        ...extra,
      }));
    } else {
      sendMessageMutation.mutate({
        content: textContent,
        type: msgType,
        extra,
      });
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    dispatchMessage('TEXT', inputVal);
    setInputVal('');
  };

  // Opens the device's native gallery / file picker directly.
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  // Uploads the picked file (photo or document) and drops it straight into
  // the chat as soon as the upload completes - no extra "send" step needed.
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploaded = await chatAPI.uploadAttachment(trekId, formData);
      const fileUrl = uploaded?.file_url || uploaded?.url;
      if (!fileUrl) throw new Error('Upload response missing file_url');

      const isImage = file.type.startsWith('image/');
      const textContent = isImage ? (file.name || 'Photo') : `Shared a file: ${file.name}`;

      dispatchMessage('DOCUMENT', textContent, { file_url: fileUrl });
    } catch (err) {
      console.error('Attachment upload failed:', err);
      alert('Failed to upload attachment. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleShareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const locContent = `GPS Location Shared: [${lat.toFixed(4)}, ${lng.toFixed(4)}]`;
          dispatchMessage('LOCATION', locContent, { latitude: lat, longitude: lng });
        },
        () => {
          const lat = 12.9716 + (Math.random() - 0.5) * 0.05;
          const lng = 77.5946 + (Math.random() - 0.5) * 0.05;
          const locContent = `GPS Coordinates (Simulated): [${lat.toFixed(4)}, ${lng.toFixed(4)}]`;
          dispatchMessage('LOCATION', locContent, { latitude: lat, longitude: lng });
        }
      );
    }
  };

  return (
    <div className="rounded-[1.75rem] bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] overflow-hidden flex flex-col h-[60vh] shadow-[0_15px_40px_rgba(0,0,0,0.25)]">
      {/* Header bar / status */}
      <div className="px-4 sm:px-5 py-3 border-b border-white/[0.06] flex items-center justify-between text-[11px] sm:text-xs text-dark-muted select-none">
        <div className="flex items-center gap-1.5 font-semibold truncate max-w-[70%]">
          <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 ${wsConnected ? 'bg-primary' : 'bg-yellow-400 animate-pulse'}`} />
          <span className="truncate">{wsConnected ? 'Real-time Channel Connected' : 'HTTP Sync Mode (Active)'}</span>
        </div>
        <span className="shrink-0">{members?.length || 0} online</span>
      </div>

      {/* Messages viewport */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-dark-muted p-4">
            <Info className="w-8 h-8 opacity-30 mb-2" />
            <p className="text-xs">No chat logs yet. Say hello to your squad!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = currentUser && String(msg.sender) === String(currentUser.id);
            const profilePic = msg.sender_profile?.profile_picture_url;
            const senderName = msg.sender_username;
            const isImageAttachment = msg.message_type === 'DOCUMENT' && isImageUrl(msg.file_url);

            return (
              <div
                key={msg.id}
                className={`flex gap-2 sm:gap-3 text-left ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  profilePic ? (
                    <img
                      src={profilePic}
                      alt={senderName}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-1 ring-white/10 self-end shrink-0"
                      title={senderName}
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 ring-1 ring-white/10 text-primary flex items-center justify-center font-bold text-xs uppercase self-end shrink-0">
                      {senderName ? senderName[0] : '?'}
                    </div>
                  )
                )}

                <div className="max-w-[85%] sm:max-w-[70%] space-y-1">
                  {!isMe && (
                    <div className="flex items-center gap-2 ml-1">
                      <span className="text-[10px] text-dark-muted font-semibold truncate max-w-[120px]">{senderName}</span>
                      {msg.sender_profile?.is_verified && (
                        <span className="text-[9px] text-primary font-bold shrink-0">✓ Verified</span>
                      )}
                    </div>
                  )}

                  {isImageAttachment ? (
                    <a href={msg.file_url} target="_blank" rel="noreferrer" className="block rounded-2xl overflow-hidden border border-white/[0.08] max-w-[260px]">
                      <img
                        src={msg.file_url}
                        alt={msg.content || 'Shared photo'}
                        className="w-full max-h-72 object-cover"
                        loading="lazy"
                      />
                    </a>
                  ) : (
                    <div className={`p-3 sm:p-3.5 rounded-2xl text-sm leading-relaxed break-words ${
                      isMe
                        ? 'bg-primary text-dark-bg font-medium rounded-br-md'
                        : 'bg-white/[0.05] border border-white/[0.07] text-dark-text rounded-bl-md'
                    }`}>
                      {msg.message_type === 'LOCATION' && (
                        <div className="space-y-2">
                          <p className="flex items-center gap-1 font-bold text-xs">
                            <MapPin className="w-4 h-4 shrink-0" />
                            <span>Coordinates Pin Shared</span>
                          </p>
                          <p className="text-xs opacity-90">{msg.content}</p>
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${msg.latitude}&mlon=${msg.longitude}#map=16/${msg.latitude}/${msg.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`inline-block text-[10px] font-bold underline ${isMe ? 'text-dark-bg hover:opacity-80' : 'text-primary'}`}
                          >
                            View OpenStreetMap
                          </a>
                        </div>
                      )}

                      {msg.message_type === 'DOCUMENT' && (
                        <div className="space-y-1.5">
                          <p className="flex items-center gap-1 font-bold text-xs">
                            <Paperclip className="w-4 h-4 shrink-0" />
                            <span>Attachment Link</span>
                          </p>
                          <a
                            href={msg.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-xs underline break-all font-semibold"
                          >
                            {msg.content}
                          </a>
                        </div>
                      )}

                      {msg.message_type === 'TEXT' && (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  )}

                  <p className={`text-[9px] text-dark-muted ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {isUploading && (
        <div className="px-4 sm:px-5 py-2 border-t border-white/[0.06] flex items-center gap-2 text-[11px] text-dark-muted">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          Uploading attachment...
        </div>
      )}

      {/* Hidden native picker - opens the device's gallery / file browser directly */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.zip"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Input controls form */}
      <form onSubmit={handleSend} className="p-2 sm:p-3 border-t border-white/[0.06] flex items-center gap-1.5 sm:gap-2.5">
        <button
          type="button"
          onClick={handleAttachClick}
          disabled={isUploading}
          className="p-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-dark-muted hover:text-primary hover:border-primary/30 transition duration-200 shrink-0 disabled:opacity-50"
          title="Attach a photo or file"
        >
          {isUploading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        <button
          type="button"
          onClick={handleShareLocation}
          className="p-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-dark-muted hover:text-primary hover:border-primary/30 transition duration-200 shrink-0"
          title="Share Current Coordinates"
        >
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Send a message..."
          className="flex-1 min-w-0 px-4 py-2.5 sm:py-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-dark-text text-sm placeholder:text-dark-muted/50 focus:outline-none focus:border-primary/50 transition-colors"
        />

        <button
          type="submit"
          disabled={!inputVal.trim()}
          className="p-3 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:hover:bg-primary text-dark-bg rounded-full transition duration-200 shrink-0 shadow-md shadow-primary/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}