import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { authAPI } from '../api';

const BACKGROUND_IMAGES = [
  '/rostislav-uzunov-Jnma4hh2vUs-unsplash.jpg',
  '/shubham-dhage-2UlycB5oNEs-unsplash.jpg',
  '/logan-voss-hT0nO6d2QVE-unsplash.jpg',
];

const SLIDE_DURATION_MS = 8000; 
const CROSSFADE_DURATION_S = 2.0;

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

const fieldVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function Auth({ isLogin, onAuthSuccess }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);

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
        const userData = await authAPI.login(username, password);
        onAuthSuccess(userData);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        err.response?.data?.message || 
        (err.response?.data && Object.values(err.response.data).join(' ')) ||
        'AUTHENTICATION_ERROR: Invalid coordinates or key.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 w-full h-full flex items-center justify-center p-4 overflow-y-auto"
      style={{ fontFamily: "'Space Grotesk', 'Share Tech Mono', sans-serif" }}
    >
      {/* Grayscale and highly dimmed background feed */}
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-black">
        <AnimatePresence>
          <motion.div
            key={bgIndex}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{
              opacity: 0.15,
              scale: 1.06,
              transition: {
                opacity: { duration: CROSSFADE_DURATION_S, ease: 'easeInOut' },
                scale: { duration: (SLIDE_DURATION_MS / 1000) + CROSSFADE_DURATION_S, ease: 'linear' },
              },
            }}
            exit={{
              opacity: 0,
              transition: { duration: CROSSFADE_DURATION_S, ease: 'easeInOut' },
            }}
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat filter grayscale brightness-[0.25]"
            style={{ backgroundImage: `url('${BACKGROUND_IMAGES[bgIndex]}')` }}
          />
        </AnimatePresence>
      </div>

      {/* Grid line overlay for telemetry aesthetic */}
      <div className="absolute inset-0 bg-dark-bg/25 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.85)_100%)] pointer-events-none" />

      {/* Main Authentication Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-[420px] relative z-15 my-auto"
      >
        <div className="hud-corner-cross hud-corner-cross-tl hud-corner-cross-tr hud-corner-cross-bl hud-corner-cross-br border border-[#1C1C1E] p-8 sm:p-10 bg-[#0A0A0C] shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative">
          
          {/* Top Status Header */}
          <div className="flex justify-between items-center mb-6 border-b border-[#1C1C1E]/60 pb-3 font-mono text-[9px] text-dark-muted uppercase tracking-wider">
            <span>RallyGrid // auth_net</span>
            <span className="text-primary animate-pulse">[ LINK_SECURE ]</span>
          </div>

          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            {/* Brand Logo Header */}
            <motion.div variants={fieldVariants} className="text-center mb-8">
              <div className="relative w-14 h-14 mx-auto mb-4 flex items-center justify-center">
                {/* Hexagon outline frame */}
                <svg className="absolute inset-0 w-full h-full text-primary" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="50,6 90,29 90,75 50,94 10,75 10,29" />
                </svg>
                <Compass className="w-5 h-5 text-primary relative z-10" strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-mono font-bold tracking-[0.12em] text-dark-text uppercase">
                {isLogin ? 'INITIATE SESSION' : 'ESTABLISH REGISTER'}
              </h2>
              <p className="text-[10px] text-dark-muted font-mono uppercase mt-1 tracking-tight">
                {isLogin ? 'Enter authorization sequence' : 'Configure registration profile details'}
              </p>
            </motion.div>

            {/* Error Alert Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-[#E8FF00]/5 border border-primary/30 flex items-start gap-2.5 text-primary text-[11px] font-mono uppercase tracking-wide">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={2} />
                    <p className="break-all w-full leading-snug">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div variants={fieldVariants}>
                <div className="flex justify-between items-center mb-1.5 px-1 font-mono text-[9px] text-dark-muted uppercase tracking-wider">
                  <span>[01] Username</span>
                  <span>req_id</span>
                </div>
                <div className="relative flex items-center gap-3 border border-[#1C1C1E] bg-[#000000] focus-within:border-primary transition-all duration-150 rounded-none">
                  <User className="w-[16px] h-[16px] ml-3.5 text-dark-muted shrink-0" strokeWidth={1.5} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full bg-transparent py-3 pr-4 text-dark-text text-sm font-mono focus:outline-none placeholder:text-dark-muted-dim"
                    placeholder="ENTER_ID"
                  />
                </div>
              </motion.div>

              {!isLogin && (
                <motion.div variants={fieldVariants}>
                  <div className="flex justify-between items-center mb-1.5 px-1 font-mono text-[9px] text-dark-muted uppercase tracking-wider">
                    <span>[02] Email</span>
                    <span>comm_ch</span>
                  </div>
                  <div className="relative flex items-center gap-3 border border-[#1C1C1E] bg-[#000000] focus-within:border-primary transition-all duration-150 rounded-none">
                    <Mail className="w-[16px] h-[16px] ml-3.5 text-dark-muted shrink-0" strokeWidth={1.5} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-transparent py-3 pr-4 text-dark-text text-sm font-mono focus:outline-none placeholder:text-dark-muted-dim"
                      placeholder="ENTER_EMAIL"
                    />
                  </div>
                </motion.div>
              )}

              <motion.div variants={fieldVariants}>
                <div className="flex justify-between items-center mb-1.5 px-1 font-mono text-[9px] text-dark-muted uppercase tracking-wider">
                  <span>{isLogin ? '[02] Passkey' : '[03] Passkey'}</span>
                  <span>sec_key</span>
                </div>
                <div className="relative flex items-center gap-3 border border-[#1C1C1E] bg-[#000000] focus-within:border-primary transition-all duration-150 rounded-none">
                  <Lock className="w-[16px] h-[16px] ml-3.5 text-dark-muted shrink-0" strokeWidth={1.5} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-transparent py-3 pr-4 text-dark-text text-sm font-mono focus:outline-none placeholder:text-dark-muted-dim"
                    placeholder="••••••••"
                  />
                </div>
              </motion.div>

              {/* Submit Action Button */}
              <motion.div variants={fieldVariants} className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-primary text-dark-bg font-mono font-bold text-xs uppercase tracking-widest transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-hover flex items-center justify-center gap-2 rounded-none"
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
                  ) : (
                    isLogin ? 'INITIATE_SESSION' : 'REGISTER_PROFILE'
                  )}
                </button>
              </motion.div>
            </form>

            {/* Toggle Mode Footer Link */}
            <motion.div
              variants={fieldVariants}
              className="mt-6 text-center text-[11px] font-mono text-dark-muted uppercase border-t border-[#1C1C1E]/60 pt-4"
            >
              {isLogin ? (
                <p>
                  No terminal credentials?{' '}
                  <Link to="/register" className="text-primary hover:underline font-bold transition-all">
                    [ ESTABLISH_LINK ]
                  </Link>
                </p>
              ) : (
                <p>
                  Existing coordinates?{' '}
                  <Link to="/login" className="text-primary hover:underline font-bold transition-all">
                    [ INITIATE_SESSION ]
                  </Link>
                </p>
              )}
            </motion.div>
          </motion.div>

          {/* HUD bottom panel metrics */}
          <div className="flex justify-between items-center mt-6 border-t border-[#1C1C1E]/60 pt-3 font-mono text-[8px] text-dark-muted/70 uppercase">
            <span>COORD // 37.7749° N, 122.4194° W</span>
            <span>SYS_OK</span>
          </div>

        </div>
      </motion.div>
    </div>
  );
}