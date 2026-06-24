import React, { useState, } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  Send
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
  const queryClient = useQueryClient();
  const currentUser = authAPI.getCurrentUser();
  const [activeTab, setActiveTab] = useState('chat');

  // Queries
  const { data: trek, isLoading, isError } = useQuery({
    queryKey: ['trek', id],
    queryFn: () => treksAPI.get(id),
  });


  const isOrganizer = trek && currentUser && trek.organizer === currentUser.id;
  const hasAccess =
  trek?.is_member ||
  isOrganizer;

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



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-9 h-9 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin" />
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
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary uppercase tracking-wide">
              {trek.difficulty}
            </span>

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
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary uppercase tracking-wide">
                {trek.difficulty}
              </span>
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
                      className="flex items-center gap-1.5 group"
                      title="View profile"
                    >
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
                <span className={`text-[9px] font-bold px-2 py-1 rounded-full border uppercase ${
                  member.role === 'ADMIN'
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
      </div>
    </div>
  );
}