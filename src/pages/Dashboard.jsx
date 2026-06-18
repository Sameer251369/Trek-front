import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Users, Sliders, Search, AlertTriangle, Plus, X, ArrowRight, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { treksAPI } from '../api';


export default function Dashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');

  // Modal create states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTrekTitle, setNewTrekTitle] = useState('');
  const [newTrekDesc, setNewTrekDesc] = useState('');
  const [newTrekDate, setNewTrekDate] = useState('');
  const [newTrekCapacity, setNewTrekCapacity] = useState(10);
  const [newTrekDiff, setNewTrekDiff] = useState('MODERATE');
  const [newTrekDestination, setNewTrekDestination] = useState('');
  const [newTrekImage, setNewTrekImage] = useState(null);
  const [newTrekImagePreview, setNewTrekImagePreview] = useState(null);
  const [formError, setFormError] = useState(null);

  // Queries
  const { data: treks = [], isLoading, isError } = useQuery({
    queryKey: ['treks'],
    queryFn: treksAPI.list,
  });

  // Mutations
  const createTrekMutation = useMutation({
    mutationFn: treksAPI.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['treks'] });
      setIsModalOpen(false);
      // Reset form
      setNewTrekTitle('');
      setNewTrekDesc('');
      setNewTrekDate('');
      setNewTrekCapacity(10);
      setNewTrekDiff('MODERATE');
      setNewTrekDestination('');
      setNewTrekImage(null);
      setNewTrekImagePreview(null);
      setFormError(null);
      // Redirect to the new workspace!
      navigate(`/trek/${data.id}`);
    },
    onError: (err) => {
      setFormError(err.response?.data?.detail || Object.values(err.response?.data || {}).join(' ') || 'Failed to create group.');
    }
  });

  const joinRequestMutation = useMutation({
    mutationFn: treksAPI.requestJoin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treks'] });
    },
    onError: (err) => {
      alert(err.response?.data?.[0] || err.response?.data?.detail || 'Request to join failed.');
    }
  });

  // Filter list
  const filteredTreks = treks.filter(trek => {
    const matchesSearch = trek.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          trek.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDiff = selectedDifficulty === 'ALL' || trek.difficulty === selectedDifficulty;
    return matchesSearch && matchesDiff;
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    if (!newTrekTitle || !newTrekDesc || !newTrekDate || !newTrekCapacity) {
      setFormError('Please fill out all fields.');
      return;
    }
    createTrekMutation.mutate({
      title: newTrekTitle,
      description: newTrekDesc,
      destination: newTrekDestination,
      date: newTrekDate,
      capacity: parseInt(newTrekCapacity),
      difficulty: newTrekDiff,
      ...(newTrekImage ? { destination_image: newTrekImage } : {}),
    });
  };

  const getDifficultyColor = (diff) => {
    switch(diff) {
      case 'EASY': return 'bg-green-500/10 text-green-400 border border-green-500/20';
      case 'MODERATE': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      case 'HARD': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'EXTREME': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden py-12 px-8 sm:px-12 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-dark-border/40 bg-gradient-to-r from-dark-card via-dark-card to-primary/5">
        <div className="space-y-2 max-w-xl">
          <span className="text-primary font-bold text-xs uppercase tracking-widest">Adventure Network</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-dark-text">Find Trekking Companions</h1>
          <p className="text-dark-muted text-sm sm:text-base">
            Create groups, map out water checkpoints, assign equipment, divide campsite costs, and chat securely with local trekkers.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="shrink-0 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-dark-bg font-extrabold px-6 py-3.5 rounded-xl transition duration-200 shadow-lg shadow-primary/20 text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Organize Expedition</span>
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between glass-panel p-4 rounded-xl border border-dark-border/20">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-dark-muted" />
          <input 
            type="text" 
            placeholder="Search treks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-dark-text text-sm focus:outline-none focus:border-primary"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Sliders className="w-4.5 h-4.5 text-dark-muted hidden sm:block" />
          <select 
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-dark-text text-sm focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MODERATE">Moderate</option>
            <option value="HARD">Hard</option>
            <option value="EXTREME">Extreme</option>
          </select>
        </div>
      </div>

      {/* Expedition Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-64 rounded-xl bg-dark-card/50 border border-dark-border/30 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 text-center glass-panel rounded-xl border border-red-500/20 text-red-400">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3" />
          <p>Failed to retrieve active expeditions. Please ensure your backend server is running.</p>
        </div>
      ) : filteredTreks.length === 0 ? (
        <div className="p-16 text-center glass-panel rounded-2xl border border-dark-border/20 text-dark-muted">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-55" />
          <h3 className="text-lg font-bold text-dark-text mb-1">No Expeditions Found</h3>
          <p className="text-sm">Be the first to host a trek by clicking "Organize Expedition" above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTreks.map((trek) => {
            return (
              <div 
                key={trek.id} 
                className="glass-panel rounded-xl flex flex-col justify-between border border-dark-border/30 hover:border-primary/30 transition duration-300 relative group overflow-hidden"
              >
                {/* Destination cover image */}
                {trek.destination_image_url ? (
                  <div className="h-36 w-full overflow-hidden">
                    <img
                      src={trek.destination_image_url}
                      alt={trek.destination || trek.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                ) : (
                  <div className="h-20 w-full bg-gradient-to-br from-primary/10 to-dark-bg border-b border-dark-border/20" />
                )}

                <div className="p-6 flex flex-col flex-1">
                {/* Micro glow line */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-transparent group-hover:bg-primary/20 transition duration-300" />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${getDifficultyColor(trek.difficulty)}`}>
                      {trek.difficulty}
                    </span>
                    <span className="text-xs text-dark-muted flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(trek.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  <div>
                    {trek.destination && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">{trek.destination}</p>
                    )}
                    <h3 className="text-lg font-bold text-dark-text leading-snug group-hover:text-primary transition duration-200">
                      {trek.title}
                    </h3>
                    <p className="text-dark-muted text-sm line-clamp-3 mt-1.5 leading-relaxed">
                      {trek.description}
                    </p>
                  </div>
                </div>

                <div className="border-t border-dark-border/35 pt-4 mt-6 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-dark-muted">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      <User className="w-3 h-3" />
                    </div>
                    <span>By {trek.organizer_username}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-dark-muted">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="font-semibold">{trek.members_count} / {trek.capacity}</span>
                  </div>
                </div>

                <div className="mt-5">
                  {trek.is_member ? (
                    <Link 
                      to={`/trek/${trek.id}`}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-dark-bg font-bold rounded-lg border border-primary/20 transition duration-250"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : trek.join_request_status === 'PENDING' ? (
                    <button 
                      disabled
                      className="w-full py-2.5 bg-dark-border/30 text-dark-muted font-bold rounded-lg border border-dark-border/40 cursor-not-allowed text-center"
                    >
                      Pending Approval
                    </button>
                  ) : trek.join_request_status === 'REJECTED' ? (
                    <button 
                      disabled
                      className="w-full py-2.5 bg-red-950/10 text-red-400 font-bold rounded-lg border border-red-950/20 cursor-not-allowed text-center"
                    >
                      Request Rejected
                    </button>
                  ) : (
                    <button 
                      onClick={() => joinRequestMutation.mutate(trek.id)}
                      disabled={joinRequestMutation.isPending}
                      className="w-full py-2.5 bg-primary hover:bg-primary-hover text-dark-bg font-bold rounded-lg transition duration-200"
                    >
                      Request to Join
                    </button>
                  )}
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Organize Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-dark-bg/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg glass-panel p-6 sm:p-8 rounded-2xl shadow-2xl z-10 relative border border-dark-border/50 bg-dark-card"
          >
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-dark-muted hover:text-dark-text p-1.5 hover:bg-dark-border/20 rounded-lg transition duration-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-dark-text mb-1">Organize New Trek</h2>
            <p className="text-xs text-dark-muted mb-6">Create the trekking group, specify capacity limits and date to get started.</p>

            {formError && (
              <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-1.5">Trek Title</label>
                <input 
                  type="text" 
                  value={newTrekTitle}
                  onChange={(e) => setNewTrekTitle(e.target.value)}
                  placeholder="Kudremukh Expedition"
                  required
                  className="w-full p-2.5 rounded-lg glass-input text-dark-text"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-1.5">Destination</label>
                <input 
                  type="text" 
                  value={newTrekDestination}
                  onChange={(e) => setNewTrekDestination(e.target.value)}
                  placeholder="Kudremukh Peak, Karnataka"
                  className="w-full p-2.5 rounded-lg glass-input text-dark-text"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-1.5">Destination Image (optional)</label>
                {newTrekImagePreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-dark-border/40">
                    <img src={newTrekImagePreview} alt="Preview" className="w-full h-32 object-cover" />
                    <button
                      type="button"
                      onClick={() => { setNewTrekImage(null); setNewTrekImagePreview(null); }}
                      className="absolute top-2 right-2 p-1 bg-dark-bg/80 rounded-full text-dark-muted hover:text-dark-text"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewTrekImage(file);
                        setNewTrekImagePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="w-full text-sm text-dark-muted file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-bold"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-1.5">Description & Itinerary Summary</label>
                <textarea 
                  value={newTrekDesc}
                  onChange={(e) => setNewTrekDesc(e.target.value)}
                  placeholder="Hike details, campsite points, altitude levels..."
                  rows="3"
                  required
                  className="w-full p-2.5 rounded-lg glass-input text-dark-text"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-1.5">Date</label>
                  <input 
                    type="date" 
                    value={newTrekDate}
                    onChange={(e) => setNewTrekDate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg glass-input text-dark-text"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-1.5">Capacity (people)</label>
                  <input 
                    type="number" 
                    value={newTrekCapacity}
                    onChange={(e) => setNewTrekCapacity(e.target.value)}
                    min="2"
                    max="50"
                    required
                    className="w-full p-2.5 rounded-lg glass-input text-dark-text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-dark-muted mb-1.5">Difficulty Level</label>
                <div className="grid grid-cols-4 gap-2">
                  {['EASY', 'MODERATE', 'HARD', 'EXTREME'].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setNewTrekDiff(diff)}
                      className={`py-2 rounded-lg border font-bold text-xs uppercase tracking-wide transition duration-150 ${
                        newTrekDiff === diff 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-dark-border text-dark-muted hover:border-dark-border/80'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={createTrekMutation.isPending}
                className="w-full py-3.5 bg-primary hover:bg-primary-hover text-dark-bg font-extrabold rounded-xl transition duration-200 mt-4 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-sm"
              >
                {createTrekMutation.isPending ? 'Publishing...' : 'Publish Expedition'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
