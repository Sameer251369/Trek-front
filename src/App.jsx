import { Suspense, lazy, useState, useEffect, useRef } from 'react';
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
      <div className="w-8 h-8 border border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}

function NavHeaderAvatar({ src, username }) {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={username}
        className="w-full h-full object-cover block"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-dark-muted bg-[#121214]">
      <User className="w-4 h-4" />
    </div>
  );
}

function NavigationBar({ user, onLogout }) {
  const userProfilePic = user?.profile_picture_url || user?.profile?.profile_picture_url;

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#050505]/90 backdrop-blur-md border-b border-[#1C1C1E] px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-primary font-bold text-lg sm:text-xl tracking-[0.15em] font-mono shrink-0 no-underline hover:opacity-90">
          <Compass className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
          <span className="uppercase">RallyGrid</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <Link
              to="/"
              className="hidden sm:inline-block text-dark-muted hover:text-primary transition duration-200 text-xs font-mono uppercase tracking-wider shrink-0 no-underline border border-transparent hover:border-[#1C1C1E] px-3 py-1.5"
            >
              [ Expeditions ]
            </Link>
            <div className="hidden sm:block h-4 w-px bg-[#1C1C1E] shrink-0" />

            <div className="flex items-center gap-3 min-w-0">
              <Link to={`/profile/${user.id}`} className="flex items-center gap-3 group min-w-0 no-underline border border-transparent hover:border-[#1C1C1E] p-1">
                <div className="w-8 h-8 border border-[#1C1C1E] group-hover:border-primary shrink-0 relative overflow-hidden bg-[#000000]">
                  <NavHeaderAvatar src={userProfilePic} username={user.username} />
                </div>

                <div className="hidden sm:block text-left truncate max-w-[120px]">
                  <p className="text-xs font-mono uppercase font-bold leading-tight text-dark-text group-hover:text-primary transition duration-200 truncate">
                    {user.username}
                  </p>
                  <p className="text-[9px] font-mono text-dark-muted uppercase tracking-wider truncate">
                    {user.profile?.experience_level || 'Beginner'}
                  </p>
                </div>
              </Link>

              <button
                onClick={onLogout}
                className="text-dark-muted hover:text-primary border border-transparent hover:border-[#1C1C1E] w-8 h-8 transition duration-200 shrink-0 flex items-center justify-center focus:outline-none"
                title="Logout"
                aria-label="Logout Workspace"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <Link
            to="/login"
            className="bg-primary text-dark-bg font-mono font-bold text-xs uppercase tracking-wider px-5 py-2.5 transition duration-200 hover:bg-primary-hover shrink-0 no-underline"
          >
            [ SIGN IN ]
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
    ? 'bg-[#FF2D2D] text-white font-bold border border-[#FF2D2D]'
    : 'bg-[#111] text-primary border border-primary/30';
  return (
    <span
      className={`flex items-center justify-center px-1 font-mono text-[9px] font-bold leading-none shrink-0 rounded-none ${colorClasses} ${className}`}
      style={{ minWidth: '16px', height: '16px' }}
    >
      {count}
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

  const renderTrekRow = (trek, { showPending }, index) => {
    const unreadCount = unreadByTrek[trek.id] || 0;
    const pendingCount = showPending ? (pendingByTrek[trek.id] || 0) : 0;
    const hasAlert = unreadCount > 0 || pendingCount > 0;
    return (
      <motion.div
        key={trek.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.03 }}
      >
        <Link
          to={`/trek/${trek.id}`}
          onClick={() => setIsOpen(false)}
          className={`flex items-center gap-3 px-4 py-3 border-b border-[#141416]/60 hover:bg-[#E8FF00]/5 transition duration-150 no-underline group ${hasAlert ? 'border-l border-l-[#FF2D2D]' : ''}`}
        >
          <span className="w-8 h-8 border border-[#1C1C1E] text-dark-muted flex items-center justify-center shrink-0 group-hover:border-primary group-hover:text-primary transition duration-150 bg-[#000000]">
            <Settings className="w-3.5 h-3.5" />
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-xs font-bold text-dark-text group-hover:text-primary transition duration-150 truncate uppercase font-sans">
              {trek.title}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-dark-muted font-mono tracking-tight truncate mt-0.5">
              <span>{new Date(trek.date).toISOString().split('T')[0]}</span>
              {unreadCount > 0 && (
                <span className="text-[#FF2D2D] font-semibold">
                  [+{unreadCount} MSG]
                </span>
              )}
              {pendingCount > 0 && (
                <span className="text-[#FF2D2D] font-semibold">
                  [+{pendingCount} REQ]
                </span>
              )}
            </span>
          </span>
          <div className="flex items-center gap-1 shrink-0 font-mono">
            {pendingCount > 0 && <span className="text-[10px] text-[#FF2D2D] font-bold">[!]</span>}
            {unreadCount > 0 && <span className="text-[10px] text-[#FF2D2D] font-bold">[{unreadCount}]</span>}
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-dark-muted shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition duration-150" />
        </Link>
      </motion.div>
    );
  };

  return (
    <div
      ref={dockRef}
      className="fixed right-4 bottom-4 z-[100000] flex flex-col items-end gap-3 font-mono"
      style={{ zIndex: 100000 }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.2 }}
            className="w-80 max-w-[calc(100vw-32px)] max-h-[70vh] overflow-y-auto bg-[#0A0A0C] border border-[#1C1C1E] rounded-none shadow-[0_15px_50px_rgba(0,0,0,0.8)] py-3"
          >
            {organized.length > 0 && (
              <div>
                <div className="px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-dark-muted sticky top-0 bg-[#0A0A0C] border-b border-[#1C1C1E]/50">
                   ORGANIZING ({organized.length})
                </div>
                <div>
                  {organized.map((trek, idx) => renderTrekRow(trek, { showPending: true }, idx))}
                </div>
              </div>
            )}
            {joined.length > 0 && (
              <div className="mt-2">
                <div className="px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-dark-muted sticky top-0 bg-[#0A0A0C] border-b border-[#1C1C1E]/50">
                   JOINED ({joined.length})
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
        className="relative flex items-center gap-3 bg-primary text-dark-bg rounded-none border border-transparent px-4 py-3 hover:bg-primary-hover transition duration-200 max-w-[calc(100vw-32px)] focus:outline-none"
        title="Your Expeditions"
        aria-label="Your Expeditions"
        aria-expanded={isOpen}
      >
        <span className="w-8 h-8 bg-dark-bg text-primary flex items-center justify-center shrink-0 border border-primary/20">
          <Settings className="w-3.5 h-3.5" />
        </span>
        <span className="hidden sm:block text-left">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-dark-bg/85">
             EXPEDITIONS
          </span>
          <span className="block max-w-[200px] truncate text-xs font-bold uppercase">
            {organized.length} ORG • {joined.length} JOINED
          </span>
        </span>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        )}
        <Badge
          count={totalNotifications}
          color="red"
          className="absolute -top-1 -right-1 border border-[#000000]"
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
    <div className="min-h-screen flex flex-col bg-dark-bg text-dark-text">
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

      <footer className="py-8 text-center text-xs text-dark-muted/50 border-t border-[#1C1C1E] mt-auto select-none font-mono">
        <p>&copy; {new Date().getFullYear()} RALLYGRID // COORD_NET // ALL RIGHTS RESERVED.</p>
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