import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { authAPI } from '../api';

export default function Auth({ isLogin, onAuthSuccess }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const userData = await authAPI.login(username, password);
        onAuthSuccess(userData);
      } else {
        await authAPI.register(username, email, password);
        // Automatically log in after registration
        const userData = await authAPI.login(username, password);
        onAuthSuccess(userData);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        err.response?.data?.message || 
        (err.response?.data && Object.values(err.response.data).join(' ')) ||
        'Authentication failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[75vh]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md p-8 glass-panel rounded-2xl shadow-2xl relative overflow-hidden"
      >
        {/* Accent Glow Line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/20 text-primary mb-3">
            <Compass className="w-8 h-8 animate-pulse-slow" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-dark-text">
            {isLogin ? 'Welcome Back' : 'Join RallyGrid'}
          </h2>
          <p className="text-sm text-dark-muted mt-1">
            {isLogin ? 'Sign in to access your gatherings.' : 'Create an account to organize people fast.'}
          </p>
        </div>

        {/* Error Alert Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="break-words w-full">{error}</p>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-muted" />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                placeholder="yourname123"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-muted" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                  placeholder="name@domain.com"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-muted" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Action Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 bg-primary hover:bg-primary-hover text-dark-bg font-bold rounded-xl transition duration-200 mt-2 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        {/* Footer Toggle Link */}
        <div className="mt-6 text-center text-sm text-dark-muted border-t border-dark-border/20 pt-5">
          {isLogin ? (
            <p>Don't have an account? <Link to="/register" className="text-primary hover:underline font-semibold">Sign up</Link></p>
          ) : (
            <p>Already have an account? <Link to="/login" className="text-primary hover:underline font-semibold">Sign in</Link></p>
          )}
        </div>
      </motion.div>
    </div>
  );
}