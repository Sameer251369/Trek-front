import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Users, Search, AlertTriangle, Plus, X, ArrowRight, User, Upload, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { treksAPI } from '../api';

const DIFFICULTY_STYLES = {
  EASY:     'border-green-500/40  bg-green-500/10  text-green-400',
  MODERATE: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
  HARD:     'border-orange-500/40 bg-orange-500/10 text-orange-400',
  EXTREME:  'border-red-500/40    bg-red-500/10    text-red-400',
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTrekTitle, setNewTrekTitle] = useState('');
  const [newTrekDesc, setNewTrekDesc] = useState('');
  const [newTrekDate, setNewTrekDate] = useState('');
  const [newTrekCapacity, setNewTrekCapacity] = useState('10');
  const [newTrekDiff, setNewTrekDiff] = useState('MODERATE');
  const [newTrekDestination, setNewTrekDestination] = useState('');
  const [newTrekImage, setNewTrekImage] = useState(null);
  const [newTrekImagePreview, setNewTrekImagePreview] = useState(null);
  const [formError, setFormError] = useState(null);

  // Debounce search term entry
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Clean up memory leaks from object previews
  useEffect(() => {
    return () => { if (newTrekImagePreview) URL.revokeObjectURL(newTrekImagePreview); };
  }, [newTrekImagePreview]);

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

  const joinRequestMutation = useMutation({
    mutationFn: treksAPI.requestJoin,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['treks'] }); },
    onError: (err) => {
      alert(err.response?.data?.[0] || err.response?.data?.detail || 'Request to join failed.');
    },
  });

  const resetForm = () => {
    setNewTrekTitle('');
    setNewTrekDesc('');
    setNewTrekDate('');
    setNewTrekCapacity('10');
    setNewTrekDiff('MODERATE');
    setNewTrekDestination('');
    setNewTrekImage(null);
    
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

  // Client-side filtering logic
  const filteredTreks = treks.filter(trek => {
    const q = debouncedSearchTerm.toLowerCase();
    const matchesSearch =
      trek.title?.toLowerCase().includes(q) ||
      trek.description?.toLowerCase().includes(q) ||
      trek.destination?.toLowerCase().includes(q);
    const matchesDiff = selectedDifficulty === 'ALL' || trek.difficulty === selectedDifficulty;
    return matchesSearch && matchesDiff;
  });

  // FIXED: Structured payload pipeline into the React Query Mutation
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

    if (newTrekImage) {
      formData.append('destination_image', newTrekImage);
    }

    createTrekMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">

      {/* ── Hero Banner ── */}
      <div
        className="relative py-12 px-8 sm:px-12 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-[#1E1E1E] bg-[#0A0A0A] overflow-hidden"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(232,255,0,0.03) 39px, rgba(232,255,0,0.03) 40px),
            repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(232,255,0,0.03) 39px, rgba(232,255,0,0.03) 40px)
          `,
        }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }} />
        <div className="absolute top-0 right-0 w-0.5 h-32 bg-primary/30" />
        <div className="absolute top-0 right-0 h-0.5 w-32 bg-primary/30" />

        <div className="space-y-3 max-w-xl relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-5 bg-primary shrink-0" />
            <span className="text-primary font-black text-[10px] uppercase tracking-[0.3em]">RallyGrid Network</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-dark-text uppercase leading-none">
            Gather the right<br />
            <span className="text-primary">People</span>
          </h1>
          <p className="text-dark-muted text-sm leading-relaxed max-w-sm">
            Create cricket squads, parties, protests, meetups, workshops, and every kind of live event.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="relative z-10 shrink-0 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-dark-bg font-black px-7 py-4 text-[11px] uppercase tracking-[0.2em] transition-colors duration-150 active:scale-[0.98] focus:outline-none"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Create Gathering
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between px-4 py-3 bg-[#0D0D0D] border border-[#1E1E1E]">
        <div className="flex items-center gap-2 w-full sm:max-w-xs border border-[#1E1E1E] bg-[#0A0A0A]">
          <div className="pl-3 shrink-0">
            <Search className="w-3.5 h-3.5 text-dark-muted" />
          </div>
          <input
            type="text"
            placeholder="SEARCH GATHERINGS AND LOCATIONS"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-4 py-2.5 bg-transparent text-dark-text text-[11px] tracking-[0.1em] uppercase placeholder:text-[#333] focus:outline-none"
          />
        </div>

        <div className="flex items-center h-[40px] border border-[#1E1E1E] bg-[#0A0A0A] w-full sm:w-auto">
          {['ALL', 'EASY', 'MODERATE', 'HARD', 'EXTREME'].map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`px-3 h-full text-[10px] font-black tracking-[0.12em] uppercase transition-colors duration-100 border-r border-[#1E1E1E] last:border-r-0 focus:outline-none ${
                selectedDifficulty === diff
                  ? 'bg-primary text-dark-bg'
                  : 'text-dark-muted hover:text-dark-text bg-transparent'
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
            <div key={`skeleton-${i}`} className="h-[420px] bg-[#0D0D0D] border border-[#1E1E1E] animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 text-center border border-red-500/20 bg-[#0A0A0A]">
          <div className="w-px h-8 bg-red-500/40 mx-auto mb-4" />
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 text-sm tracking-wide">
            Failed to retrieve active gatherings. Ensure your backend server is running.
          </p>
        </div>
      ) : filteredTreks.length === 0 ? (
        <div className="p-16 text-center border border-[#1E1E1E] bg-[#0A0A0A]">
          <div className="w-px h-8 bg-[#333] mx-auto mb-4" />
          <Calendar className="w-10 h-10 mx-auto mb-4 text-[#333]" />
          <h3 className="text-sm font-black text-dark-text uppercase tracking-[0.2em] mb-1">No Gatherings Found</h3>
          <p className="text-xs text-dark-muted tracking-wide">
            Be the first to create one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTreks.map((trek) => (
            <div
              key={trek.id}
              className="flex flex-col bg-[#0A0A0A] border border-[#1E1E1E] hover:border-[#2A2A2A] transition-colors duration-300 relative group overflow-hidden"
            >
              <div className="h-[2px] bg-primary w-8" />

              {trek.destination_image_url ? (
                <div className="h-44 w-full overflow-hidden border-b border-[#1E1E1E]">
                  <img
                    src={trek.destination_image_url}
                    alt={trek.destination || trek.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="h-44 w-full bg-[#0D0D0D] border-b border-[#1E1E1E] flex items-center justify-center"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(232,255,0,0.02) 8px, rgba(232,255,0,0.02) 9px)',
                  }}
                >
                  <Network className="w-8 h-8 text-[#1E1E1E]" />
                </div>
              )}

              <div className="p-5 flex flex-col flex-1 justify-between gap-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-black px-2 py-1 border uppercase tracking-[0.18em] ${DIFFICULTY_STYLES[trek.difficulty] || 'border-[#333] text-dark-muted'}`}>
                      {trek.difficulty}
                    </span>
                    <span className="text-[10px] text-dark-muted font-mono flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-primary shrink-0" />
                      {new Date(trek.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div>
                    {trek.destination && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-0.5 h-3 bg-primary shrink-0" />
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary line-clamp-1">
                          {trek.destination}
                        </p>
                      </div>
                    )}
                    <h3 className="text-base font-black text-dark-text uppercase tracking-wide leading-tight group-hover:text-primary transition-colors duration-200 line-clamp-1">
                      {trek.title}
                    </h3>
                    <p className="text-dark-muted text-xs line-clamp-3 mt-1.5 leading-relaxed min-h-[48px]">
                      {trek.description}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="border-t border-[#1A1A1A] pt-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-dark-muted">
                      {trek.organizer_profile_picture_url ? (
                        <img
                          src={trek.organizer_profile_picture_url}
                          alt={trek.organizer_username || 'Organizer'}
                          className="w-6 h-6 object-cover border border-primary/40 shrink-0"
                          style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                        />
                      ) : (
                        <div
                          className="w-6 h-6 bg-[#1C1C00] border border-primary/40 flex items-center justify-center shrink-0 font-black text-[9px] uppercase text-primary"
                          style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                        >
                          {trek.organizer_username ? trek.organizer_username[0] : <User className="w-2.5 h-2.5" />}
                        </div>
                      )}
                      <span className="text-[11px] truncate max-w-[110px] tracking-wide">
                        {trek.organizer_username || 'Organizer'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-dark-muted">
                      <Users className="w-3 h-3 text-primary shrink-0" />
                      <span className="font-mono font-black text-dark-text text-[11px]">
                        {trek.members_count || 0}
                        <span className="text-primary"> / </span>
                        {trek.capacity}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    {trek.is_member ? (
                      <Link
                        to={`/trek/${trek.id}`}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-transparent border border-primary text-primary hover:bg-primary hover:text-dark-bg font-black text-[10px] uppercase tracking-[0.18em] transition-colors duration-150 focus:outline-none no-underline"
                      >
                        Open Workspace
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : trek.join_request_status === 'PENDING' ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-transparent border border-[#222] text-[#444] font-black text-[10px] uppercase tracking-[0.18em] cursor-not-allowed"
                      >
                        Pending Approval
                      </button>
                    ) : trek.join_request_status === 'REJECTED' ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-transparent border border-red-900/30 text-red-800 font-black text-[10px] uppercase tracking-[0.18em] cursor-not-allowed"
                      >
                        Request Rejected
                      </button>
                    ) : (
                      <button
                        onClick={() => joinRequestMutation.mutate(trek.id)}
                        disabled={joinRequestMutation.isPending}
                        className="w-full py-2.5 bg-primary hover:bg-primary-hover text-dark-bg font-black text-[10px] uppercase tracking-[0.18em] transition-colors duration-150 focus:outline-none disabled:opacity-50"
                      >
                        {joinRequestMutation.isPending ? 'Requesting...' : 'Request to Join'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Expedition Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90"
              onClick={handleCloseModal}
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="w-full max-w-lg z-10 relative bg-[#0A0A0A] border border-[#1E1E1E] max-h-[90vh] overflow-y-auto"
              style={{ scrollbarWidth: 'none' }}
            >
              <div className="h-[2px] bg-primary" />

              <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#1E1E1E]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-0.5 h-4 bg-primary shrink-0" />
                    <h2 className="text-[11px] font-black text-dark-text tracking-[0.2em] uppercase">
                      Create New Gathering
                    </h2>
                  </div>
                  <p className="text-[11px] text-dark-muted tracking-wide pl-2.5">
                    Set capacity, date, and the kind of energy people should expect.
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-dark-muted hover:text-dark-text border border-[#1E1E1E] hover:border-[#333] transition-colors focus:outline-none shrink-0"
                  aria-label="Close modal"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="px-6 py-5">
                {formError && (
                  <div className="mb-4 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] tracking-wide">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {formError}
                  </div>
                )}

                <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
                  <div>
                    <label htmlFor="trek-title" className="block text-[10px] font-black uppercase tracking-[0.18em] text-dark-muted mb-1.5">
                      Gathering Title *
                    </label>
                    <input
                      id="trek-title"
                      type="text"
                      value={newTrekTitle}
                      onChange={(e) => setNewTrekTitle(e.target.value)}
                      placeholder="Sunday cricket match"
                      required
                      className="w-full p-3 bg-[#0D0D0D] border border-[#1E1E1E] text-dark-text text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="trek-destination" className="block text-[10px] font-black uppercase tracking-[0.18em] text-dark-muted mb-1.5">
                      Location
                    </label>
                    <input
                      id="trek-destination"
                      type="text"
                      value={newTrekDestination}
                      onChange={(e) => setNewTrekDestination(e.target.value)}
                      placeholder="Cubbon Park, Bengaluru"
                      className="w-full p-3 bg-[#0D0D0D] border border-[#1E1E1E] text-dark-text text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="trek-image" className="block text-[10px] font-black uppercase tracking-[0.18em] text-dark-muted mb-1.5">
                      Cover Image
                    </label>
                    {newTrekImagePreview ? (
                      <div className="relative border border-[#1E1E1E] overflow-hidden">
                        <img src={newTrekImagePreview} alt="Preview" className="w-full h-32 object-cover" />
                        <button
                          type="button"
                          onClick={() => { setNewTrekImage(null); setNewTrekImagePreview(null); }}
                          className="absolute top-2 right-2 p-1.5 bg-[#0A0A0A]/90 border border-[#333] text-dark-muted hover:text-dark-text focus:outline-none"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative p-6 bg-[#0D0D0D] border border-dashed border-[#2A2A2A] hover:border-primary/40 flex flex-col items-center justify-center group transition-colors cursor-pointer">
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
                        <Upload className="w-5 h-5 text-[#333] mb-2 group-hover:text-primary/60 transition-colors" />
                        <span className="text-[11px] text-[#333] group-hover:text-dark-muted tracking-[0.1em] uppercase transition-colors">
                          Click to upload cover photo
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="trek-desc" className="block text-[10px] font-black uppercase tracking-[0.18em] text-dark-muted mb-1.5">
                      Details *
                    </label>
                    <textarea
                      id="trek-desc"
                      value={newTrekDesc}
                      onChange={(e) => setNewTrekDesc(e.target.value)}
                      placeholder="What is happening, what to bring, meeting point, timing..."
                      rows="3"
                      required
                      className="w-full p-3 bg-[#0D0D0D] border border-[#1E1E1E] text-dark-text text-sm focus:outline-none focus:border-primary/50 resize-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="trek-date" className="block text-[10px] font-black uppercase tracking-[0.18em] text-dark-muted mb-1.5">
                        Date *
                      </label>
                      <input
                        id="trek-date"
                        type="date"
                        value={newTrekDate}
                        onChange={(e) => setNewTrekDate(e.target.value)}
                        required
                        className="w-full p-3 bg-[#0D0D0D] border border-[#1E1E1E] text-dark-text text-sm focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label htmlFor="trek-capacity" className="block text-[10px] font-black uppercase tracking-[0.18em] text-dark-muted mb-1.5">
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
                        className="w-full p-3 bg-[#0D0D0D] border border-[#1E1E1E] text-dark-text text-sm focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-dark-muted mb-1.5">
                      Intensity Level
                    </span>
                    <div className="flex border border-[#1E1E1E] bg-[#0D0D0D]">
                      {['EASY', 'MODERATE', 'HARD', 'EXTREME'].map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setNewTrekDiff(diff)}
                          className={`flex-1 py-2.5 font-black text-[9px] uppercase tracking-[0.12em] border-r border-[#1E1E1E] last:border-r-0 transition-colors duration-100 focus:outline-none ${
                            newTrekDiff === diff
                              ? 'bg-primary text-dark-bg'
                              : 'text-dark-muted hover:text-dark-text bg-transparent'
                          }`}
                        >
                          {diff === 'MODERATE' ? 'MOD' : diff}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={createTrekMutation.isPending}
                    className="w-full py-4 bg-primary hover:bg-primary-hover text-dark-bg font-black text-[11px] uppercase tracking-[0.2em] transition-colors duration-150 mt-2 flex items-center justify-center gap-2 focus:outline-none disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    {createTrekMutation.isPending ? 'Publishing...' : 'Publish Gathering'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}