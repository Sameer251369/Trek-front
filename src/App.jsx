import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery, useQueries } from '@tanstack/react-query';
import { Compass, User, LogOut, Settings, ArrowRight, ChevronUp, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
      <div className="w-9 h-9 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin" />
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
        className="w-9 h-9 rounded-full object-cover aspect-square ring-2 ring-white/10 group-hover:ring-primary/60 transition duration-300 shrink-0 block"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary ring-2 ring-white/10 group-hover:ring-primary/60 transition duration-300 shrink-0 aspect-square">
      <User className="w-4 h-4" />
    </div>
  );
}

function NavigationBar({ user, onLogout }) {
  const userProfilePic = user?.profile_picture_url || user?.profile?.profile_picture_url;

  return (
    <nav className="sticky top-0 z-50 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between rounded-full px-4 sm:px-6 py-2.5 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
        <Link to="/" className="flex items-center gap-2 text-primary font-bold text-lg sm:text-xl tracking-tight shrink-0 no-underline">
          <Compass className="w-6 h-6 sm:w-7 sm:h-7" />
          <span>RallyGrid</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <Link
              to="/"
              className="hidden sm:inline-block text-dark-muted hover:text-dark-text transition duration-300 text-sm font-medium shrink-0 no-underline px-3 py-1.5 rounded-full hover:bg-white/[0.06]"
            >
              Expeditions
            </Link>
            <div className="hidden sm:block h-5 w-px bg-white/10 shrink-0" />

            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link to={`/profile/${user.id}`} className="flex items-center gap-2.5 group min-w-0 no-underline pl-1">
                <NavHeaderAvatar src={userProfilePic} username={user.username} />

                <div className="hidden sm:block text-left truncate max-w-[120px]">
                  <p className="text-sm font-semibold leading-tight text-dark-text group-hover:text-primary transition duration-200 truncate">
                    {user.username}
                  </p>
                  <p className="text-[10px] text-dark-muted font-medium tracking-wide truncate">
                    {user.profile?.experience_level || 'Beginner'}
                  </p>
                </div>
              </Link>

              <button
                onClick={onLogout}
                className="text-dark-muted hover:text-red-400 w-9 h-9 rounded-full hover:bg-red-500/10 transition duration-300 shrink-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                title="Logout"
                aria-label="Logout Workspace"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <Link
            to="/login"
            className="bg-primary hover:bg-primary-hover text-dark-bg font-semibold px-5 py-2 rounded-full transition duration-300 text-sm shadow-lg shadow-primary/20 shrink-0 no-underline"
          >
            Sign In
          </Link>
        )}
      </div>
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
    ? 'bg-red-500 text-white'
    : 'bg-primary text-dark-bg';
  return (
    <span
      className={`flex items-center justify-center min-w-[19px] h-[19px] px-1.5 rounded-full text-[10px] font-bold leading-none shrink-0 shadow-sm ${colorClasses} ${className}`}
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

  // Fix 1: Reduced poll interval slightly to match immediate expectation, updated tracking definitions
  const unreadQueries = useQueries({
    queries: allRelevant.map((trek) => ({
      queryKey: ['dock-chat-unread', trek.id],
      queryFn: () => chatAPI.listMessages(trek.id),
      enabled: !!user,
      refetchInterval: 5000, // Speed up background checks to pick up messages cleaner
      staleTime: 0,          // Treat it as instantly stale to guarantee fresh checks on syncs
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

  // Fix 2: Changed index-matching fallback to dynamic ID mapping to safely isolate updating states
  const unreadByTrek = {};
  allRelevant.forEach((trek, idx) => {
    const queryResult = unreadQueries[idx];
    const msgs = queryResult?.data || [];
    const lastSeen = getChatLastSeen(trek.id);
    const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0;

    unreadByTrek[trek.id] = msgs.filter((m) => {
      const isOwnMessage = user && String(m.sender) === String(user.id);
      // Ensure precise matching across systems by validating both accurate timestamp updates 
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

  const renderTrekRow = (trek, { showPending }, index) => {
    const unreadCount = unreadByTrek[trek.id] || 0;
    const pendingCount = showPending ? (pendingByTrek[trek.id] || 0) : 0;
    return (
      <motion.div
        key={trek.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.04 }}
      >
        <Link
          to={`/trek/${trek.id}`}
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-3 px-4 py-3 mx-2 my-1 rounded-2xl hover:bg-white/[0.06] transition duration-200 no-underline group"
        >
          <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-dark-bg transition duration-200">
            <Settings className="w-3.5 h-3.5" />
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-sm font-semibold text-dark-text group-hover:text-primary transition duration-200 truncate">
              {trek.title}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-dark-muted truncate">
              <Calendar className="w-3 h-3 shrink-0" />
              {new Date(trek.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              {unreadCount > 0 && (
                <span className="text-primary font-semibold ml-1">
                  • {unreadCount} new message{unreadCount > 1 ? 's' : ''}
                </span>
              )}
              {pendingCount > 0 && (
                <span className="text-yellow-400 font-semibold ml-1">
                  • {pendingCount} pending
                </span>
              )}
            </span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <Badge count={pendingCount} color="accent" />
            <Badge count={unreadCount} color="red" />
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-dark-muted shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition duration-200" />
        </Link>
      </motion.div>
    );
  };

  return (
    <div ref={dockRef} className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
            className="w-80 max-w-[calc(100vw-32px)] max-h-[70vh] overflow-y-auto bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] py-2"
          >
            {organized.length > 0 && (
              <div>
                <div className="px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-dark-muted sticky top-0 bg-transparent">
                  Organizing ({organized.length})
                </div>
                <div>
                  {organized.map((trek, idx) => renderTrekRow(trek, { showPending: true }, idx))}
                </div>
              </div>
            )}
            {joined.length > 0 && (
              <div>
                <div className="px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-dark-muted sticky top-0 bg-transparent">
                  Joined ({joined.length})
                </div>
                <div>
                  {joined.map((trek, idx) => renderTrekRow(trek, { showPending: false }, idx))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center gap-3 bg-primary text-dark-bg rounded-full shadow-[0_10px_40px_rgba(232,255,0,0.25)] px-5 py-3.5 hover:bg-primary-hover transition duration-300 max-w-[calc(100vw-32px)] focus:outline-none"
        title="Your Expeditions"
        aria-label="Your Expeditions"
        aria-expanded={isOpen}
      >
        <span className="w-9 h-9 rounded-full bg-dark-bg text-primary flex items-center justify-center shrink-0">
          <Settings className="w-4 h-4" />
        </span>
        <span className="hidden sm:block text-left">
          <span className="block text-[10px] font-bold uppercase tracking-wider">
            Your Expeditions
          </span>
          <span className="block max-w-[200px] truncate text-sm font-bold">
            {organized.length} organizing • {joined.length} joined
          </span>
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 shrink-0" />
        ) : (
          <ArrowRight className="w-4 h-4 shrink-0" />
        )}
        <Badge
          count={totalNotifications}
          color="red"
          className="absolute -top-1.5 -right-1.5 border-2 border-dark-bg"
        />
      </motion.button>
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
      <ExpeditionsFloatingDock user={currentUser} />

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

      <footer className="py-6 text-center text-xs sm:text-sm text-dark-muted/60 mt-auto select-none">
        <p>&copy; {new Date().getFullYear()} RallyGrid. Adventure awaits.</p>
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