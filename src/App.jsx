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
      <div className="w-6 h-6 border-2 border-neutral-800 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );
}

// ── Fixed Isolated Header Avatar ──
function NavHeaderAvatar({ src, username }) {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={username}
        className="w-8 h-8 rounded-full object-cover aspect-square border border-neutral-200 shadow-sm group-hover:border-amber-500/50 transition duration-300 shrink-0 block"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 border border-neutral-200 group-hover:bg-neutral-200 transition duration-300 shrink-0 aspect-square">
      <User className="w-4 h-4 stroke-[1.5]" />
    </div>
  );
}

function NavigationBar({ user, onLogout }) {
  const userProfilePic = user?.profile_picture_url || user?.profile?.profile_picture_url;

  return (
    <nav className="sticky top-0 z-50 px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-neutral-200/80 bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 shadow-[0_2px_20px_-10px_rgba(0,0,0,0.05)]">
      <Link to="/" className="flex items-center gap-2.5 text-neutral-900 font-semibold text-lg sm:text-xl tracking-tight shrink-0 no-underline group">
        <Compass className="w-5 h-5 text-amber-600 group-hover:rotate-45 transition-transform duration-500 ease-out" />
        <span className="font-display tracking-[0.05em] text-neutral-900 font-medium">RALLYGRID</span>
      </Link>

      {user ? (
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <Link to="/" className="text-neutral-500 hover:text-neutral-900 transition duration-300 text-xs sm:text-sm font-medium tracking-tight shrink-0 no-underline">
            Expeditions
          </Link>
          <div className="h-3.5 w-[1px] bg-neutral-200 shrink-0" />

          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <Link to={`/profile/${user.id}`} className="flex items-center gap-2.5 group min-w-0 no-underline">
              <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                <NavHeaderAvatar src={userProfilePic} username={user.username} />
              </div>
              
              <div className="hidden sm:block text-left truncate max-w-[120px]">
                <p className="text-sm font-medium leading-tight text-neutral-800 group-hover:text-amber-600 transition duration-300 truncate">
                  {user.username}
                </p>
                <p className="text-[10px] text-amber-600 font-semibold tracking-wider uppercase scale-95 origin-left mt-0.5">
                  {user.profile?.experience_level || 'Beginner'}
                </p>
              </div>
            </Link>

            <button
              onClick={onLogout}
              className="text-neutral-400 hover:text-neutral-900 p-2 rounded-full hover:bg-neutral-100 transition duration-300 shrink-0 flex items-center justify-center focus:outline-none"
              title="Logout"
              aria-label="Logout Workspace"
            >
              <LogOut className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>
        </div>
      ) : (
        <Link
          to="/login"
          className="bg-neutral-900 hover:bg-neutral-800 text-white font-medium px-4 py-1.5 rounded-full transition duration-300 text-xs sm:text-sm tracking-tight shrink-0 no-underline shadow-sm"
        >
          Sign In
        </Link>
      )}
    </nav>
  );
}

function getChatLastSeen(trekId) {
  try {
    return localStorage.getItem(`trekkar_chat_last_seen_${trekId}`);
  } catch (e) {
    return null;
  }
}

