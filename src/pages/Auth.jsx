import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, Mail, Lock, User, AlertCircle,
  Eye, EyeOff, Github, ArrowLeft, CheckCircle2,
} from 'lucide-react';
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

// TODO (backend): point these at your Django OAuth redirect endpoints.
// Simplest path with DRF + django-allauth: a GET to these urls 302s to the
// provider's consent screen, then your backend callback issues your normal
// session/JWT and redirects back to the frontend.
const OAUTH_ENDPOINTS = {
  google: `${import.meta.env.VITE_API_URL || ''}/api/auth/google/redirect/`,
  github: `${import.meta.env.VITE_API_URL || ''}/api/auth/github/redirect/`,
};

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

const viewVariants = {
  hidden: { opacity: 0, x: 12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
};

// Google's official multi-color "G" mark
function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.43 3.58v2.97h3.86c2.26-2.09 3.59-5.17 3.59-8.79z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-2.97c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.07C3.25 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.31a7.2 7.2 0 0 1-.38-2.31c0-.8.14-1.58.38-2.31V6.62H1.27A11.97 11.97 0 0 0 0 12c0 1.93.46 3.76 1.27 5.38l4-3.07z" />
      <path fill="#EA4335" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.62l4 3.07c.95-2.85 3.6-4.92 6.73-4.92z" />
    </svg>
  );
}

