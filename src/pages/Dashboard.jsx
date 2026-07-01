import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar, Users, Search, AlertTriangle, Plus, X,
  ArrowRight, User, Upload, Network, Edit2, Trash2, Share2, Check, MoreVertical, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { treksAPI } from '../api';

const DIFFICULTY_STYLES = {
  EASY: 'border-green-500/20 bg-green-500/5 text-green-400 font-mono',
  MODERATE: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-400 font-mono',
  HARD: 'border-orange-500/20 bg-orange-500/5 text-orange-400 font-mono',
  EXTREME: 'border-red-500/20 bg-red-500/5 text-red-400 font-mono',
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, delay: Math.min(i * 0.04, 0.35), ease: 'easeOut' },
  }),
};

const RALLY_IMAGES = [
  '/Gemini_Generated_Image_dhr4pmdhr4pmdhr4 (1).png',
  '/Gemini_Generated_Image_hnr2hzhnr2hzhnr2.png',
  '/Gemini_Generated_Image_emkb01emkb01emkb.png'
];

export default function Dashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');

  // Modal, Mode, & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrekId, setEditingTrekId] = useState(null);
  const [newTrekTitle, setNewTrekTitle] = useState('');
  const [newTrekDesc, setNewTrekDesc] = useState('');
  const [newTrekDate, setNewTrekDate] = useState('');
  const [newTrekCapacity, setNewTrekCapacity] = useState('10');
  const [newTrekDiff, setNewTrekDiff] = useState('MODERATE');
  const [newTrekDestination, setNewTrekDestination] = useState('');
  const [newTrekImage, setNewTrekImage] = useState(null);
  const [newTrekImagePreview, setNewTrekImagePreview] = useState(null);
  const [newTrekIsPrivate, setNewTrekIsPrivate] = useState(false);
  const [formError, setFormError] = useState(null);

  // UI Dropdown Menu Management State
  const [activeMenuTrekId, setActiveMenuTrekId] = useState(null);
  const menuRef = useRef(null);

  // Clipboard Share Feedback State
  const [copiedTrekId, setCopiedTrekId] = useState(null);

  // Background Slider Index State tracker
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // Background Image Rotator Logic
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImgIndex((prevIndex) => (prevIndex + 1) % RALLY_IMAGES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Debounce search term entry
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Clean up memory leaks from object previews
  useEffect(() => {
    return () => { if (newTrekImagePreview) URL.revokeObjectURL(newTrekImagePreview); };
  }, [newTrekImagePreview]);

  // Global Outside Click Handler to Auto-Close Action Menus
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuTrekId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetching Data via TanStack Query
  const { data: treks = [], isLoading, isError } = useQuery({
    queryKey: ['treks'],
    queryFn: treksAPI.list,
  });

  // Mutations
  const createTrekMutation = useMutation({
    mutationFn: (formData) => treksAPI.create(formData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['treks'] });
      handleCloseModal();
      if (data?.id) navigate(`/trek/${data.id}`);
    },
    onError: (err) => {
      setFormError(
        err.response?.data?.detail ||
        (err.response?.data && typeof err.response.data === 'object'
          ? Object.values(err.response.data).flat().join(' ')
          : 'Failed to create gathering.')
      );
    },
  });

  const updateTrekMutation = useMutation({
    mutationFn: ({ id, formData }) => treksAPI.update(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treks'] });
      handleCloseModal();
    },
    onError: (err) => {
      setFormError(err.response?.data?.detail || 'Failed to update gathering.');
    },
  });

  const deleteTrekMutation = useMutation({
    mutationFn: (id) => treksAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treks'] });
    },
    onError: (err) => {
      alert(err.response?.data?.detail || 'Failed to delete gathering.');
    },
  });

  const joinRequestMutation = useMutation({
    mutationFn: treksAPI.requestJoin,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['treks'] }); },
    onError: (err) => {
      alert(err.response?.data?.[0] || err.response?.data?.detail || 'Request to join failed.');
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: ({ id, redirectUrl }) => treksAPI.checkout(id, redirectUrl),
    onSuccess: (data) => {
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    },
    onError: (err) => {
      alert(err.response?.data?.detail || 'Failed to initiate Stripe checkout.');
    }
  });

  const resetForm = () => {
    setEditingTrekId(null);
    setNewTrekTitle('');
    setNewTrekDesc('');
    setNewTrekDate('');
    setNewTrekCapacity('10');
    setNewTrekDiff('MODERATE');
    setNewTrekDestination('');
    setNewTrekImage(null);
    setNewTrekIsPrivate(false);

    if (newTrekImagePreview) {
      URL.revokeObjectURL(newTrekImagePreview);
    }
    setNewTrekImagePreview(null);
    setFormError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleOpenEditModal = (trek) => {
    setEditingTrekId(trek.id);
    setNewTrekTitle(trek.title || '');
    setNewTrekDesc(trek.description || '');
    setNewTrekDestination(trek.destination || '');
    setNewTrekDate(trek.date ? trek.date.split('T')[0] : '');
    setNewTrekCapacity(String(trek.capacity || 10));
    setNewTrekDiff(trek.difficulty || 'MODERATE');
    setNewTrekIsPrivate(trek.is_private || false);
    if (trek.destination_image_url) {
      setNewTrekImagePreview(trek.destination_image_url);
    }
    setIsModalOpen(true);
    setActiveMenuTrekId(null);
  };

  const handleDeleteTrek = (id) => {
    setActiveMenuTrekId(null);
    if (window.confirm('Are you absolutely sure you want to delete this gathering? This action cannot be undone.')) {
      deleteTrekMutation.mutate(id);
    }
  };

  const handleShareLink = (id) => {
    const el = document.createElement('input');
    el.value = `${window.location.origin}/trek/${id}`;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);

    setCopiedTrekId(id);
    setTimeout(() => {
      setCopiedTrekId(null);
      setActiveMenuTrekId(null);
    }, 1800);
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenuTrekId(activeMenuTrekId === id ? null : id);
  };

  const filteredTreks = treks.filter(trek => {
    const q = debouncedSearchTerm.toLowerCase();
    const matchesSearch =
      trek.title?.toLowerCase().includes(q) ||
      trek.description?.toLowerCase().includes(q) ||
      trek.destination?.toLowerCase().includes(q);
    const matchesDiff = selectedDifficulty === 'ALL' || trek.difficulty === selectedDifficulty;
    return matchesSearch && matchesDiff;
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setFormError(null);

    if (!newTrekTitle.trim() || !newTrekDesc.trim() || !newTrekDate || !newTrekCapacity) {
      setFormError('Please fill out all required fields.');
      return;
    }

    const formData = new FormData();
    formData.append('title', newTrekTitle);
    formData.append('description', newTrekDesc);
    formData.append('destination', newTrekDestination);
    formData.append('date', newTrekDate);
    formData.append('capacity', newTrekCapacity);
    formData.append('difficulty', newTrekDiff);
    formData.append('is_private', newTrekIsPrivate);

    if (newTrekImage) {
      formData.append('destination_image', newTrekImage);
    }

    if (editingTrekId) {
      updateTrekMutation.mutate({ id: editingTrekId, formData });
    } else {
      createTrekMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full font-mono text-xs">

      {/* ── Hero Banner HUD Terminal ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="hud-corner-cross hud-corner-cross-tl hud-corner-cross-tr hud-corner-cross-bl hud-corner-cross-br relative py-14 px-8 sm:px-14 flex flex-col md:flex-row md:items-center justify-between gap-8 rounded-none bg-[#0A0A0C] border border-[#1C1C1E] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        {/* Dynamic Image Underlay Mask Structure */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          <AnimatePresence mode="popLayout">
            <motion.img
              key={currentImgIndex}
              src={RALLY_IMAGES[currentImgIndex]}
              alt="Telemetry Display"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.12 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.0 }}
              className="w-full h-full object-cover filter grayscale brightness-[0.2]"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
        </div>

        <div className="space-y-4 max-w-xl relative z-10 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#000000] border border-[#1C1C1E] rounded-none">
            <span className="w-1.5 h-1.5 bg-primary animate-pulse" />
            <span className="text-primary font-bold text-[9px] uppercase tracking-[0.2em]">RallyGrid Terminal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight uppercase font-sans">
            Gather the right<br />
            <span className="text-primary">[ people ]</span>
          </h1>
          <p className="text-dark-muted leading-relaxed max-w-sm font-sans text-xs">
            Create cricket squads, parties, coordinate expeditions, workshops, and every kind of live squad gathering.
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="relative z-10 shrink-0 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-dark-bg font-bold px-6 py-3.5 transition-colors duration-150 focus:outline-none rounded-none uppercase tracking-wider"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Create Gathering
        </motion.button>
      </motion.div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-3 bg-[#0A0A0C] border border-[#1C1C1E] rounded-none">
        <div className="flex items-center gap-2 w-full sm:max-w-xs bg-[#000000] border border-[#1C1C1E] px-3 py-2 rounded-none">
          <Search className="w-3.5 h-3.5 text-dark-muted shrink-0" />
          <input
            type="text"
            placeholder="Search registers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-dark-text text-xs placeholder:text-dark-muted/40 focus:outline-none font-mono"
          />
        </div>

        <div className="flex items-center h-[36px] bg-[#000000] border border-[#1C1C1E] p-1 gap-1 w-full sm:w-auto overflow-x-auto rounded-none">
          {['ALL', 'EASY', 'MODERATE', 'HARD', 'EXTREME'].map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`px-3 h-full rounded-none text-[10px] font-bold tracking-wide uppercase transition-colors duration-150 focus:outline-none shrink-0 ${selectedDifficulty === diff
                  ? 'bg-primary text-dark-bg'
                  : 'text-dark-muted hover:text-dark-text'
                }`}
            >
              {diff === 'MODERATE' ? 'MOD' : diff}
            </button>
          ))}
        </div>
      </div>

      {/* ── Expedition Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={`skeleton-${i}`} className="h-[400px] bg-[#0A0A0C] border border-[#1C1C1E] animate-pulse rounded-none" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-10 text-center border border-red-500/20 bg-red-500/[0.03] rounded-none">
          <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 text-xs tracking-wide uppercase">
            SYS_ERR // Failed to retrieve active registers. Confirm server link.
          </p>
        </div>
      ) : filteredTreks.length === 0 ? (
        <div className="p-16 text-center border border-[#1C1C1E] bg-[#0A0A0C] rounded-none">
          <Calendar className="w-8 h-8 mx-auto mb-4 text-dark-muted/40" />
          <h3 className="text-xs font-bold text-dark-text uppercase tracking-widest mb-1.5">No registers found</h3>
          <p className="text-[11px] text-dark-muted font-sans">
            Be the first coordinator to register an expedition.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTreks.map((trek, index) => (
            <motion.div
              key={trek.id}
              custom={index}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col bg-[#0A0A0C] border border-[#1C1C1E] hover:border-primary transition-colors duration-150 relative overflow-hidden rounded-none shadow-[0_10px_35px_rgba(0,0,0,0.6)] text-left"
            >
              {/* Menu Toggle button */}
              <div className="absolute top-3.5 right-3.5 z-30" ref={activeMenuTrekId === trek.id ? menuRef : null}>
                <button
                  onClick={(e) => toggleMenu(e, trek.id)}
                  className="p-1.5 bg-[#000000]/70 border border-[#1C1C1E] hover:border-primary text-dark-muted hover:text-primary transition-colors focus:outline-none rounded-none"
                  title="Actions Menu"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                <AnimatePresence>
                  {activeMenuTrekId === trek.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: -4 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 mt-1.5 w-44 bg-[#0A0A0C] border border-[#1C1C1E] shadow-2xl flex flex-col z-40 p-1 rounded-none font-mono"
                    >
                      <button
                        onClick={() => handleShareLink(trek.id)}
                        className="w-full text-left px-3 py-2 rounded-none text-[10px] font-bold text-dark-muted hover:text-primary hover:bg-[#E8FF00]/5 transition-colors flex items-center justify-between uppercase"
                      >
                        <span className="flex items-center gap-2">
                          <Share2 className="w-3 h-3" /> Share Code
                        </span>
                        {copiedTrekId === trek.id && <Check className="w-3 h-3 text-primary" />}
                      </button>

                      {trek.is_group_admin && (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(trek)}
                            className="w-full text-left px-3 py-2 rounded-none text-[10px] font-bold text-dark-muted hover:text-primary hover:bg-[#E8FF00]/5 transition-colors flex items-center gap-2 uppercase border-t border-[#1C1C1E]/50 mt-1 pt-2"
                          >
                            <Edit2 className="w-3 h-3" /> Modify Settings
                          </button>
                          <button
                            onClick={() => handleDeleteTrek(trek.id)}
                            className="w-full text-left px-3 py-2 rounded-none text-[10px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2 uppercase border-t border-[#1C1C1E]/50 mt-1 pt-2"
                          >
                            <Trash2 className="w-3 h-3" /> Terminate Link
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {trek.destination_image_url ? (
                <div className="h-48 w-full overflow-hidden relative border-b border-[#1C1C1E]">
                  <img
                    src={trek.destination_image_url}
                    alt={trek.destination || trek.title}
                    className="w-full h-full object-cover filter grayscale contrast-125 hover:grayscale-0 transition-all duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-[#000000]/10 mix-blend-multiply" />
                </div>
              ) : (
                <div className="h-44 w-full bg-[#000000] border-b border-[#1C1C1E] flex items-center justify-center relative">
                  <Network className="w-6 h-6 text-white/5" />
                </div>
              )}

              <div className="p-5 flex flex-col flex-1 justify-between gap-4 font-mono text-xs">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#1C1C1E]/40 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold px-2 py-0.5 border uppercase ${DIFFICULTY_STYLES[trek.difficulty] || 'border-[#1C1C1E] text-dark-muted'}`}>
                        {trek.difficulty}
                      </span>
                      {trek.is_private && (
                        <span className="text-[9px] font-bold px-2 py-0.5 border border-red-500/20 bg-red-500/5 text-red-400 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>PVT</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-dark-muted flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-primary shrink-0" />
                      {new Date(trek.date).toISOString().split('T')[0]}
                    </span>
                  </div>

                  <div>
                    {trek.destination && (
                      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-primary mb-1 line-clamp-1">
                        LOC // {trek.destination}
                      </p>
                    )}
                    <h3 className="text-sm font-bold text-dark-text leading-tight line-clamp-1 font-sans uppercase">
                      {trek.title}
                    </h3>
                    <p className="text-dark-muted text-xs line-clamp-3 mt-2 leading-relaxed min-h-[48px] font-sans">
                      {trek.description}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="border-t border-[#1C1C1E]/50 pt-3 flex items-center justify-between text-[10px] text-dark-muted">
                    <div className="flex items-center gap-2 text-dark-muted min-w-0">
                      {trek.organizer_profile_picture_url ? (
                        <img
                          src={trek.organizer_profile_picture_url}
                          alt={trek.organizer_username || 'Organizer'}
                          className="w-5 h-5 rounded-none object-cover border border-[#1C1C1E] shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-[#000000] border border-[#1C1C1E] flex items-center justify-center shrink-0 font-bold text-[8px] uppercase text-primary">
                          {trek.organizer_username ? trek.organizer_username[0] : <User className="w-2 h-2" />}
                        </div>
                      )}
                      <span className="truncate max-w-[90px] uppercase font-mono">
                        {trek.organizer_username || 'ADMIN'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 font-mono">
                      <Users className="w-3 h-3 text-primary shrink-0" />
                      <span className="font-bold text-dark-text">
                        {trek.members_count || 0}
                        <span className="text-primary">/</span>
                        {trek.capacity}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    {trek.is_member && trek.join_request_status !== 'PENDING' ? (
                      <Link
                        to={`/trek/${trek.id}`}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-transparent border border-primary/40 text-primary hover:bg-primary hover:text-dark-bg font-bold text-[10px] uppercase tracking-wider transition-colors duration-150 no-underline rounded-none font-mono"
                      >
                        ACCESS TERMINAL
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : trek.join_request_status === 'PENDING' ? (
                      <button
                        disabled
                        className="w-full py-2 bg-[#000000] border border-[#1C1C1E] text-dark-muted/50 font-bold text-[10px] uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2 rounded-none"
                      >
                        <span className="inline-block w-1.5 h-1.5 bg-yellow-400 animate-pulse rounded-none" />
                        PENDING APPROVAL
                      </button>
                    ) : trek.join_request_status === 'REJECTED' ? (
                      <button
                        disabled
                        className="w-full py-2 bg-transparent border border-red-500/10 text-red-500/50 font-bold text-[10px] uppercase tracking-wider cursor-not-allowed rounded-none"
                      >
                        LINK REJECTED
                      </button>
                    ) : trek.capacity > 20 ? (
                      <button
                        onClick={() => checkoutMutation.mutate({ id: trek.id, redirectUrl: `${window.location.origin}/trek/${trek.id}/` })}
                        disabled={checkoutMutation.isPending}
                        className="w-full py-2 bg-primary hover:bg-primary-hover text-dark-bg font-bold text-[10px] uppercase tracking-wider transition-colors duration-150 focus:outline-none disabled:opacity-50 flex items-center justify-center gap-1 rounded-none"
                      >
                        {checkoutMutation.isPending && checkoutMutation.variables?.id === trek.id ? 'REDIRECTING...' : 'PAY $10 TO JOIN'}
                      </button>
                    ) : (
                      <button
                        onClick={() => joinRequestMutation.mutate(trek.id)}
                        disabled={joinRequestMutation.isPending}
                        className="w-full py-2 bg-primary hover:bg-primary-hover text-dark-bg font-bold text-[10px] uppercase tracking-wider transition-colors duration-150 focus:outline-none disabled:opacity-50 rounded-none"
                      >
                        {joinRequestMutation.isPending ? 'REQUESTING...' : 'REQUEST TO JOIN'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Gathering Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 font-mono text-xs">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85"
              onClick={handleCloseModal}
            />

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-lg z-10 relative bg-[#0A0A0C] border border-[#1C1C1E] max-h-[90vh] overflow-y-auto shadow-[0_30px_70px_rgba(0,0,0,0.9)] rounded-none"
              style={{ scrollbarWidth: 'none' }}
            >
              <div className="flex items-start justify-between px-7 pt-7 pb-5 border-b border-[#1C1C1E] bg-[#050505]">
                <div>
                  <h2 className="text-sm font-bold text-dark-text uppercase tracking-widest">
                    {editingTrekId ? 'Modify gathering config' : 'Register gathering profile'}
                  </h2>
                  <p className="text-[10px] text-dark-muted mt-1 uppercase font-mono">
                    Configure dates, member limit levels, and category intensity.
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-1.5 border border-[#1C1C1E] text-dark-muted hover:text-primary bg-[#000000] focus:outline-none shrink-0 rounded-none"
                  aria-label="Close modal"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="px-7 py-6">
                {formError && (
                  <div className="mb-4 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] uppercase">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {formError}
                  </div>
                )}

                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="trek-title" className="block text-[9px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">
                      [01] Gathering Title *
                    </label>
                    <input
                      id="trek-title"
                      type="text"
                      value={newTrekTitle}
                      onChange={(e) => setNewTrekTitle(e.target.value)}
                      placeholder="e.g. Sunday Cricket Match"
                      required
                      className="w-full px-4 py-3 bg-[#000000] border border-[#1C1C1E] text-dark-text text-xs focus:outline-none focus:border-primary transition-colors placeholder:text-dark-muted-dim rounded-none font-sans"
                    />
                  </div>

                  <div>
                    <label htmlFor="trek-destination" className="block text-[9px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">
                      [02] Location / Coordinates
                    </label>
                    <input
                      id="trek-destination"
                      type="text"
                      value={newTrekDestination}
                      onChange={(e) => setNewTrekDestination(e.target.value)}
                      placeholder="Cubbon Park, Bengaluru"
                      className="w-full px-4 py-3 bg-[#000000] border border-[#1C1C1E] text-dark-text text-xs focus:outline-none focus:border-primary transition-colors placeholder:text-dark-muted-dim rounded-none font-sans"
                    />
                  </div>

                  <div>
                    <label htmlFor="trek-image" className="block text-[9px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">
                      [03] Cover Image File
                    </label>
                    {newTrekImagePreview ? (
                      <div className="relative border border-[#1C1C1E] bg-[#000000] p-1 rounded-none">
                        <img src={newTrekImagePreview} alt="Preview" className="w-full h-32 object-cover filter grayscale" />
                        <button
                          type="button"
                          onClick={() => { setNewTrekImage(null); setNewTrekImagePreview(null); }}
                          className="absolute top-3 right-3 p-1 bg-black/60 border border-[#1C1C1E] text-dark-muted hover:text-red-500 focus:outline-none rounded-none"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative p-6 bg-[#000000] border border-dashed border-[#1C1C1E] hover:border-primary flex flex-col items-center justify-center group transition-colors cursor-pointer rounded-none">
                        <input
                          id="trek-image"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                               setNewTrekImage(file);
                               setNewTrekImagePreview(URL.createObjectURL(file));
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <Upload className="w-4 h-4 text-dark-muted/40 mb-2 group-hover:text-primary transition-colors" />
                        <span className="text-[10px] text-dark-muted/60 group-hover:text-dark-muted uppercase font-mono transition-colors">
                          Upload layout cover photo
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="trek-desc" className="block text-[9px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">
                      [04] Description Details *
                    </label>
                    <textarea
                      id="trek-desc"
                      value={newTrekDesc}
                      onChange={(e) => setNewTrekDesc(e.target.value)}
                      placeholder="What is happening, schedule coordinates, campsites..."
                      rows="3"
                      required
                      className="w-full px-4 py-3 bg-[#000000] border border-[#1C1C1E] text-dark-text text-xs focus:outline-none focus:border-primary resize-none transition-colors placeholder:text-dark-muted-dim rounded-none font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="trek-date" className="block text-[9px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">
                        [05] Launch Date *
                      </label>
                      <input
                        id="trek-date"
                        type="date"
                        value={newTrekDate}
                        onChange={(e) => setNewTrekDate(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-[#000000] border border-[#1C1C1E] text-dark-text text-xs focus:outline-none focus:border-primary transition-colors rounded-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="trek-capacity" className="block text-[9px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">
                        [06] Max Squad Count *
                      </label>
                      <input
                        id="trek-capacity"
                        type="number"
                        value={newTrekCapacity}
                        onChange={(e) => setNewTrekCapacity(e.target.value)}
                        min="2"
                        max="100"
                        required
                        className="w-full px-4 py-3 bg-[#000000] border border-[#1C1C1E] text-dark-text text-xs focus:outline-none focus:border-primary transition-colors rounded-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 py-1 px-1">
                    <input
                      id="trek-is-private"
                      type="checkbox"
                      checked={newTrekIsPrivate}
                      onChange={(e) => setNewTrekIsPrivate(e.target.checked)}
                      className="border-[#1C1C1E] bg-[#000000] text-primary focus:ring-transparent w-4 h-4 cursor-pointer rounded-none"
                    />
                    <label htmlFor="trek-is-private" className="text-[10px] font-bold text-dark-muted cursor-pointer select-none uppercase">
                      Restrict Access (Make gathering Private)
                    </label>
                  </div>

                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">
                      [07] Intensity Category
                    </span>
                    <div className="flex bg-[#000000] border border-[#1C1C1E] p-1 gap-1 rounded-none">
                      {['EASY', 'MODERATE', 'HARD', 'EXTREME'].map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setNewTrekDiff(diff)}
                          className={`flex-1 py-2 rounded-none font-bold text-[9px] uppercase tracking-wider transition-colors duration-150 focus:outline-none ${newTrekDiff === diff
                              ? 'bg-primary text-dark-bg'
                              : 'text-dark-muted hover:text-dark-text'
                            }`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 py-3 bg-transparent border border-[#333] text-dark-muted hover:text-dark-text font-bold text-xs uppercase tracking-wider transition-colors focus:outline-none rounded-none"
                    >
                      CANCEL
                    </button>
                    <button
                      type="submit"
                      disabled={createTrekMutation.isPending || updateTrekMutation.isPending}
                      className="flex-1 py-3 bg-primary hover:bg-primary-hover text-dark-bg font-bold text-xs uppercase tracking-wider transition-colors focus:outline-none disabled:opacity-40 rounded-none"
                    >
                      {createTrekMutation.isPending || updateTrekMutation.isPending ? 'SAVING...' : editingTrekId ? 'SAVE CHANGES' : 'LAUNCH SQUAD'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
