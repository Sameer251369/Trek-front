import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Compass, User, LogOut, PlusCircle, Activity } from 'lucide-react';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import TrekDetail from './pages/TrekDetail';
import { authAPI } from './api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function NavigationBar({ user, onLogout }) {
  return (
    <nav className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-dark-border/40">
      <Link to="/" className="flex items-center gap-2 text-primary font-bold text-2xl tracking-tight">
        <Compass className="w-8 h-8 animate-pulse-slow" />
        <span>JAWAN</span>
      </Link>
      
      {user ? (
        <div className="flex items-center gap-6">
          <Link to="/" className="text-dark-muted hover:text-dark-text transition duration-250 text-sm font-medium">
            Expeditions
          </Link>
          <div className="h-4 w-[1px] bg-dark-border" />
          
          <div className="flex items-center gap-4">
            <Link to={`/profile/${user.id}`} className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/40 group-hover:bg-primary/30 transition duration-200">
                <User className="w-4 h-4" />
              </div>
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

function MainLayout() {
  const [currentUser, setCurrentUser] = useState(authAPI.getCurrentUser());
  const navigate = useNavigate();

  useEffect(() => {
    // Keep checking localStorage
    const user = authAPI.getCurrentUser();
    setCurrentUser(user);
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
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