export default function Auth({ isLogin, onAuthSuccess }) {
  const [view, setView] = useState(isLogin ? 'login' : 'register'); // 'login' | 'register' | 'forgot'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [focusedField, setFocusedField] = useState(null);
  const [resetSent, setResetSent] = useState(false);

  // Keep internal view synced with the route-driven isLogin prop,
  // unless the user has stepped into the forgot-password view.
  useEffect(() => {
    setView((prev) => (prev === 'forgot' ? prev : isLogin ? 'login' : 'register'));
  }, [isLogin]);

  // Cycle through background images on a timer
  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(interval);
  }, []);

  const goToForgot = () => {
    setError(null);
    setResetSent(false);
    setView('forgot');
  };

  const backToLogin = () => {
    setError(null);
    setResetSent(false);
    setView('login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (view === 'forgot') {
        // TODO (backend): implement authAPI.forgotPassword(email) ->
        // POST /api/auth/password-reset/ { email }
        await authAPI.forgotPassword(email);
        setResetSent(true);
      } else if (view === 'login') {
        const userData = await authAPI.login(username, password, { rememberMe });
        onAuthSuccess(userData);
      } else {
        await authAPI.register(username, email, password);
        // Automatically log in after registration
        const userData = await authAPI.login(username, password, { rememberMe });
        onAuthSuccess(userData);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        (err.response?.data && Object.values(err.response.data).join(' ')) ||
        'Something went wrong. Please check your details and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider) => {
    // Full page redirect into the Django OAuth flow.
    window.location.href = OAUTH_ENDPOINTS[provider];
  };

  // Shared classes for the minimal, fill-based premium input style
  const fieldWrapperClass = (name) =>
    `relative flex items-center gap-3 rounded-2xl border transition-all duration-300 ${
      focusedField === name
        ? 'border-white/30 bg-white/[0.09]'
        : 'border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.07]'
    }`;

  const isLoginView = view === 'login';
  const isForgotView = view === 'forgot';

  const headerCopy = {
    login: { title: 'Welcome back', subtitle: 'Sign in to access your gatherings' },
    register: { title: 'Join RallyGrid', subtitle: 'Create an account to organize people fast' },
    forgot: { title: 'Reset your password', subtitle: "We'll email you a link to get back in" },
  }[view];

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
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Header Section */}
            <motion.div variants={fieldVariants} className="text-center mb-9 relative">
              {isForgotView && (
                <button
                  type="button"
                  onClick={backToLogin}
                  className="absolute -left-1 -top-1 p-2 rounded-full text-dark-muted/60 hover:text-dark-text hover:bg-white/[0.06] transition-colors"
                  aria-label="Back to sign in"
                >
                  <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
                </button>
              )}
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/[0.08] border border-white/[0.1] text-primary mb-4">
                <Compass className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h2 className="text-[22px] font-semibold tracking-tight text-dark-text">
                {headerCopy.title}
              </h2>
              <p className="text-[14px] text-dark-muted/80 mt-1.5 font-normal">
                {headerCopy.subtitle}
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

            {/* Forgot-password success state */}
            {isForgotView && resetSent ? (
              <motion.div variants={fieldVariants} className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-primary mb-4">
                  <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
                </div>
                <p className="text-[14px] text-dark-text font-medium">Check your inbox</p>
                <p className="text-[13px] text-dark-muted/70 mt-1.5 leading-relaxed">
                  If an account exists for <span className="text-dark-text">{email}</span>, a reset link is on its way.
                </p>
                <button
                  type="button"
                  onClick={backToLogin}
                  className="mt-6 text-[13px] text-primary hover:opacity-80 font-medium transition-opacity"
                >
                  Back to sign in
                </button>
              </motion.div>
            ) : (
              <>
                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {!isForgotView && (
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
                  )}

                  {(view === 'register' || isForgotView) && (
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

                  {!isForgotView && (
                    <motion.div variants={fieldVariants}>
                      <div className="flex items-center justify-between mb-2 ml-1 mr-1">
                        <label className="block text-[12px] font-medium text-dark-muted/70">
                          Password
                        </label>
                        {isLoginView && (
                          <button
                            type="button"
                            onClick={goToForgot}
                            className="text-[12px] text-primary/90 hover:opacity-80 font-medium transition-opacity"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className={fieldWrapperClass('password')}>
                        <Lock className="w-[18px] h-[18px] ml-4 text-dark-muted/60 shrink-0" strokeWidth={1.75} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => setFocusedField(null)}
                          required
                          className="w-full bg-transparent py-3.5 pr-2 text-dark-text text-[15px] placeholder:text-dark-muted/40 focus:outline-none"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="pr-4 text-dark-muted/60 hover:text-dark-text transition-colors shrink-0"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="w-[18px] h-[18px]" strokeWidth={1.75} />
                          ) : (
                            <Eye className="w-[18px] h-[18px]" strokeWidth={1.75} />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {isLoginView && (
                    <motion.label
                      variants={fieldVariants}
                      className="flex items-center gap-2.5 pl-1 pt-0.5 select-none cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-[15px] h-[15px] rounded-md accent-primary bg-white/[0.05] border border-white/[0.15] cursor-pointer"
                      />
                      <span className="text-[13px] text-dark-muted/80">Remember me</span>
                    </motion.label>
                  )}

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
                      ) : isForgotView ? (
                        'Send reset link'
                      ) : isLoginView ? (
                        'Sign In'
                      ) : (
                        'Create Account'
                      )}
                    </motion.button>
                  </motion.div>
                </form>

                {/* Social Sign-in */}
                {!isForgotView && (
                  <motion.div variants={fieldVariants}>
                    <div className="flex items-center gap-3 my-6">
                      <div className="h-px flex-1 bg-white/[0.08]" />
                      <span className="text-[11px] uppercase tracking-wider text-dark-muted/50">
                        or continue with
                      </span>
                      <div className="h-px flex-1 bg-white/[0.08]" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleOAuth('google')}
                        className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.09] transition-colors text-[14px] font-medium text-dark-text"
                      >
                        <GoogleIcon />
                        Google
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOAuth('github')}
                        className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.09] transition-colors text-[14px] font-medium text-dark-text"
                      >
                        <Github className="w-[18px] h-[18px]" strokeWidth={1.75} />
                        GitHub
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Footer Toggle Link */}
                {!isForgotView && (
                  <motion.div
                    variants={fieldVariants}
                    className="mt-7 text-center text-[13px] text-dark-muted/70 border-t border-white/[0.06] pt-6"
                  >
                    {isLoginView ? (
                      <p>Don't have an account? <Link to="/register" className="text-primary hover:opacity-80 font-medium transition-opacity">Sign up</Link></p>
                    ) : (
                      <p>Already have an account? <Link to="/login" className="text-primary hover:opacity-80 font-medium transition-opacity">Sign in</Link></p>
                    )}
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}