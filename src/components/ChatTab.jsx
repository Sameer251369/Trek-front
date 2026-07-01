import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Send, MapPin, Paperclip, Info, Image as ImageIcon, X } from 'lucide-react';
import { chatAPI, authAPI, fixMediaUrl } from '../api';

function mergeMessages(prev, incoming) {
  if (!incoming || incoming.length === 0) return prev;
  const map = new Map();
  prev.forEach((m) => map.set(m.id, m));
  incoming.forEach((m) => map.set(m.id, m));
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
}

export default function ChatTab({ trekId, members }) {
  const currentUser = authAPI.getCurrentUser();
  
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const wsRef = useRef(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const { data: initialMessages = [] } = useQuery({
    queryKey: ['chatMessages', trekId],
    queryFn: () => chatAPI.listMessages(trekId),
  });

  useEffect(() => {
    if (initialMessages.length > 0) {
      Promise.resolve().then(() => {
        setMessages(prev => mergeMessages(prev, initialMessages));
      });
    }
  }, [initialMessages]);

  useEffect(() => {
    const wsUrl = chatAPI.getWebSocketUrl(trekId);
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
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      };

      socket.onclose = () => {
        setWsConnected(false);
        pollInterval = setInterval(async () => {
          try {
            const fresh = await chatAPI.listMessages(trekId);
            setMessages(prev => mergeMessages(prev, fresh));
          } catch (err) {
            console.error("Polling chat failed:", err);
          }
        }, 5000);
      };
    } catch (e) {
      console.warn("WebSocket initiation failed. Falling back to HTTP polling.", e);
      Promise.resolve().then(() => {
        setWsConnected(false);
      });
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

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(`trekkar_chat_last_seen_${trekId}`, new Date().toISOString());
    } catch {
      // localStorage unavailable (e.g. private browsing) - safe to ignore
    }
  }, [messages, trekId]);

  const sendMessageMutation = useMutation({
    mutationFn: ({ content, type, extra }) => chatAPI.sendMessage(trekId, content, type, extra),
    onSuccess: (data) => {
      setMessages(prev => [...prev, data]);
    }
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim() && !uploadUrl) return;

    const msgType = uploadUrl && uploadType.startsWith('image/') ? 'IMAGE' : uploadUrl ? 'DOCUMENT' : 'TEXT';
    const textContent = uploadUrl ? (inputVal || uploadName || 'Attachment') : inputVal;
    
    if (wsConnected && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        message_type: msgType,
        content: textContent,
        file_url: uploadUrl,
        token_user_id: currentUser.id
      }));
    } else {
      sendMessageMutation.mutate({
        content: textContent,
        type: msgType,
        extra: uploadUrl ? { file_url: uploadUrl } : {}
      });
    }

    setInputVal('');
    setUploadUrl('');
    setUploadName('');
    setUploadType('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFilePicked = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const data = await chatAPI.uploadAttachment(trekId, formData);
      setUploadUrl(data.file_url);
      setUploadName(file.name);
      setUploadType(file.type || '');
      if (!inputVal.trim()) setInputVal(file.name);
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed. Please try again.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  const clearAttachment = () => {
    setUploadUrl('');
    setUploadName('');
    setUploadType('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleShareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const locContent = `GPS Coordinates Shared: [${lat.toFixed(5)}, ${lng.toFixed(5)}]`;
          
          if (wsConnected && wsRef.current) {
            wsRef.current.send(JSON.stringify({
              message_type: 'LOCATION',
              content: locContent,
              latitude: lat,
              longitude: lng,
            }));
          } else {
            sendMessageMutation.mutate({
              content: locContent,
              type: 'LOCATION',
              extra: { latitude: lat, longitude: lng }
            });
          }
        },
        () => {
          const lat = 12.9716 + (Math.random() - 0.5) * 0.05;
          const lng = 77.5946 + (Math.random() - 0.5) * 0.05;
          const locContent = `GPS Coordinates (Simulated): [${lat.toFixed(4)}, ${lng.toFixed(4)}]`;
          
          if (wsConnected && wsRef.current) {
            wsRef.current.send(JSON.stringify({
              message_type: 'LOCATION',
              content: locContent,
              latitude: lat,
              longitude: lng,
            }));
          } else {
            sendMessageMutation.mutate({
              content: locContent,
              type: 'LOCATION',
              extra: { latitude: lat, longitude: lng }
            });
          }
        }
      );
    }
  };

  return (
    <div className="border border-[#1C1C1E] bg-[#0A0A0C] rounded-none overflow-hidden flex flex-col h-[60vh] font-mono text-xs text-left">
      {/* Header bar / status */}
      <div className="px-3 sm:px-5 py-3 border-b border-[#1C1C1E] flex items-center justify-between text-[10px] text-dark-muted bg-[#050505] select-none uppercase">
        <div className="flex items-center gap-1.5 font-bold truncate max-w-[70%]">
          <span className={`w-1.5 h-1.5 shrink-0 rounded-none ${wsConnected ? 'bg-primary animate-pulse' : 'bg-yellow-500'}`} />
          <span className="truncate">{wsConnected ? 'SYS // Real-time channel active' : 'SYS // HTTP Polling Mode active'}</span>
        </div>
        <span className="shrink-0">{members?.length || 0} online</span>
      </div>

      {/* Messages viewport */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-dark-muted p-4">
            <Info className="w-6 h-6 opacity-40 mb-2 text-primary" />
            <p className="font-sans">No chat logs yet. Type a command or message to broadcast.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = currentUser && String(msg.sender) === String(currentUser.id);
            const profilePic = fixMediaUrl(msg.sender_profile?.profile_picture_url);
            const senderName = msg.sender_username;
            const fileUrl = fixMediaUrl(msg.file_url);
            
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
                      className="w-7 h-7 sm:w-8 sm:h-8 object-cover border border-[#1C1C1E] self-end shrink-0 rounded-none"
                      title={senderName}
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#000000] border border-[#1C1C1E] text-primary flex items-center justify-center font-bold text-[10px] uppercase self-end shrink-0 rounded-none">
                      {senderName ? senderName[0] : '?'}
                    </div>
                  )
                )}
                
                <div className="max-w-[85%] sm:max-w-[70%] space-y-1">
                  {!isMe && (
                    <div className="flex items-center gap-2 ml-1">
                      <span className="text-[9px] text-dark-muted font-bold truncate max-w-[120px] uppercase">{senderName}</span>
                      {msg.sender_profile?.is_verified && (
                        <span className="text-[8px] text-primary font-bold shrink-0 uppercase">[ Verified ]</span>
                      )}
                    </div>
                  )}
                  
                  <div className={`p-2.5 sm:p-3 border text-[13px] leading-relaxed break-words rounded-none ${
                    isMe 
                      ? 'bg-primary border-primary/20 text-dark-bg font-bold font-sans' 
                      : 'bg-[#000000] border-[#1C1C1E] text-dark-text font-sans'
                  }`}>
                    {msg.message_type === 'LOCATION' && (
                      <div className="space-y-2 font-mono text-xs">
                        <p className="flex items-center gap-1 font-bold text-xs uppercase text-primary">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span>COORDINATES SHARED</span>
                        </p>
                        <p className="text-xs opacity-90">{msg.content}</p>
                        <a 
                          href={`https://www.openstreetmap.org/?mlat=${msg.latitude}&mlon=${msg.longitude}#map=16/${msg.latitude}/${msg.longitude}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className={`inline-block text-[10px] font-bold underline ${isMe ? 'text-dark-bg hover:opacity-85' : 'text-primary'}`}
                        >
                          OPEN OSM_MAP LINK
                        </a>
                      </div>
                    )}

                    {msg.message_type === 'IMAGE' && (
                      <div className="space-y-2 font-sans">
                        <a href={fileUrl} target="_blank" rel="noreferrer" className="block">
                          <img
                            src={fileUrl}
                            alt={msg.content || 'Shared image'}
                            className="max-h-64 w-full object-cover border border-[#1C1C1E] rounded-none filter grayscale hover:grayscale-0 transition duration-200"
                          />
                        </a>
                        {msg.content && <p className="text-xs font-semibold mt-1">{msg.content}</p>}
                      </div>
                    )}

                    {msg.message_type === 'DOCUMENT' && (
                      <div className="space-y-1.5 font-mono text-xs">
                        <p className="flex items-center gap-1 font-bold text-xs uppercase text-primary">
                          <Paperclip className="w-4 h-4 shrink-0" />
                          <span>ATTACHMENT LINK</span>
                        </p>
                        <a 
                          href={fileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="block text-xs underline break-all font-semibold hover:opacity-80"
                        >
                          {msg.content}
                        </a>
                      </div>
                    )}

                    {msg.message_type === 'TEXT' && (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  
                  <p className={`text-[8px] text-dark-muted font-mono ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {(isUploading || uploadUrl) && (
        <div className="px-3 sm:px-5 py-2.5 border-t border-[#1C1C1E] bg-[#000000]/60 flex items-center justify-between text-xs gap-2.5 uppercase font-mono">
          <div className="flex items-center gap-2 min-w-0 text-dark-muted">
            {uploadType.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-primary shrink-0" /> : <Paperclip className="w-4 h-4 text-primary shrink-0" />}
            <span className="truncate text-[10px]">
              {isUploading ? 'SYS // Uploading packet...' : uploadName || 'Packet buffer ready'}
            </span>
          </div>
          <button 
            type="button"
            onClick={clearAttachment} 
            className="text-xs text-primary hover:text-red-400 font-bold shrink-0 px-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input controls form */}
      <form onSubmit={handleSend} className="p-2 sm:p-4 border-t border-[#1C1C1E] bg-[#000000] flex items-center gap-1.5 sm:gap-3 rounded-none">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`p-2 sm:p-2.5 border transition duration-150 shrink-0 rounded-none ${
            uploadUrl ? 'border-primary/40 bg-primary/10 text-primary' : 'border-[#1C1C1E] text-dark-muted hover:border-primary hover:text-primary'
          }`}
          title="Add image or file"
        >
          <Paperclip className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={handleFilePicked}
          className="hidden"
        />

        <button
          type="button"
          onClick={handleShareLocation}
          className="p-2 sm:p-2.5 border border-[#1C1C1E] text-dark-muted hover:border-primary hover:text-primary transition duration-150 shrink-0 rounded-none"
          title="Share Coordinates Pin"
        >
          <MapPin className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </button>

        <input 
          type="text" 
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={uploadUrl ? "Label attachment link..." : "Type message command..."}
          className="flex-1 min-w-0 px-3 py-2 sm:px-4 sm:py-3 bg-[#0A0A0C] border border-[#1C1C1E] focus:border-primary text-dark-text text-xs focus:outline-none rounded-none font-mono placeholder:text-dark-muted-dim"
        />

        <button 
          type="submit" 
          disabled={!inputVal.trim() && !uploadUrl}
          className="p-2.5 sm:p-3 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:hover:bg-primary text-dark-bg rounded-none transition duration-150 shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
