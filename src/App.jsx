import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery, useQueries } from '@tanstack/react-query';
import { Compass, User, LogOut, Settings, ArrowRight, ChevronUp, Calendar } from 'lucide-react';
import { authAPI, treksAPI, chatAPI } from './api';

const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const TrekDetail = lazy(() => import('./pages/TrekDetail'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 15000,
    },
  },
});

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[45vh]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Fixed Isolated Header Avatar ──
// Added 'aspect-square' and 'h-8 w-8' constraints to lock down dimensions
function NavHeaderAvatar({ src, username }) {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={username}
        className="w-8 h-8 rounded-full object-cover aspect-square border border-primary/40 group-hover:border-primary transition duration-200 shrink-0 block"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/40 group-hover:bg-primary/30 transition duration-200 shrink-0 aspect-square">
      <User className="w-4 h-4" />
    </div>
  );
}

function NavigationBar({ user, onLogout }) {
  const userProfilePic = user?.profile_picture_url || user?.profile?.profile_picture_url;

  return (
    <nav className="glass-panel sticky top-0 z-50 px-4 sm:px-6 py-4 flex items-center justify-between border-b border-dark-border/40 bg-dark-bg/80 backdrop-blur-md">
      <Link to="/" className="flex items-center gap-2 text-primary font-bold text-xl sm:text-2xl tracking-tight shrink-0 no-underline">
        <Compass className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse-slow" />
        <span>RALLYGRID</span>
      </Link>

      {user ? (
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <Link to="/" className="text-dark-muted hover:text-dark-text transition duration-250 text-xs sm:text-sm font-medium shrink-0 no-underline">
            Expeditions
          </Link>
          <div className="h-4 w-[1px] bg-dark-border shrink-0" />

          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link to={`/profile/${user.id}`} className="flex items-center gap-2 group min-w-0 no-underline">
              {/* Enforced layout container safety */}
              <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                <NavHeaderAvatar src={userProfilePic} username={user.username} />
              </div>
              
              <div className="hidden sm:block text-left truncate max-w-[120px]">
                <p className="text-sm font-semibold leading-tight text-dark-text group-hover:text-primary transition duration-200 truncate">
                  {user.username}
                </p>
                <p className="text-[10px] text-dark-muted font-bold tracking-wider uppercase truncate">
                  {user.profile?.experience_level || 'Beginner'}
                </p>
              </div>
            </Link>

            <button
              onClick={onLogout}
              className="text-dark-muted hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition duration-200 shrink-0 flex items-center justify-center focus:outline-none"
              title="Logout"
              aria-label="Logout Workspace"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      ) : (
        <Link
          to="/login"
          className="bg-primary hover:bg-primary-hover text-dark-bg font-semibold px-4 py-2 rounded-lg transition duration-200 text-xs sm:text-sm shadow-lg shadow-primary/20 shrink-0 no-underline"
        >
          Sign In
        </Link>
      )}
    </nav>
  );
}

// Reads the per-trek "last seen" timestamp set by ChatTab when the user
// actually views that expedition's chat.
function getChatLastSeen(trekId) {
  try {
    return localStorage.getItem(`trekkar_chat_last_seen_${trekId}`);
  } catch (e) {
    return null;
  }
}

function UnreadBadge({ count, className = '' }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className={`flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black leading-none shrink-0 ${className}`}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}

