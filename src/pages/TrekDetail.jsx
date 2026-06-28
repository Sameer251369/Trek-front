import React, { useState } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { treksAPI, authAPI } from '../api';
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
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);

  // Queries
  const { data: trek, isLoading, isError } = useQuery({
    queryKey: ['trek', id],
    queryFn: () => treksAPI.get(id),
  });

  const isOrganizer = trek && currentUser && trek.organizer === currentUser.id;

  // Determine if user is a group administrator (organizer OR has structural ADMIN role)
  const isGroupAdmin = trek?.is_group_admin || isOrganizer || (trek?.members?.some(
    (member) => member.user === currentUser?.id && member.role === 'ADMIN'
  ));

  const hasAccess = trek?.is_member || isOrganizer;

  // Retrieve join requests if current user is organizer
  const { data: joinRequests = [] } = useQuery({
    queryKey: ['joinRequests', id],
    queryFn: () => treksAPI.listRequests(id),
    enabled: !!isOrganizer,
  });

  // Mutations for join request approvals
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
      queryClient.invalidateQueries({
        queryKey: ['trek', id],
      });
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

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment_status');
    const sessionId = params.get('session_id');

    if (paymentStatus === 'success' && sessionId) {
      setVerifyingPayment(true);
      confirmPaymentMutation.mutate(sessionId);
    } else if (paymentStatus === 'cancel') {
      setPaymentError('Payment was cancelled. You must pay to join this gathering.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [id]);

  // Mutation for updating group completion status
  const toggleCompletionMutation = useMutation({
    mutationFn: (newStatus) => treksAPI.update(id, { is_completed: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trek', id] });
    },
    onError: (err) => {
      alert(err.response?.data?.detail || 'Failed to update workshop completion status.');
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
    if (window.confirm('Delete this gathering permanently? This cannot be undone.')) {
      deleteGatheringMutation.mutate();
    }
  };

  if (isLoading || verifyingPayment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-9 h-9 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin" />
        {verifyingPayment && (
          <p className="text-xs font-bold uppercase tracking-widest text-primary animate-pulse">
            Verifying payment with Stripe...
          </p>
        )}
      </div>
    );
  }

  if (isError || !trek) {
    return (
      <div className="p-8 text-center rounded-[1.75rem] bg-red-500/[0.04] backdrop-blur-xl border border-red-400/20 text-red-300">
        <p>Failed to load trek workspace details. Ensure you are an approved member.</p>
      </div>
    );
  }

  if (trek && !hasAccess) {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-[1.75rem] bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary uppercase tracking-wide">
                  {trek.difficulty}
                </span>
                {trek.is_private && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-red-500/20 bg-red-500/10 text-red-400 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Private</span>
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold mt-3 text-dark-text">
                {trek.title}
              </h1>

              <p className="text-dark-muted mt-2">
                {trek.description}
              </p>
            </div>

            <div className="border-t border-white/[0.07] pt-4 space-y-2 text-dark-text">
              <p>
                <strong>Organizer:</strong> {trek.organizer_username}
              </p>

              <p>
                <strong>Date:</strong>{' '}
                {new Date(trek.date).toLocaleDateString()}
              </p>

              <p>
                <strong>Members:</strong>{' '}
                {trek.members_count} / {trek.capacity}
              </p>
            </div>

            {paymentError && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {trek.join_request_status === 'PENDING' ? (
              <button
                disabled
                className="w-full py-3.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 font-semibold"
              >
                Request Pending
              </button>
            ) : trek.join_request_status === 'REJECTED' ? (
              <button
                disabled
                className="w-full py-3.5 rounded-full bg-red-500/10 border border-red-400/20 text-red-300 font-semibold"
              >
                Request Rejected
              </button>
            ) : trek.capacity > 20 ? (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
                className="w-full py-3.5 rounded-full bg-primary text-dark-bg font-bold flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(232,255,0,0.2)]"
              >
                <Send className="w-4 h-4" />
                {checkoutMutation.isPending
                  ? 'Redirecting to Stripe...'
                  : 'Pay $10 to Join'}
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => joinRequestMutation.mutate()}
                disabled={joinRequestMutation.isPending}
                className="w-full py-3.5 rounded-full bg-primary text-dark-bg font-bold flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(232,255,0,0.2)]"
              >
                <Send className="w-4 h-4" />
                {joinRequestMutation.isPending
                  ? 'Sending Request...'
                  : 'Request To Join'}
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Workspace Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.01 }}
          className="rounded-[1.75rem] bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] p-5 text-left shadow-[0_15px_40px_rgba(0,0,0,0.25)]"
        >
          <h3 className="text-sm font-bold text-dark-text mb-3">Gathering Actions</h3>
          <div className="space-y-2">
            <button
              onClick={handleShareGathering}
              className="w-full py-2.5 px-4 rounded-full bg-primary text-dark-bg font-bold text-xs flex items-center justify-center gap-1.5 transition duration-150"
            >
              {copiedShare ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedShare ? 'Link Copied' : 'Share Gathering'}</span>
            </button>

            {isGroupAdmin && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={openEditModal}
                  className="py-2 px-3 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-dark-text font-semibold text-xs border border-white/[0.08] flex items-center justify-center gap-1.5 transition duration-150"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={handleDeleteGathering}
                  disabled={deleteGatheringMutation.isPending}
                  className="py-2 px-3 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-300 font-semibold text-xs border border-red-500/20 flex items-center justify-center gap-1.5 transition duration-150 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleteGatheringMutation.isPending ? 'Deleting...' : 'Delete'}</span>
                </button>
              </div>
            )}
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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
      {/* Sidebar - Group Info */}
      <div className="space-y-6 lg:col-span-1">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-[1.75rem] bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] p-5 text-left shadow-[0_15px_40px_rgba(0,0,0,0.25)]"
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary uppercase tracking-wide">
                  {trek.difficulty}
                </span>
                {trek.is_private && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-red-500/20 bg-red-500/10 text-red-400 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Private</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-dark-text tracking-tight mt-2">{trek.title}</h2>
              <p className="text-xs text-dark-muted mt-1 leading-relaxed">{trek.description}</p>
            </div>

            <div className="space-y-2.5 text-xs text-dark-muted border-t border-white/[0.07] pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Date: {new Date(trek.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>Capacity: {trek.members?.length} / {trek.capacity} joined</span>
              </div>
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-primary" />
                <span>Organizer: {trek.organizer_username}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Completion Block */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.02 }}
          className={`rounded-[1.75rem] border p-5 text-left shadow-[0_15px_40px_rgba(0,0,0,0.25)] ${trek.is_completed
              ? 'bg-green-500/[0.04] border-green-500/20'
              : 'bg-white/[0.04] border-white/[0.08]'
            }`}
        >
          <h3 className="text-sm font-bold text-dark-text mb-2.5 flex items-center gap-1.5">
            <CheckCircle2 className={`w-4.5 h-4.5 ${trek.is_completed ? 'text-green-400' : 'text-dark-muted'}`} />
            <span>Workshop Status</span>
          </h3>

          <div className="space-y-3">
            <p className="text-xs text-dark-muted leading-relaxed">
              {trek.is_completed
                ? "This workshop has been completed! Active members have received points and unlocked eligible badges."
                : "This workspace is currently active. Once finished, group administrators can mark it finalized."
              }
            </p>

            {isGroupAdmin && (
              <div className="pt-1">
                {trek.is_completed ? (
                  <button
                    onClick={() => toggleCompletionMutation.mutate(false)}
                    disabled={toggleCompletionMutation.isPending}
                    className="w-full py-2 px-4 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-dark-text font-semibold text-xs border border-white/[0.08] flex items-center justify-center gap-1.5 transition duration-150"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>{toggleCompletionMutation.isPending ? 'Processing...' : 'Mark as Incomplete'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => toggleCompletionMutation.mutate(true)}
                    disabled={toggleCompletionMutation.isPending}
                    className="w-full py-2 px-4 rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-300 font-bold text-xs border border-green-500/30 flex items-center justify-center gap-1.5 transition duration-150 shadow-[0_4px_12px_rgba(34,197,94,0.1)]"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{toggleCompletionMutation.isPending ? 'Processing...' : 'Mark Workshop Completed'}</span>
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
            className="rounded-[1.75rem] bg-white/[0.04] backdrop-blur-2xl border border-primary/15 p-5 text-left shadow-[0_15px_40px_rgba(0,0,0,0.25)]"
          >
            <h3 className="text-sm font-bold text-dark-text mb-3 flex items-center gap-1.5">
              <UserCheck className="w-4.5 h-4.5 text-primary" />
              <span>Pending Requests ({pendingRequests.length})</span>
            </h3>

            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.id} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/profile/${req.user}`}
                      className="flex items-center gap-2 group min-w-0"
                      title="View profile"
                    >
                      {req.profile_picture_url ? (
                        <img
                          src={req.profile_picture_url}
                          alt={req.username}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 ring-1 ring-white/10 text-primary flex items-center justify-center font-bold uppercase shrink-0">
                          {req.username ? req.username[0] : '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-dark-text group-hover:text-primary transition duration-150">
                          {req.username}
                        </p>
                        <p className="text-[10px] text-dark-muted uppercase font-semibold">
                          XP: {req.experience_level} • Rating: {req.rating}
                        </p>
                      </div>
                      <Eye className="w-3.5 h-3.5 text-dark-muted group-hover:text-primary transition duration-150 shrink-0" />
                    </Link>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequestMutation.mutate({ reqId: req.id, status: 'APPROVED' })}
                      className="flex-1 py-2 rounded-full bg-primary hover:bg-primary-hover text-dark-bg font-bold flex items-center justify-center gap-1 transition duration-150"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleRequestMutation.mutate({ reqId: req.id, status: 'REJECTED' })}
                      className="py-2 px-3 rounded-full bg-white/[0.05] hover:bg-red-500/10 hover:text-red-300 font-semibold border border-white/[0.07] flex items-center justify-center transition duration-150"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Member list */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="rounded-[1.75rem] bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] p-5 text-left shadow-[0_15px_40px_rgba(0,0,0,0.25)]"
        >
          <h3 className="text-sm font-bold text-dark-muted mb-3">Group Members</h3>
          <div className="space-y-3.5">
            {trek.members?.map((member) => (
              <div key={member.id} className="flex items-center justify-between text-xs border-b border-white/[0.05] pb-2.5 last:border-b-0 last:pb-0">
                <Link to={`/profile/${member.user}`} className="flex items-center gap-2 hover:text-primary transition duration-150">
                  {member.profile_picture_url ? (
                    <img
                      src={member.profile_picture_url}
                      alt={member.username}
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/10 ring-1 ring-white/10 flex items-center justify-center text-primary font-bold uppercase shrink-0">
                      {member.username[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-dark-text">{member.username}</p>
                    <p className="text-[9px] text-dark-muted uppercase font-bold">{member.experience_level}</p>
                  </div>
                </Link>
                <span className={`text-[9px] font-bold px-2 py-1 rounded-full border uppercase ${member.role === 'ADMIN'
                    ? 'border-yellow-400/20 bg-yellow-400/10 text-yellow-300'
                    : 'border-white/10 bg-white/[0.03] text-dark-muted'
                  }`}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Main Workspace Area (Tabs) */}
      <div className="lg:col-span-3 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-[1.25rem] bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Workspace</p>
            <h3 className="text-sm sm:text-base font-bold text-dark-text truncate">{trek.title}</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleShareGathering}
              className="px-4 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-dark-bg font-bold text-xs flex items-center justify-center gap-1.5 transition duration-150"
            >
              {copiedShare ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedShare ? 'Copied' : 'Share Gathering'}</span>
            </button>

            {isGroupAdmin && (
              <>
                <button
                  type="button"
                  onClick={openEditModal}
                  className="px-4 py-2.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-dark-text font-semibold text-xs border border-white/[0.08] flex items-center justify-center gap-1.5 transition duration-150"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteGathering}
                  disabled={deleteGatheringMutation.isPending}
                  className="px-4 py-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-300 font-semibold text-xs border border-red-500/20 flex items-center justify-center gap-1.5 transition duration-150 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleteGatheringMutation.isPending ? 'Deleting...' : 'Delete'}</span>
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* Workspace Tab Bar */}
        <div className="flex rounded-full bg-white/[0.03] backdrop-blur-xl border border-white/[0.07] p-1.5 gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-full transition-colors duration-200 shrink-0 focus:outline-none"
              >
                {isActive && (
                  <motion.span
                    layoutId="trekTabPill"
                    className="absolute inset-0 rounded-full bg-primary"
                    transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
                  />
                )}
                <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-dark-bg' : 'text-dark-muted'}`} />
                <span className={`relative z-10 ${isActive ? 'text-dark-bg' : 'text-dark-muted'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Panel render */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="min-h-[55vh]"
          >
            {activeTab === 'chat' && <ChatTab trekId={id} members={trek.members} />}
            {activeTab === 'map' && <MapTab trekId={id} checkpoints={trek.checkpoints} isOrganizer={isOrganizer} />}
            {activeTab === 'gear' && <EquipmentTab trekId={id} />}
            {activeTab === 'expenses' && <ExpenseTab trekId={id} members={trek.members} />}
            {activeTab === 'emergency' && <EmergencyTab trekId={id} trek={trek} />}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {isEditOpen && editForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setIsEditOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                className="w-full max-w-lg z-10 bg-[#0c0c0c]/95 border border-white/[0.08] rounded-[1.75rem] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
              >
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-dark-text">Edit gathering</h2>
                    <p className="text-xs text-dark-muted mt-1">Admins can update workspace settings.</p>
                  </div>
                  <button onClick={() => setIsEditOpen(false)} className="p-2 rounded-full bg-white/[0.04] text-dark-muted hover:text-dark-text">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {editError && (
                  <div className="mb-4 flex items-center gap-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {editError}
                  </div>
                )}

                <form onSubmit={handleEditSubmit} className="space-y-4 text-sm">
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    placeholder="Gathering title"
                    required
                    className="w-full px-4 py-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-dark-text focus:outline-none focus:border-primary/50"
                  />
                  <input
                    value={editForm.destination}
                    onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                    placeholder="Location"
                    className="w-full px-4 py-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-dark-text focus:outline-none focus:border-primary/50"
                  />
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Details"
                    required
                    rows="3"
                    className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-dark-text focus:outline-none focus:border-primary/50 resize-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-dark-text focus:outline-none focus:border-primary/50"
                    />
                    <input
                      type="number"
                      min="2"
                      max="100"
                      value={editForm.capacity}
                      onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-dark-text focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div className="flex rounded-full bg-white/[0.04] border border-white/[0.08] p-1 gap-1">
                    {['EASY', 'MODERATE', 'HARD', 'EXTREME'].map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, difficulty: diff })}
                        className={`flex-1 py-2 rounded-full font-bold text-[10px] ${editForm.difficulty === diff ? 'bg-primary text-dark-bg' : 'text-dark-muted'}`}
                      >
                        {diff === 'MODERATE' ? 'MOD' : diff}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-dark-muted font-semibold px-2">
                    <input
                      type="checkbox"
                      checked={editForm.is_private}
                      onChange={(e) => setEditForm({ ...editForm, is_private: e.target.checked })}
                      className="w-4 h-4"
                    />
                    Private gathering
                  </label>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-3 rounded-full border border-white/10 text-dark-text font-bold text-xs">
                      Cancel
                    </button>
                    <button type="submit" disabled={updateGatheringMutation.isPending} className="flex-1 py-3 rounded-full bg-primary text-dark-bg font-bold text-xs disabled:opacity-50">
                      {updateGatheringMutation.isPending ? 'Saving...' : 'Save Changes'}
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