function Badge({ count, className = '', color = 'red' }) {
  if (!count || count <= 0) return null;
  const colorClasses = color === 'red'
    ? 'bg-neutral-900 text-white border border-white/20'
    : 'bg-amber-500 text-white';
  return (
    <span
      className={`flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-medium leading-none shrink-0 shadow-sm ${colorClasses} ${className}`}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}

function ExpeditionsFloatingDock({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const dockRef = useRef(null);

  const { data: treks = [] } = useQuery({
    queryKey: ['dock-treks'],
    queryFn: treksAPI.list,
    enabled: !!user,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const organized = treks
    .filter((item) => item.organizer === user?.id)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const joined = treks
    .filter((item) => item.is_member && item.organizer !== user?.id)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const allRelevant = [...organized, ...joined];

  const unreadQueries = useQueries({
    queries: allRelevant.map((trek) => ({
      queryKey: ['dock-chat-unread', trek.id],
      queryFn: () => chatAPI.listMessages(trek.id),
      enabled: !!user,
      refetchInterval: 5000,
      staleTime: 0,
      refetchOnWindowFocus: true,
    })),
  });

  const requestQueries = useQueries({
    queries: organized.map((trek) => ({
      queryKey: ['dock-pending-requests', trek.id],
      queryFn: () => treksAPI.listRequests(trek.id),
      enabled: !!user,
      refetchInterval: 15000,
      staleTime: 8000,
      refetchOnWindowFocus: true,
    })),
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dockRef.current && !dockRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      unreadQueries.forEach((q) => q.refetch?.());
      requestQueries.forEach((q) => q.refetch?.());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!user) return null;
  if (allRelevant.length === 0) return null;

  const unreadByTrek = {};
  allRelevant.forEach((trek, idx) => {
    const queryResult = unreadQueries[idx];
    const msgs = queryResult?.data || [];
    const lastSeen = getChatLastSeen(trek.id);
    const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0;

    unreadByTrek[trek.id] = msgs.filter((m) => {
      const isOwnMessage = user && String(m.sender) === String(user.id);
      const messageTime = new Date(m.created_at || m.timestamp).getTime();
      return !isOwnMessage && messageTime > lastSeenTime;
    }).length;
  });

  const pendingByTrek = {};
  organized.forEach((trek, idx) => {
    const reqs = requestQueries[idx]?.data || [];
    pendingByTrek[trek.id] = reqs.filter((r) => r.status === 'PENDING').length;
  });

  const totalUnread = Object.values(unreadByTrek).reduce((sum, n) => sum + n, 0);
  const totalPending = Object.values(pendingByTrek).reduce((sum, n) => sum + n, 0);
  const totalNotifications = totalUnread + totalPending;

  const renderTrekRow = (trek, { showPending }) => {
    const unreadCount = unreadByTrek[trek.id] || 0;
    const pendingCount = showPending ? (pendingByTrek[trek.id] || 0) : 0;
    return (
      <Link
        key={trek.id}
        to={`/trek/${trek.id}`}
        onClick={() => setIsOpen(false)}
        className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition duration-200 no-underline group"
      >
        <span className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0 group-hover:bg-neutral-900 group-hover:text-white transition duration-200">
          <Settings className="w-3.5 h-3.5 stroke-[1.5]" />
        </span>
        <span className="flex-1 min-w-0 text-left">
          <span className="block text-sm font-medium text-neutral-900 group-hover:text-amber-600 transition duration-200 truncate">
            {trek.title}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-neutral-400 truncate mt-0.5">
            <Calendar className="w-3 h-3 shrink-0" />
            {new Date(trek.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            {unreadCount > 0 && (
              <span className="text-neutral-900 font-semibold ml-1">
                • {unreadCount} new message{unreadCount > 1 ? 's' : ''}
              </span>
            )}
            {pendingCount > 0 && (
              <span className="text-amber-600 font-semibold ml-1">
                • {pendingCount} pending
              </span>
            )}
          </span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge count={pendingCount} color="accent" />
          <Badge count={unreadCount} color="red" />
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-neutral-300 shrink-0 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition duration-200" />
      </Link>
    );
  };

  return (
    <div ref={dockRef} className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3.5">
      {isOpen && (
        <div className="w-76 max-w-[calc(100vw-48px)] max-h-[65vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-neutral-200/80 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.12)] divide-y divide-neutral-100/80">
          {organized.length > 0 && (
            <div>
              <div className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 bg-white/90 sticky top-0 border-b border-neutral-100">
                Organizing ({organized.length})
              </div>
              <div className="divide-y divide-neutral-100/50">
                {organized.map((trek) => renderTrekRow(trek, { showPending: true }))}
              </div>
            </div>
          )}
          {joined.length > 0 && (
            <div>
              <div className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 bg-white/90 sticky top-0 border-b border-neutral-100">
                Joined ({joined.length})
              </div>
              <div className="divide-y divide-neutral-100/50">
                {joined.map((trek) => renderTrekRow(trek, { showPending: false }))}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center gap-3 bg-neutral-900 text-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.15)] px-4.5 py-2.5 hover:bg-neutral-800 transition duration-300 max-w-[calc(100vw-48px)] focus:outline-none border border-neutral-800"
        title="Your Expeditions"
        aria-label="Your Expeditions"
        aria-expanded={isOpen}
      >
        <span className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0">
          <Settings className="w-4 h-4 stroke-[1.5]" />
        </span>
        <span className="hidden sm:block text-left pr-2">
          <span className="block text-[9px] font-semibold uppercase tracking-widest text-neutral-400">
            Your Expeditions
          </span>
          <span className="block max-w-[200px] truncate text-xs font-medium text-neutral-200">
            {organized.length} organizing • {joined.length} joined
          </span>
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-neutral-400 shrink-0" />
        ) : (
          <ArrowRight className="w-4 h-4 text-neutral-400 shrink-0" />
        )}
        <Badge
          count={totalNotifications}
          color="red"
          className="absolute -top-1 -right-1 border-2 border-white bg-amber-600"
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
    <div className="min-h-screen flex flex-col bg-[#f5f5f7] text-neutral-900 antialiased font-sans">
      <NavigationBar user={currentUser} onLogout={handleLogout} />
      <ExpeditionsFloatingDock user={currentUser} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
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

      <footer className="py-8 border-t border-neutral-200/60 text-center text-xs text-neutral-400 mt-auto select-none tracking-tight">
        <p>&copy; {new Date().getFullYear()} TREK Expedition System. Designed with intentionality.</p>
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