import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar, Users, Search, AlertTriangle, Plus, X,
  ArrowRight, User, Upload, Network, Edit2, Trash2, Share2, Check, MoreVertical, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { treksAPI } from '../api';

const DIFFICULTY_STYLES = {
  EASY: 'border-green-400/30  bg-green-400/10  text-green-300',
  MODERATE: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300',
  HARD: 'border-orange-400/30 bg-orange-400/10 text-orange-300',
  EXTREME: 'border-red-400/30     bg-red-400/10     text-red-300',
};

const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, delay: Math.min(i * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] },
  }),
};

// Public directory images for background rotation animation loop
const RALLY_IMAGES = [
  
  '/Gemini_Generated_Image_dhr4pmdhr4pmdhr4 (1).png',
  '/Gemini_Generated_Image_hnr2hzhnr2hzhnr2.png'
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
    }, 4000); // Transitions every 4 seconds
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
    <div className="space-y-6 max-w-7xl mx-auto w-full">

      {/* ── Hero Banner with Fluid Auto-Carousel Backing ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative py-14 px-8 sm:px-14 flex flex-col md:flex-row md:items-center justify-between gap-8 rounded-[2rem] bg-[#0d0d0d] border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden"
      >
        {/* Dynamic Image Underlay Mask Structure */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="popLayout">
            <motion.img
              key={currentImgIndex}
              src={RALLY_IMAGES[currentImgIndex]}
              alt="Network Background"
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="w-full h-full object-cover"
            />
          </AnimatePresence>
          {/* Gradient Tint Mask Layer to match theme properties and elevate typography readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/30 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>

        <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none z-10" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-primary/[0.04] rounded-full blur-3xl pointer-events-none z-10" />

        <div className="space-y-3 max-w-xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-primary font-semibold text-[11px] uppercase tracking-[0.2em]">RallyGrid Network</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.05] drop-shadow-md">
            Gather the right<br />
            <span className="text-primary">people</span>
          </h1>
          <p className="text-dark-muted text-sm sm:text-base leading-relaxed max-w-sm drop-shadow-sm font-medium text-gray-300">
            Create cricket squads, parties, protests, meetups, workshops — and every kind of live event.
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="relative z-10 shrink-0 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-dark-bg font-bold px-7 py-4 rounded-full text-sm transition-colors duration-200 shadow-[0_10px_30px_rgba(232,255,0,0.35)] focus:outline-none"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Create Gathering
        </motion.button>
      </motion.div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between px-4 py-3 rounded-full bg-white/[0.03] backdrop-blur-xl border border-white/[0.07]">
        <div className="flex items-center gap-2 w-full sm:max-w-xs rounded-full bg-white/[0.04] border border-white/[0.06] px-1">
          <div className="pl-3 shrink-0">
            <Search className="w-3.5 h-3.5 text-dark-muted" />
          </div>
          <input
            type="text"
            placeholder="Search gatherings and locations"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-4 py-2.5 bg-transparent text-dark-text text-sm placeholder:text-dark-muted/50 focus:outline-none"
          />
        </div>

        <div className="flex items-center h-[40px] rounded-full bg-white/[0.04] border border-white/[0.06] w-full sm:w-auto p-1 gap-1">
          {['ALL', 'EASY', 'MODERATE', 'HARD', 'EXTREME'].map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`px-3.5 h-full rounded-full text-[11px] font-bold tracking-wide uppercase transition-colors duration-200 focus:outline-none ${selectedDifficulty === diff
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
            <div key={`skeleton-${i}`} className="h-[420px] rounded-[1.75rem] bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-10 text-center rounded-[1.75rem] border border-red-400/20 bg-red-500/[0.04] backdrop-blur-xl">
          <AlertTriangle className="w-8 h-8 text-red-300 mx-auto mb-3" />
          <p className="text-red-300 text-sm tracking-wide">
            Failed to retrieve active gatherings. Ensure your backend server is running.
          </p>
        </div>
      ) : filteredTreks.length === 0 ? (
        <div className="p-16 text-center rounded-[1.75rem] border border-white/[0.07] bg-white/[0.02] backdrop-blur-xl">
          <Calendar className="w-10 h-10 mx-auto mb-4 text-dark-muted/30" />
          <h3 className="text-base font-bold text-dark-text mb-1">No gatherings found</h3>
          <p className="text-sm text-dark-muted">
            Be the first to create one.
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
              whileHover={{ y: -4 }}
              className="flex flex-col rounded-[1.75rem] bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] hover:border-primary/20 transition-colors duration-300 relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
            >
              {/* 3-Dot Responsive Config Menu Layer */}
              <div className="absolute top-3 right-3 z-30" ref={activeMenuTrekId === trek.id ? menuRef : null}>
                <button
                  onClick={(e) => toggleMenu(e, trek.id)}
                  className="p-2 rounded-full bg-black/30 backdrop-blur-md border border-white/10 hover:border-primary/40 text-dark-text transition-colors focus:outline-none"
                  title="Actions Menu"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                <AnimatePresence>
                  {activeMenuTrekId === trek.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-44 rounded-2xl bg-[#111]/95 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col z-40 overflow-hidden p-1"
                    >
                      <button
                        onClick={() => handleShareLink(trek.id)}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-dark-muted hover:text-primary hover:bg-white/[0.06] transition-colors flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <Share2 className="w-3.5 h-3.5" /> Share Gathering
                        </span>
                        {copiedTrekId === trek.id && <Check className="w-3.5 h-3.5 text-green-400" />}
                      </button>

                      {/* Organizer Settings Access Gate */}
                      {trek.is_group_admin && (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(trek)}
                            className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-dark-muted hover:text-yellow-300 hover:bg-white/[0.06] transition-colors flex items-center gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit Settings
                          </button>
                          <button
                            onClick={() => handleDeleteTrek(trek.id)}
                            className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Gathering
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {trek.destination_image_url ? (
                <div className="h-56 w-full overflow-hidden relative">
                  <img
                    src={trek.destination_image_url}
                    alt={trek.destination || trek.title}
                    className="w-full h-full object-cover transition-transform duration-500"
                    loading="eager"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>
              ) : (
                <div className="h-44 w-full bg-white/[0.02] flex items-center justify-center relative">
                  <Network className="w-8 h-8 text-white/10" />
                </div>
              )}

              <div className="p-5 flex flex-col flex-1 justify-between gap-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${DIFFICULTY_STYLES[trek.difficulty] || 'border-white/10 text-dark-muted'}`}>
                        {trek.difficulty}
                      </span>
                      {trek.is_private && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full border border-red-500/20 bg-red-500/10 text-red-400 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Private</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-dark-muted font-medium flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-primary shrink-0" />
                      {new Date(trek.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div>
                    {trek.destination && (
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-1 line-clamp-1">
                        {trek.destination}
                      </p>
                    )}
                    <h3 className="text-base font-bold text-dark-text leading-tight group-hover:text-primary transition-colors duration-200 line-clamp-1">
                      {trek.title}
                    </h3>
                    <p className="text-dark-muted text-xs line-clamp-3 mt-1.5 leading-relaxed min-h-[48px]">
                      {trek.description}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="border-t border-white/[0.06] pt-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-dark-muted">
                      {trek.organizer_profile_picture_url ? (
                        <img
                          src={trek.organizer_profile_picture_url}
                          alt={trek.organizer_username || 'Organizer'}
                          className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/15 ring-1 ring-white/10 flex items-center justify-center shrink-0 font-bold text-[10px] uppercase text-primary">
                          {trek.organizer_username ? trek.organizer_username[0] : <User className="w-2.5 h-2.5" />}
                        </div>
                      )}
                      <span className="text-[11px] truncate max-w-[110px]">
                        {trek.organizer_username || 'Organizer'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-dark-muted">
                      <Users className="w-3 h-3 text-primary shrink-0" />
                      <span className="font-semibold text-dark-text text-[11px]">
                        {trek.members_count || 0}
                        <span className="text-primary"> / </span>
                        {trek.capacity}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    {/* Security check: direct access link protection router gate configuration */}
                    {trek.is_member && trek.join_request_status !== 'PENDING' ? (
                      <Link
                        to={`/trek/${trek.id}`}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-transparent border border-primary/40 text-primary hover:bg-primary hover:text-dark-bg font-bold text-[11px] uppercase tracking-wide transition-colors duration-200 focus:outline-none no-underline"
                      >
                        Open Workspace
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : trek.join_request_status === 'PENDING' ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-dark-muted/50 font-bold text-[11px] uppercase tracking-wide cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <span className="inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                        Pending Approval
                      </button>
                    ) : trek.join_request_status === 'REJECTED' ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-full bg-transparent border border-red-500/10 text-red-500/50 font-bold text-[11px] uppercase tracking-wide cursor-not-allowed"
                      >
                        Request Rejected
                      </button>
                    ) : trek.capacity > 20 ? (
                      <button
                        onClick={() => checkoutMutation.mutate({ id: trek.id, redirectUrl: `${window.location.origin}/trek/${trek.id}/` })}
                        disabled={checkoutMutation.isPending}
                        className="w-full py-2.5 rounded-full bg-primary hover:bg-primary-hover text-dark-bg font-bold text-[11px] uppercase tracking-wide transition-colors duration-200 focus:outline-none disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {checkoutMutation.isPending && checkoutMutation.variables?.id === trek.id ? 'Redirecting...' : 'Pay $10 to Join'}
                      </button>
                    ) : (
                      <button
                        onClick={() => joinRequestMutation.mutate(trek.id)}
                        disabled={joinRequestMutation.isPending}
                        className="w-full py-2.5 rounded-full bg-primary hover:bg-primary-hover text-dark-bg font-bold text-[11px] uppercase tracking-wide transition-colors duration-200 focus:outline-none disabled:opacity-50"
                      >
                        {joinRequestMutation.isPending ? 'Requesting...' : 'Request to Join'}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={handleCloseModal}
            />

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.18 }}
              className="w-full max-w-lg z-10 relative bg-[#0c0c0c]/90 backdrop-blur-2xl border border-white/[0.08] rounded-[2rem] max-h-[90vh] overflow-y-auto shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
              style={{ scrollbarWidth: 'none' }}
            >
              <div className="flex items-start justify-between px-7 pt-7 pb-5 border-b border-white/[0.06]">
                <div>
                  <h2 className="text-lg font-bold text-dark-text">
                    {editingTrekId ? 'Update gathering' : 'Create new gathering'}
                  </h2>
                  <p className="text-[12px] text-dark-muted mt-0.5">
                    Set capacity, date, and the kind of energy people should expect.
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-full text-dark-muted hover:text-dark-text bg-white/[0.04] hover:bg-white/[0.08] transition-colors focus:outline-none shrink-0"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-7 py-6">
                {formError && (
                  <div className="mb-4 flex items-center gap-2 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-[12px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {formError}
                  </div>
                )}

                <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
                  <div>
                    <label htmlFor="trek-title" className="block text-xs font-semibold text-dark-muted mb-1.5">
                      Gathering title *
                    </label>
                    <input
                      id="trek-title"
                      type="text"
                      value={newTrekTitle}
                      onChange={(e) => setNewTrekTitle(e.target.value)}
                      placeholder="Sunday cricket match"
                      required
                      className="w-full px-4 py-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-dark-text text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder:text-dark-muted/40"
                    />
                  </div>

                  <div>
                    <label htmlFor="trek-destination" className="block text-xs font-semibold text-dark-muted mb-1.5">
                      Location
                    </label>
                    <input
                      id="trek-destination"
                      type="text"
                      value={newTrekDestination}
                      onChange={(e) => setNewTrekDestination(e.target.value)}
                      placeholder="Cubbon Park, Bengaluru"
                      className="w-full px-4 py-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-dark-text text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder:text-dark-muted/40"
                    />
                  </div>

                  <div>
                    <label htmlFor="trek-image" className="block text-xs font-semibold text-dark-muted mb-1.5">
                      Cover image
                    </label>
                    {newTrekImagePreview ? (
                      <div className="relative rounded-2xl overflow-hidden border border-white/[0.08]">
                        <img src={newTrekImagePreview} alt="Preview" className="w-full h-32 object-cover" />
                        <button
                          type="button"
                          onClick={() => { setNewTrekImage(null); setNewTrekImagePreview(null); }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-dark-muted hover:text-dark-text focus:outline-none"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.1] hover:border-primary/30 flex flex-col items-center justify-center group transition-colors cursor-pointer">
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
                        <Upload className="w-5 h-5 text-dark-muted/40 mb-2 group-hover:text-primary/60 transition-colors" />
                        <span className="text-[12px] text-dark-muted/60 group-hover:text-dark-muted transition-colors">
                          Click to upload cover photo
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="trek-desc" className="block text-xs font-semibold text-dark-muted mb-1.5">
                      Details *
                    </label>
                    <textarea
                      id="trek-desc"
                      value={newTrekDesc}
                      onChange={(e) => setNewTrekDesc(e.target.value)}
                      placeholder="What is happening, what to bring, meeting point, timing..."
                      rows="3"
                      required
                      className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-dark-text text-sm focus:outline-none focus:border-primary/50 resize-none transition-colors placeholder:text-dark-muted/40"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="trek-date" className="block text-xs font-semibold text-dark-muted mb-1.5">
                        Date *
                      </label>
                      <input
                        id="trek-date"
                        type="date"
                        value={newTrekDate}
                        onChange={(e) => setNewTrekDate(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-dark-text text-sm focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label htmlFor="trek-capacity" className="block text-xs font-semibold text-dark-muted mb-1.5">
                        Capacity *
                      </label>
                      <input
                        id="trek-capacity"
                        type="number"
                        value={newTrekCapacity}
                        onChange={(e) => setNewTrekCapacity(e.target.value)}
                        min="2"
                        max="100"
                        required
                        className="w-full px-4 py-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-dark-text text-sm focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-2 py-1">
                    <input
                      id="trek-is-private"
                      type="checkbox"
                      checked={newTrekIsPrivate}
                      onChange={(e) => setNewTrekIsPrivate(e.target.checked)}
                      className="rounded border-white/[0.08] bg-white/[0.04] text-primary focus:ring-primary/50 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="trek-is-private" className="text-xs font-semibold text-dark-muted cursor-pointer select-none">
                      Make gathering private (hidden from public dashboard lists)
                    </label>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-dark-muted mb-1.5">
                      Intensity level
                    </span>
                    <div className="flex rounded-full bg-white/[0.04] border border-white/[0.08] p-1 gap-1">
                      {['EASY', 'MODERATE', 'HARD', 'EXTREME'].map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setNewTrekDiff(diff)}
                          className={`flex-1 py-2.5 rounded-full font-bold text-[10px] uppercase tracking-wide transition-colors duration-200 focus:outline-none ${newTrekDiff === diff
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
                      className="flex-1 py-3.5 rounded-full border border-white/10 text-dark-text font-bold text-xs uppercase tracking-wide hover:bg-white/[0.04] transition-colors focus:outline-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createTrekMutation.isPending || updateTrekMutation.isPending}
                      className="flex-1 py-3.5 rounded-full bg-primary hover:bg-primary-hover text-dark-bg font-bold text-xs uppercase tracking-wide transition-colors focus:outline-none disabled:opacity-40"
                    >
                      {createTrekMutation.isPending || updateTrekMutation.isPending ? 'Saving...' : editingTrekId ? 'Save Changes' : 'Launch Gathering'}
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
