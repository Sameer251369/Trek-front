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

function NavigationBar({ user, onLogout }) {
  const userProfilePic = user?.profile_picture_url || user?.profile?.profile_picture_url;

  return (
    <nav className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-dark-border/40">
      <Link to="/" className="flex items-center gap-2 text-primary font-bold text-2xl tracking-tight">
        <Compass className="w-8 h-8 animate-pulse-slow" />
        <span>WALMILO</span>
      </Link>

      {user ? (
        <div className="flex items-center gap-6">
          <Link to="/" className="text-dark-muted hover:text-dark-text transition duration-250 text-sm font-medium">
            Expeditions
          </Link>
          <div className="h-4 w-[1px] bg-dark-border" />

          <div className="flex items-center gap-4">
            <Link to={`/profile/${user.id}`} className="flex items-center gap-2 group">
              {userProfilePic ? (
                <img
                  src={userProfilePic}
                  alt={user.username}
                  className="w-8 h-8 rounded-full object-cover border border-primary/40 group-hover:border-primary transition duration-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/40 group-hover:bg-primary/30 transition duration-200">
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold leading-tight text-dark-text group-hover:text-primary transition duration-200">{user.username}</p>
                <p className="text-[10px] text-dark-muted font-bold tracking-wider uppercase">{user.profile?.experience_level || 'Beginner'}</p>
              </div>
            </Link>

            <button
              onClick={onLogout}
              className="text-dark-muted hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition duration-200"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <Link
          to="/login"
          className="bg-primary hover:bg-primary-hover text-dark-bg font-semibold px-5 py-2 rounded-lg transition duration-200 text-sm shadow-lg shadow-primary/20"
        >
          Sign In
        </Link>
      )}
    </nav>
  );
}

// Floating quick-link to the trek a user is currently organizing, so they don't
// have to dig through the dashboard to manage it.
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
      className="fixed right-4 bottom-4 z-50 flex items-center gap-3 bg-primary text-dark-bg rounded-xl shadow-2xl shadow-primary/20 px-4 py-3 hover:bg-primary-hover transition duration-200"
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
    // Re-sync from localStorage whenever something (e.g. a profile edit) signals a change
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

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

      <footer className="py-6 border-t border-dark-border/20 text-center text-sm text-dark-muted mt-auto">
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