function OrganizerFloatingDock({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const dockRef = useRef(null);

  const { data: treks = [] } = useQuery({
    queryKey: ['organizer-floating-treks'],
    queryFn: treksAPI.list,
    enabled: !!user,
  });

  const organized = treks
    .filter((item) => item.organizer === user?.id)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Poll each organized expedition's chat so we can compute unread counts.
  // This stays lightweight since it's only the organizer's own expeditions.
  const unreadQueries = useQueries({
    queries: organized.map((trek) => ({
      queryKey: ['dock-chat-unread', trek.id],
      queryFn: () => chatAPI.listMessages(trek.id),
      enabled: !!user,
      refetchInterval: 20000,
      staleTime: 10000,
    })),
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dockRef.current && !dockRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;
  if (organized.length === 0) return null;

  const nextTrek = organized.find((item) => new Date(item.date) >= new Date()) || organized[0];

  // Map of trekId -> unread count (messages newer than last-seen, excluding own messages)
  const unreadByTrek = {};
  organized.forEach((trek, idx) => {
    const msgs = unreadQueries[idx]?.data || [];
    const lastSeen = getChatLastSeen(trek.id);
    const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0;
    unreadByTrek[trek.id] = msgs.filter((m) => {
      const isOwnMessage = user && String(m.sender) === String(user.id);
      return !isOwnMessage && new Date(m.created_at).getTime() > lastSeenTime;
    }).length;
  });

  const totalUnread = Object.values(unreadByTrek).reduce((sum, n) => sum + n, 0);

  return (
    <div ref={dockRef} className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="w-72 max-w-[calc(100vw-32px)] max-h-[60vh] overflow-y-auto bg-dark-bg border border-dark-border/60 rounded-xl shadow-2xl shadow-black/40 divide-y divide-dark-border/30">
          <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-dark-muted bg-dark-bg/95 sticky top-0">
            Your Expeditions ({organized.length})
          </div>
          {organized.map((trek) => {
            const unreadCount = unreadByTrek[trek.id] || 0;
            return (
              <Link
                key={trek.id}
                to={`/trek/${trek.id}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-primary/10 transition duration-150 no-underline group"
              >
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-dark-bg transition duration-150">
                  <Settings className="w-3.5 h-3.5" />
                </span>
                <span className="flex-1 min-w-0 text-left">
                  <span className="block text-sm font-bold text-dark-text group-hover:text-primary transition duration-150 truncate">
                    {trek.title}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-dark-muted truncate">
                    <Calendar className="w-3 h-3 shrink-0" />
                    {new Date(trek.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {unreadCount > 0 && (
                      <span className="text-primary font-bold ml-1">
                        • {unreadCount} new message{unreadCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                </span>
                <UnreadBadge count={unreadCount} />
                <ArrowRight className="w-3.5 h-3.5 text-dark-muted shrink-0 group-hover:text-primary transition duration-150" />
              </Link>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center gap-3 bg-primary text-dark-bg rounded-xl shadow-2xl shadow-primary/20 px-4 py-3 hover:bg-primary-hover transition duration-200 max-w-[calc(100vw-32px)] focus:outline-none"
        title="Manage Expeditions"
        aria-label="Manage Expeditions"
        aria-expanded={isOpen}
      >
        <span className="w-9 h-9 rounded-lg bg-dark-bg text-primary flex items-center justify-center shrink-0">
          <Settings className="w-4 h-4" />
        </span>
        <span className="hidden sm:block text-left">
          <span className="block text-[10px] font-bold uppercase tracking-wider">
            {organized.length > 1 ? `Manage ${organized.length} Expeditions` : 'Manage Expedition'}
          </span>
          <span className="block max-w-[180px] truncate text-sm font-bold">
            {nextTrek.title}
          </span>
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 shrink-0" />
        ) : (
          <ArrowRight className="w-4 h-4 shrink-0" />
        )}
        <UnreadBadge
          count={totalUnread}
          className="absolute -top-1.5 -right-1.5 border-2 border-dark-bg"
        />
      </button>
    </div>
  );
}

function MainLayout() {
  const [currentUser, setCurrentUser] = useState(authAPI.getCurrentUser());
  const navigate = useNavigate();

  useEffect(() => {
    const syncUser = () => setCurrentUser(authAPI.getCurrentUser());
    syncUser();
    window.addEventListener('userUpdated', syncUser);
    return () => window.removeEventListener('userUpdated', syncUser);
  }, []);

  const handleLogout = () => {
    authAPI.logout();
    setCurrentUser(null);
    navigate('/login');
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg">
      <NavigationBar user={currentUser} onLogout={handleLogout} />
      <OrganizerFloatingDock user={currentUser} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route
              path="/"
              element={currentUser ? <Dashboard /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/login"
              element={!currentUser ? <Auth isLogin={true} onAuthSuccess={handleLoginSuccess} /> : <Navigate to="/" replace />}
            />
            <Route
              path="/register"
              element={!currentUser ? <Auth isLogin={false} onAuthSuccess={handleLoginSuccess} /> : <Navigate to="/" replace />}
            />
            <Route
              path="/profile/:id"
              element={currentUser ? <Profile /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/trek/:id"
              element={currentUser ? <TrekDetail /> : <Navigate to="/login" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      <footer className="py-6 border-t border-dark-border/20 text-center text-xs sm:text-sm text-dark-muted mt-auto select-none">
        <p>&copy; {new Date().getFullYear()} TREK Expedition System. Adventure awaits.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <MainLayout />
      </Router>
    </QueryClientProvider>
  );
}