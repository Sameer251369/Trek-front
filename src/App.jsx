The shrinking user avatar in the navigation bar is caused by missing layout constraints on its container. When the screen width narrows on mobile devices, the browser attempts to squash the flex items inside the navigation bar to fit the view, which directly scales down the `<img>` or fallback `<div>` avatar.

Adding the `shrink-0` class ensures that your navigation avatar preserves its correct proportions across all mobile dimensions. I have also integrated a state-driven image breakdown safety check to ensure that if an asset path fails to load, the UI smoothly mounts your placeholder layout fallback.

Here is your updated, production-ready `App.js` source code:

```jsx
import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Compass, User, LogOut, Settings, ArrowRight } from 'lucide-react';
import { authAPI, treksAPI } from './api';

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

// ── Isolated Safe Header Avatar ──
// Explicitly forces 'shrink-0' preventing flex squash on narrow device screens
function NavHeaderAvatar({ src, username }) {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={username}
        className="w-8 h-8 rounded-full object-cover border border-primary/40 group-hover:border-primary transition duration-200 shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/40 group-hover:bg-primary/30 transition duration-200 shrink-0">
      <User className="w-4 h-4" />
    </div>
  );
}

function NavigationBar({ user, onLogout }) {
  const userProfilePic = user?.profile_picture_url || user?.profile?.profile_picture_url;

  return (
    <nav className="glass-panel sticky top-0 z-50 px-4 sm:px-6 py-4 flex items-center justify-between border-b border-dark-border/40 bg-dark-bg/80 backdrop-blur-md">
      <Link to="/" className="flex items-center gap-2 text-primary font-bold text-xl sm:text-2xl tracking-tight shrink-0">
        <Compass className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse-slow" />
        <span>RALLYGRID</span>
      </Link>

      {user ? (
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <Link to="/" className="text-dark-muted hover:text-dark-text transition duration-250 text-xs sm:text-sm font-medium shrink-0">
            Expeditions
          </Link>
          <div className="h-4 w-[1px] bg-dark-border shrink-0" />

          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link to={`/profile/${user.id}`} className="flex items-center gap-2 group min-w-0 no-underline">
              {/* Force aspect ratio conservation via dedicated element constraints */}
              <NavHeaderAvatar src={userProfilePic} username={user.username} />
              
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
              className="text-dark-muted hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition duration-200 shrink-0"
              title="Logout"
              aria-label="Logout Workspace"
            >
              <LogOut className="w-4 h-4 sm:w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <Link
          to="/login"
          className="bg-primary hover:bg-primary-hover text-dark-bg font-semibold px-4 py-2 rounded-lg transition duration-200 text-xs sm:text-sm shadow-lg shadow-primary/20 shrink-0"
        >
          Sign In
        </Link>
      )}
    </nav>
  );
}

function OrganizerFloatingDock({ user }) {
  const { data: treks = [] } = useQuery({
    queryKey: ['organizer-floating-treks'],
    queryFn: treksAPI.list,
    enabled: !!user,
  });

  if (!user) return null;

  const organized = treks
    .filter((item) => item.organizer === user.id)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const nextTrek = organized.find((item) => new Date(item.date) >= new Date()) || organized[0];

  if (!nextTrek) return null;

  return (
    <Link
      to={`/trek/${nextTrek.id}`}
      className="fixed right-4 bottom-4 z-50 flex items-center gap-3 bg-primary text-dark-bg rounded-xl shadow-2xl shadow-primary/20 px-4 py-3 hover:bg-primary-hover transition duration-200 max-w-[calc(100vw-32px)]"
      title={`Manage ${nextTrek.title}`}
      aria-label={`Manage ${nextTrek.title}`}
    >
      <span className="w-9 h-9 rounded-lg bg-dark-bg text-primary flex items-center justify-center shrink-0">
        <Settings className="w-4 h-4" />
      </span>
      <span className="hidden sm:block text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider">Manage Expedition</span>
        <span className="block max-w-[180px] truncate text-sm font-bold">
          {nextTrek.title}
        </span>
      </span>
      <ArrowRight className="w-4 h-4 shrink-0" />
    </Link>
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

```