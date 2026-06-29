import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { authAPI } from '../api';

// Background images cycled behind the auth form.
// These live in /frontend/public, so they're referenced from the site root.
const BACKGROUND_IMAGES = [
  '/rostislav-uzunov-Jnma4hh2vUs-unsplash.jpg',
  '/shubham-dhage-2UlycB5oNEs-unsplash.jpg',
  '/logan-voss-hT0nO6d2QVE-unsplash.jpg',
];

const SLIDE_DURATION_MS = 7000; // time each image stays on screen
const CROSSFADE_DURATION_S = 2.4; // how long the crossfade itself takes

// Staggered entrance for the card's children — gives the whole form a soft, considered feel
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function Auth({ isLogin, onAuthSuccess }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [focusedField, setFocusedField] = useState(null);

  // Cycle through background images on a timer
  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(interval);
  }, []);

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

  // Shared classes for the minimal, fill-based premium input style
  const fieldWrapperClass = (name) =>
    `relative flex items-center gap-3 rounded-2xl border transition-all duration-300 ${
      focusedField === name
        ? 'border-white/30 bg-white/[0.09]'
        : 'border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.07]'
    }`;

  return (
    /* Fullscreen Wrapper with rotating, cross-fading background images */
    <div
      className="fixed inset-0 w-full h-full flex items-center justify-center p-4 overflow-y-auto"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif" }}
    >

      {/* Background image carousel layer */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <AnimatePresence>
          <motion.div
            key={bgIndex}
            initial={{ opacity: 0, scale: 1 }}
            animate={{
              opacity: 1,
              scale: 1.08,
              transition: {
                opacity: { duration: CROSSFADE_DURATION_S, ease: [0.4, 0, 0.2, 1] },
                scale: { duration: (SLIDE_DURATION_MS / 1000) + CROSSFADE_DURATION_S, ease: 'linear' },
              },
            }}
            exit={{
              opacity: 0,
              transition: { duration: CROSSFADE_DURATION_S, ease: [0.4, 0, 0.2, 1] },
            }}
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat will-change-transform"
            style={{ backgroundImage: `url('${BACKGROUND_IMAGES[bgIndex]}')` }}
          />
        </AnimatePresence>
      </div>

      {/* Soft dark wash + faint vignette, closer to Apple's depth-of-field treatment */}
      <div className="absolute inset-0 bg-dark-bg/40 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.45)_100%)] pointer-events-none" />

      {/* Main Authentication Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[400px] p-8 sm:p-10 rounded-[28px] relative my-auto z-15 bg-white/[0.06] backdrop-blur-2xl border border-white/[0.08] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)]"
      >
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {/* Header Section */}
          <motion.div variants={fieldVariants} className="text-center mb-9">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/[0.08] border border-white/[0.1] text-primary mb-4">
              <Compass className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <h2 className="text-[22px] font-semibold tracking-tight text-dark-text">
              {isLogin ? 'Welcome back' : 'Join RallyGrid'}
            </h2>
            <p className="text-[14px] text-dark-muted/80 mt-1.5 font-normal">
              {isLogin ? 'Sign in to access your gatherings' : 'Create an account to organize people fast'}
            </p>
          </motion.div>

          {/* Error Alert Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="p-3.5 bg-red-500/[0.08] border border-red-500/20 rounded-2xl flex items-start gap-2.5 text-red-300 text-[13px]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
                  <p className="break-words w-full leading-snug">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <motion.div variants={fieldVariants}>
              <label className="block text-[12px] font-medium text-dark-muted/70 mb-2 ml-1">
                Username
              </label>
              <div className={fieldWrapperClass('username')}>
                <User className="w-[18px] h-[18px] ml-4 text-dark-muted/60 shrink-0" strokeWidth={1.75} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  required
                  className="w-full bg-transparent py-3.5 pr-4 text-dark-text text-[15px] placeholder:text-dark-muted/40 focus:outline-none"
                  placeholder="yourname123"
                />
              </div>
            </motion.div>

            {!isLogin && (
              <motion.div variants={fieldVariants}>
                <label className="block text-[12px] font-medium text-dark-muted/70 mb-2 ml-1">
                  Email address
                </label>
                <div className={fieldWrapperClass('email')}>
                  <Mail className="w-[18px] h-[18px] ml-4 text-dark-muted/60 shrink-0" strokeWidth={1.75} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="w-full bg-transparent py-3.5 pr-4 text-dark-text text-[15px] placeholder:text-dark-muted/40 focus:outline-none"
                    placeholder="name@domain.com"
                  />
                </div>
              </motion.div>
            )}

            <motion.div variants={fieldVariants}>
              <label className="block text-[12px] font-medium text-dark-muted/70 mb-2 ml-1">
                Password
              </label>
              <div className={fieldWrapperClass('password')}>
                <Lock className="w-[18px] h-[18px] ml-4 text-dark-muted/60 shrink-0" strokeWidth={1.75} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  required
                  className="w-full bg-transparent py-3.5 pr-4 text-dark-text text-[15px] placeholder:text-dark-muted/40 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </motion.div>

            {/* Action Button */}
            <motion.div variants={fieldVariants} className="pt-2">
              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="w-full py-3.5 bg-primary text-dark-bg font-semibold rounded-full transition-colors duration-200 flex items-center justify-center gap-2 text-[15px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </motion.button>
            </motion.div>
          </form>

          {/* Footer Toggle Link */}
          <motion.div
            variants={fieldVariants}
            className="mt-7 text-center text-[13px] text-dark-muted/70 border-t border-white/[0.06] pt-6"
          >
            {isLogin ? (
              <p>Don't have an account? <Link to="/register" className="text-primary hover:opacity-80 font-medium transition-opacity">Sign up</Link></p>
            ) : (
              <p>Already have an account? <Link to="/login" className="text-primary hover:opacity-80 font-medium transition-opacity">Sign in</Link></p>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}