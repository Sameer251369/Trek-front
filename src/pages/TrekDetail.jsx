import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Map,
  Briefcase,
  DollarSign,
  ShieldAlert,
  Users,
  Calendar,
  Compass,
  UserCheck,
  Check,
  X,
  AlertCircle,
  Eye,
  Send,
  CheckCircle2,
  Undo2,
  Lock,
  Share2,
  Edit2,
  Trash2,
  AlertTriangle,
  MoreVertical,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { treksAPI, authAPI, fixMediaUrl } from '../api';
import ChatTab from '../components/ChatTab';
import MapTab from '../components/MapTab';
import EquipmentTab from '../components/EquipmentTab';
import ExpenseTab from '../components/ExpenseTab';
import EmergencyTab from '../components/EmergencyTab';

export default function TrekDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = authAPI.getCurrentUser();
  const [activeTab, setActiveTab] = useState('chat');

  // Defer state setting out of useEffect by reading from URL params on construction
  const getInitialPaymentState = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      verifying: params.get('payment_status') === 'success' && !!params.get('session_id'),
      error: params.get('payment_status') === 'cancel' ? 'Payment was cancelled. You must pay to join this gathering.' : null
    };
  };

  const initialPaymentState = getInitialPaymentState();
  const [verifyingPayment, setVerifyingPayment] = useState(initialPaymentState.verifying);
  const [paymentError, setPaymentError] = useState(initialPaymentState.error);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const workspaceMenuRef = useRef(null);
  const membersMenuRef = useRef(null);

  // Queries
  const { data: trek, isLoading, isError } = useQuery({
    queryKey: ['trek', id],
    queryFn: () => treksAPI.get(id),
  });

  const isOrganizer = trek && currentUser && trek.organizer === currentUser.id;
  const isGroupAdmin = trek?.is_group_admin || isOrganizer || (trek?.members?.some(
    (member) => member.user === currentUser?.id && member.role === 'ADMIN'
  ));
  const hasAccess = trek?.is_member || isOrganizer;

  const { data: joinRequests = [] } = useQuery({
    queryKey: ['joinRequests', id],
    queryFn: () => treksAPI.listRequests(id),
    enabled: !!isOrganizer,
  });

  // Mutations
  const handleRequestMutation = useMutation({
    mutationFn: ({ reqId, status }) => treksAPI.updateRequest(reqId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['joinRequests', id] });
      queryClient.invalidateQueries({ queryKey: ['trek', id] });
    },
    onError: (err) => {
      alert(err.response?.data?.[0] || 'Action failed.');
    }
  });

  const joinRequestMutation = useMutation({
    mutationFn: () => treksAPI.requestJoin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trek', id] });
    },
    onError: (err) => {
      alert(
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        'Group already filled.'
      );
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: () => treksAPI.checkout(id, `${window.location.origin}/trek/${id}/`),
    onSuccess: (data) => {
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    },
    onError: (err) => {
      alert(err.response?.data?.detail || 'Failed to initiate Stripe checkout.');
    }
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: (sessionId) => treksAPI.confirmPayment(id, sessionId),
    onSuccess: () => {
      setVerifyingPayment(false);
      window.history.replaceState({}, document.title, window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ['trek', id] });
    },
    onError: (err) => {
      setVerifyingPayment(false);
      setPaymentError(err.response?.data?.detail || 'Payment verification failed.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });

  const updateGatheringMutation = useMutation({
    mutationFn: (formData) => treksAPI.update(id, formData),
    onSuccess: () => {
      setIsEditOpen(false);
      setEditError(null);
      queryClient.invalidateQueries({ queryKey: ['trek', id] });
      queryClient.invalidateQueries({ queryKey: ['treks'] });
    },
    onError: (err) => {
      setEditError(err.response?.data?.detail || 'Failed to update gathering.');
    }
  });

  const deleteGatheringMutation = useMutation({
    mutationFn: () => treksAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treks'] });
      navigate('/');
    },
    onError: (err) => {
      alert(err.response?.data?.detail || 'Failed to delete gathering.');
    }
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment_status');
    const sessionId = params.get('session_id');

    if (paymentStatus === 'success' && sessionId) {
      confirmPaymentMutation.mutate(sessionId);
    } else if (paymentStatus === 'cancel') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [id, confirmPaymentMutation]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target)) {
        setIsWorkspaceMenuOpen(false);
      }
      if (membersMenuRef.current && !membersMenuRef.current.contains(event.target)) {
        setIsMembersOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const toggleCompletionMutation = useMutation({
    mutationFn: (newStatus) => treksAPI.update(id, { is_completed: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trek', id] });
    },
    onError: (err) => {
      alert(err.response?.data?.detail || 'Failed to update completion status.');
    }
  });

  const handleShareGathering = async () => {
    const url = `${window.location.origin}/trek/${id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedShare(true);
    setIsWorkspaceMenuOpen(false);
    setTimeout(() => setCopiedShare(false), 1800);
  };

  const openEditModal = () => {
    setEditForm({
      title: trek.title || '',
      description: trek.description || '',
      destination: trek.destination || '',
      date: trek.date ? trek.date.split('T')[0] : '',
      capacity: String(trek.capacity || 2),
      difficulty: trek.difficulty || 'MODERATE',
      is_private: !!trek.is_private,
    });
    setEditError(null);
    setIsEditOpen(true);
    setIsWorkspaceMenuOpen(false);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setEditError(null);
    const formData = new FormData();
    Object.entries(editForm).forEach(([key, value]) => {
      formData.append(key, value);
    });
    updateGatheringMutation.mutate(formData);
  };

  const handleDeleteGathering = () => {
    setIsWorkspaceMenuOpen(false);
    if (window.confirm('Delete this gathering permanently? This cannot be undone.')) {
      deleteGatheringMutation.mutate();
    }
  };

  if (isLoading || verifyingPayment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 font-mono text-xs">
        <div className="w-8 h-8 border border-primary border-t-transparent animate-spin" />
        {verifyingPayment && (
          <p className="text-primary font-bold uppercase tracking-wider animate-pulse">
            SYS // Confirming secure Stripe token transfer...
          </p>
        )}
      </div>
    );
  }

  if (isError || !trek) {
    return (
      <div className="p-8 text-center bg-red-500/[0.03] border border-red-500/20 text-red-400 font-mono text-xs uppercase">
        SYS_ERR // Access denied. Ensure you are an approved member.
      </div>
    );
  }

  if (trek && !hasAccess) {
    return (
      <div className="max-w-xl mx-auto font-mono text-xs text-left">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border border-[#1C1C1E] bg-[#0A0A0C] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-none"
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 border-b border-[#1C1C1E] pb-3 mb-3">
                <span className="text-[9px] font-bold px-2 py-0.5 border border-primary/20 bg-primary/5 text-primary uppercase">
                  {trek.difficulty}
                </span>
                {trek.is_private && (
                  <span className="text-[9px] font-bold px-2 py-0.5 border border-red-500/20 bg-red-500/5 text-red-400 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>PVT</span>
                  </span>
                )}
                <span className="ml-auto text-[9px] text-dark-muted">GATHERING_LOCK</span>
              </div>

              <h1 className="text-lg font-bold text-dark-text uppercase tracking-wide font-sans">
                {trek.title}
              </h1>

              <p className="text-dark-muted mt-2 leading-relaxed font-sans text-[11px]">
                {trek.description}
              </p>
            </div>

            <div className="border-t border-[#1C1C1E]/60 pt-4 space-y-2 text-dark-text">
              <p>
                <strong>ORGANIZER:</strong> {trek.organizer_username}
              </p>
              <p>
                <strong>DATE:</strong> {new Date(trek.date).toISOString().split('T')[0]}
              </p>
              <p>
                <strong>MEMBERS REGISTERED:</strong> {trek.members_count} / {trek.capacity}
              </p>
            </div>

            {paymentError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <div className="pt-2">
              {trek.join_request_status === 'PENDING' ? (
                <button
                  disabled
                  className="w-full py-3 bg-[#000000] border border-[#1C1C1E] text-yellow-400/70 font-bold uppercase tracking-wider cursor-not-allowed rounded-none"
                >
                  REQUEST_PENDING_APPROVAL
                </button>
              ) : trek.join_request_status === 'REJECTED' ? (
                <button
                  disabled
                  className="w-full py-3 bg-transparent border border-red-500/20 text-red-400/50 font-bold uppercase tracking-wider cursor-not-allowed rounded-none"
                >
                  LINK_REJECTED
                </button>
              ) : trek.capacity > 20 ? (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => checkoutMutation.mutate()}
                  disabled={checkoutMutation.isPending}
                  className="w-full py-3 bg-primary text-dark-bg font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition duration-150 uppercase tracking-widest rounded-none"
                >
                  <Send className="w-3.5 h-3.5" />
                  {checkoutMutation.isPending ? 'REDIRECTING TO STRIPE...' : 'PAY $10 TO JOIN'}
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => joinRequestMutation.mutate()}
                  disabled={joinRequestMutation.isPending}
                  className="w-full py-3 bg-primary text-dark-bg font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition duration-150 uppercase tracking-widest rounded-none"
                >
                  <Send className="w-3.5 h-3.5" />
                  {joinRequestMutation.isPending ? 'SENDING REQUEST...' : 'REQUEST TO JOIN'}
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const pendingRequests = joinRequests.filter(req => req.status === 'PENDING');

  const tabs = [
    { id: 'chat', label: 'Squad Chat', icon: MessageSquare },
    { id: 'map', label: 'Route Planner', icon: Map },
    { id: 'gear', label: 'Belongings', icon: Briefcase },
    { id: 'expenses', label: 'Expense Splitter', icon: DollarSign },
    { id: 'emergency', label: 'Emergency', icon: ShieldAlert },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start font-mono text-xs text-left">
      {/* Sidebar - Group Info */}
      <div className="space-y-6 lg:col-span-1">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative border border-[#1C1C1E] bg-[#0A0A0C] p-5 shadow-[0_15px_40px_rgba(0,0,0,0.6)] rounded-none"
        >
          {/* Action Menu */}
          <div className="absolute right-4 top-4 z-20" ref={workspaceMenuRef}>
            <button
              type="button"
              onClick={() => setIsWorkspaceMenuOpen((open) => !open)}
              className="h-8 w-8 bg-[#000000] border border-[#1C1C1E] text-dark-muted hover:text-primary flex items-center justify-center transition duration-150 rounded-none"
              title="Workspace actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {isWorkspaceMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -4 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-full mt-1.5 w-48 bg-[#0A0A0C] border border-[#1C1C1E] shadow-2xl p-1 z-50 rounded-none"
                >
                  <button
                    type="button"
                    onClick={handleShareGathering}
                    className="w-full px-3 py-2 text-[10px] font-bold text-dark-muted hover:text-primary hover:bg-[#E8FF00]/5 transition-colors flex items-center justify-between uppercase"
                  >
                    <span className="flex items-center gap-2">
                      <Share2 className="w-3.5 h-3.5" />
                      {copiedShare ? 'Copied' : 'Share Workspace'}
                    </span>
                    {copiedShare && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>

                  {isGroupAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={openEditModal}
                        className="w-full px-3 py-2 border-t border-[#1C1C1E]/50 mt-1 pt-2 text-[10px] font-bold text-dark-muted hover:text-primary hover:bg-[#E8FF00]/5 transition-colors flex items-center gap-2 uppercase"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Modify Settings
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteGathering}
                        disabled={deleteGatheringMutation.isPending}
                        className="w-full px-3 py-2 border-t border-[#1C1C1E]/50 mt-1 pt-2 text-[10px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/15 transition-colors flex items-center gap-2 disabled:opacity-50 uppercase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deleteGatheringMutation.isPending ? 'TERMINATING...' : 'Terminate Link'}
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4">
            <div className="pr-8">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold px-2 py-0.5 border border-primary/20 bg-primary/5 text-primary uppercase">
                  {trek.difficulty}
                </span>
                {trek.is_private && (
                  <span className="text-[9px] font-bold px-2 py-0.5 border border-red-500/20 bg-red-500/5 text-red-400">
                    PVT
                  </span>
                )}
              </div>
              <h2 className="text-sm font-bold text-dark-text tracking-wide mt-2.5 font-sans uppercase">{trek.title}</h2>
              <p className="text-xs text-dark-muted mt-1 leading-relaxed font-sans">{trek.description}</p>
            </div>

            <div className="space-y-2.5 text-xs text-dark-muted border-t border-[#1C1C1E] pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Date: {new Date(trek.date).toISOString().split('T')[0]}</span>
              </div>

              <div className="relative" ref={membersMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMembersOpen((open) => !open)}
                  className="w-full h-10 px-3 bg-[#000000] hover:bg-[#E8FF00]/5 border border-[#1C1C1E] text-dark-text font-bold text-xs flex items-center gap-2 transition duration-150 rounded-none focus:outline-none"
                  title="Group members"
                >
                  <Users className="w-4 h-4 text-primary shrink-0" />
                  <span className="flex-1 text-left uppercase text-[10px]">Registered Members</span>
                  <span className="px-1.5 py-0.5 bg-primary/10 text-primary font-bold">
                    {trek.members?.length || 0}/{trek.capacity}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-dark-muted transition-transform shrink-0 ${isMembersOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isMembersOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: -4 }}
                      transition={{ duration: 0.1 }}
                      className="absolute left-0 top-full mt-1.5 w-full max-h-80 overflow-y-auto bg-[#0A0A0C] border border-[#1C1C1E] shadow-2xl p-2 z-50 rounded-none font-mono"
                    >
                      <div className="px-2.5 py-2 flex items-center justify-between border-b border-[#1C1C1E]/50 mb-1 text-[9px] uppercase tracking-wider text-dark-muted font-bold">
                        <span>Squad Registers</span>
                        <span>{trek.members?.length || 0} / {trek.capacity}</span>
                      </div>
                      <div className="space-y-1">
                        {trek.members?.map((member) => (
                          <Link
                            key={member.id}
                            to={`/profile/${member.user}`}
                            onClick={() => setIsMembersOpen(false)}
                            className="flex items-center justify-between gap-3 px-2 py-1.5 hover:bg-[#E8FF00]/5 border-b border-transparent hover:border-[#1C1C1E] transition duration-150 no-underline"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {member.profile_picture_url ? (
                                <img
                                  src={fixMediaUrl(member.profile_picture_url)}
                                  alt={member.username}
                                  className="w-7 h-7 rounded-none object-cover border border-[#1C1C1E] shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 bg-[#000000] border border-[#1C1C1E] flex items-center justify-center text-primary font-bold uppercase shrink-0">
                                  {member.username ? member.username[0] : '?'}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-dark-text truncate font-sans uppercase">{member.username}</p>
                                <p className="text-[8px] text-dark-muted uppercase font-bold truncate">{member.experience_level}</p>
                              </div>
                            </div>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 border uppercase shrink-0 ${member.role === 'ADMIN'
                                ? 'border-primary/30 bg-primary/5 text-primary'
                                : 'border-[#1C1C1E] bg-[#000000] text-dark-muted'
                              }`}>
                              {member.role}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-primary" />
                <span>ORGANIZER: {trek.organizer_username}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Completion Block */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.02 }}
          className={`border p-5 text-left shadow-[0_15px_40px_rgba(0,0,0,0.6)] rounded-none ${trek.is_completed
              ? 'bg-green-950/5 border-green-500/20'
              : 'bg-[#0A0A0C] border-[#1C1C1E]'
            }`}
        >
          <h3 className="text-xs font-bold text-dark-text mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
            <CheckCircle2 className={`w-4 h-4 ${trek.is_completed ? 'text-primary animate-pulse' : 'text-dark-muted'}`} />
            <span>Telemetry Status</span>
          </h3>

          <div className="space-y-3">
            <p className="text-xs text-dark-muted leading-relaxed font-sans text-[11px]">
              {trek.is_completed
                ? "This gathering has been finalized. System metrics have compiled points and rewards to squad profile registers."
                : "This workspace is currently active. Once finished, group administrators can mark it closed."
              }
            </p>

            {isGroupAdmin && (
              <div className="pt-1">
                {trek.is_completed ? (
                  <button
                    onClick={() => toggleCompletionMutation.mutate(false)}
                    disabled={toggleCompletionMutation.isPending}
                    className="w-full py-2 bg-[#000000] hover:bg-[#E8FF00]/5 text-dark-text hover:text-primary font-bold text-xs border border-[#1C1C1E] flex items-center justify-center gap-1.5 transition duration-150 rounded-none"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>{toggleCompletionMutation.isPending ? 'PROCESSING...' : 'REOPEN WORKSPACE'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => toggleCompletionMutation.mutate(true)}
                    disabled={toggleCompletionMutation.isPending}
                    className="w-full py-2 bg-primary hover:bg-primary-hover text-dark-bg font-extrabold text-xs border border-transparent flex items-center justify-center gap-1.5 transition duration-150 rounded-none uppercase tracking-wider"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{toggleCompletionMutation.isPending ? 'PROCESSING...' : 'CLOSE GATHERING'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Admin Request Approvals */}
        {isOrganizer && pendingRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="bg-[#0A0A0C] border border-primary/20 p-5 text-left shadow-[0_15px_40px_rgba(0,0,0,0.6)] rounded-none"
          >
            <h3 className="text-xs font-bold text-dark-text mb-3 flex items-center gap-1.5 uppercase tracking-wider">
              <UserCheck className="w-4 h-4 text-primary animate-pulse" />
              <span>Squad Requests ({pendingRequests.length})</span>
            </h3>

            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.id} className="p-3 bg-[#000000] border border-[#1C1C1E] text-xs flex flex-col gap-2.5 rounded-none">
                  <div className="flex items-center justify-between gap-2 border-b border-[#1C1C1E]/60 pb-2">
                    <Link
                      to={`/profile/${req.user}`}
                      className="flex items-center gap-2 group min-w-0 no-underline"
                      title="View profile"
                    >
                      {req.profile_picture_url ? (
                        <img
                          src={req.profile_picture_url}
                          alt={req.username}
                          className="w-7 h-7 rounded-none object-cover border border-[#1C1C1E] shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 bg-[#111] border border-[#1C1C1E] text-primary flex items-center justify-center font-bold uppercase shrink-0">
                          {req.username ? req.username[0] : '?'}
                        </div>
                      )}
                      <div className="min-w-0 text-left">
                        <p className="font-bold text-dark-text group-hover:text-primary transition duration-150 truncate font-sans uppercase">
                          {req.username}
                        </p>
                        <p className="text-[8px] text-dark-muted font-bold">
                          XP: {req.experience_level} • RT: {req.rating}
                        </p>
                      </div>
                      <Eye className="w-3 h-3 text-dark-muted group-hover:text-primary transition duration-150 shrink-0 ml-1" />
                    </Link>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequestMutation.mutate({ reqId: req.id, status: 'APPROVED' })}
                      className="flex-1 py-1.5 bg-primary hover:bg-primary-hover text-dark-bg font-bold flex items-center justify-center gap-1 transition duration-150 rounded-none uppercase text-[10px]"
                    >
                      <Check className="w-3 h-3" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleRequestMutation.mutate({ reqId: req.id, status: 'REJECTED' })}
                      className="py-1.5 px-2 bg-transparent border border-[#1C1C1E] text-dark-muted hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 font-bold flex items-center justify-center transition duration-150 rounded-none"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>

      {/* Main Workspace Area (Tabs) */}
      <div className="lg:col-span-3 space-y-6">
        {/* Workspace Tab Bar */}
        <div className="flex bg-[#0A0A0C] border border-[#1C1C1E] p-1 gap-1 overflow-x-auto rounded-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-colors duration-150 shrink-0 focus:outline-none rounded-none uppercase ${
                  isActive ? 'bg-primary text-dark-bg' : 'text-dark-muted hover:text-dark-text bg-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Panel render */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="min-h-[55vh]"
          >
            {activeTab === 'chat' && <ChatTab trekId={id} members={trek.members} />}
            {activeTab === 'map' && <MapTab trekId={id} checkpoints={trek.checkpoints} isOrganizer={isOrganizer} />}
            {activeTab === 'gear' && <EquipmentTab trekId={id} />}
            {activeTab === 'expenses' && <ExpenseTab trekId={id} members={trek.members} />}
            {activeTab === 'emergency' && <EmergencyTab trekId={id} trek={trek} />}
          </motion.div>
        </AnimatePresence>

        {/* Edit Gathering Modal */}
        <AnimatePresence>
          {isEditOpen && editForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 font-mono text-xs">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/85"
                onClick={() => setIsEditOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="w-full max-w-lg z-10 bg-[#0A0A0C] border border-[#1C1C1E] p-6 shadow-[0_30px_70px_rgba(0,0,0,0.9)] rounded-none"
              >
                <div className="flex items-start justify-between mb-5 border-b border-[#1C1C1E] pb-3 bg-[#050505] -mx-6 px-6 -mt-6 pt-5">
                  <div>
                    <h2 className="text-xs font-bold text-dark-text uppercase tracking-wider">Modify Gathering</h2>
                    <p className="text-[9px] text-dark-muted mt-1 uppercase">Coordinator settings adjustment workspace.</p>
                  </div>
                  <button onClick={() => setIsEditOpen(false)} className="p-1 border border-[#1C1C1E] bg-[#000000] text-dark-muted hover:text-primary rounded-none">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {editError && (
                  <div className="mb-4 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] uppercase">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {editError}
                  </div>
                )}

                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">[01] Title *</label>
                    <input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="Gathering title"
                      required
                      className="w-full px-4 py-3 bg-[#000000] border border-[#1C1C1E] text-dark-text focus:outline-none focus:border-primary rounded-none font-sans text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">[02] Location / Coordinates</label>
                    <input
                      value={editForm.destination}
                      onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                      placeholder="Location"
                      className="w-full px-4 py-3 bg-[#000000] border border-[#1C1C1E] text-dark-text focus:outline-none focus:border-primary rounded-none font-sans text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">[03] Details *</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Details"
                      required
                      rows="3"
                      className="w-full px-4 py-3 bg-[#000000] border border-[#1C1C1E] text-dark-text focus:outline-none focus:border-primary resize-none rounded-none font-sans text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">[04] Date *</label>
                      <input
                        type="date"
                        value={editForm.date}
                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                        required
                        className="w-full px-4 py-3 bg-[#000000] border border-[#1C1C1E] text-dark-text focus:outline-none focus:border-primary rounded-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">[05] Capacity *</label>
                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={editForm.capacity}
                        onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                        required
                        className="w-full px-4 py-3 bg-[#000000] border border-[#1C1C1E] text-dark-text focus:outline-none focus:border-primary rounded-none"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-dark-muted mb-1.5">[06] Intensity Category</span>
                    <div className="flex bg-[#000000] border border-[#1C1C1E] p-1 gap-1 rounded-none">
                      {['EASY', 'MODERATE', 'HARD', 'EXTREME'].map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, difficulty: diff })}
                          className={`flex-1 py-2 rounded-none font-bold text-[9px] uppercase tracking-wider transition-colors duration-150 focus:outline-none ${
                            editForm.difficulty === diff ? 'bg-primary text-dark-bg' : 'text-dark-muted hover:text-dark-text'
                          }`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 py-1 px-1">
                    <input
                      id="edit-is-private"
                      type="checkbox"
                      checked={editForm.is_private}
                      onChange={(e) => setEditForm({ ...editForm, is_private: e.target.checked })}
                      className="border-[#1C1C1E] bg-[#000000] text-primary focus:ring-transparent w-4 h-4 cursor-pointer rounded-none"
                    />
                    <label htmlFor="edit-is-private" className="text-[10px] font-bold text-dark-muted cursor-pointer select-none uppercase">
                      Restrict Access (Make private)
                    </label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-3 bg-transparent border border-[#333] text-dark-muted hover:text-dark-text font-bold text-xs uppercase tracking-wider rounded-none">
                      CANCEL
                    </button>
                    <button type="submit" disabled={updateGatheringMutation.isPending} className="flex-1 py-3 bg-primary hover:bg-primary-hover text-dark-bg font-bold text-xs uppercase tracking-wider rounded-none disabled:opacity-40">
                      {updateGatheringMutation.isPending ? 'SAVING...' : 'SAVE CHANGES'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}