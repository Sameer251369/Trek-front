import React, { useState } from 'react';
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
  const [activeTab, useState] = useState('chat');

  // Queries
  const { data: trek, isLoading, isError } = useQuery({
    queryKey: ['trek', id],
    queryFn: () => treksAPI.get(id),
  });

  const isOrganizer = trek && currentUser && trek.organizer === currentUser.id;
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
        'Failed to send join request.'
      );
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-neutral-200 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !trek) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-red-200 text-red-600 shadow-sm max-w-2xl mx-auto">
        <AlertCircle className="w-5 h-5 mx-auto mb-2 text-red-500" />
        <p className="text-sm font-medium tracking-tight">Failed to load trek workspace details. Ensure you are an approved member.</p>
      </div>
    );
  }

  if (trek && !hasAccess) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-neutral-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] text-left">
          <div className="space-y-5">
            <div>
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 uppercase tracking-wider">
                {trek.difficulty}
              </span>

              <h1 className="text-2xl font-semibold text-neutral-900 mt-3.5 tracking-tight">
                {trek.title}
              </h1>

              <p className="text-neutral-500 text-sm mt-2 leading-relaxed">
                {trek.description}
              </p>
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-2.5 text-sm text-neutral-600">
              <p className="flex justify-between">
                <span className="text-neutral-400">Organizer</span> 
                <span className="font-medium text-neutral-800">{trek.organizer_username}</span>
              </p>

              <p className="flex justify-between">
                <span className="text-neutral-400">Date</span> 
                <span className="font-medium text-neutral-800">{new Date(trek.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </p>

              <p className="flex justify-between">
                <span className="text-neutral-400">Members</span> 
                <span className="font-medium text-neutral-800">{trek.members_count} / {trek.capacity} slots</span>
              </p>
            </div>

            <div className="pt-2">
              {trek.join_request_status === 'PENDING' ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700 text-sm font-medium tracking-tight"
                >
                  Request Pending Approval
                </button>
              ) : trek.join_request_status === 'REJECTED' ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-400 text-sm font-medium tracking-tight"
                >
                  Request Declined
                </button>
              ) : (
                <button
                  onClick={() => joinRequestMutation.mutate()}
                  disabled={joinRequestMutation.isPending}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 text-white text-sm font-medium flex items-center justify-center gap-2 transition duration-200 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  {joinRequestMutation.isPending ? 'Sending Request...' : 'Request to Join Expedition'}
                </button>
              )}
            </div>
          </div>
        </div>
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
      <div className="space-y-5 lg:col-span-1">
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] text-left">
          <div className="space-y-4">
            <div>
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 uppercase tracking-widest">
                {trek.difficulty}
              </span>
              <h2 className="text-lg font-semibold text-neutral-900 tracking-tight mt-2.5">{trek.title}</h2>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">{trek.description}</p>
            </div>

            <div className="space-y-2.5 text-xs text-neutral-500 border-t border-neutral-100 pt-4">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-neutral-400 stroke-[1.5]" />
                <span className="text-neutral-700">Date: {new Date(trek.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-neutral-400 stroke-[1.5]" />
                <span className="text-neutral-700">Capacity: {trek.members?.length} / {trek.capacity} joined</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Compass className="w-4 h-4 text-amber-600 stroke-[1.5]" />
                <span className="text-neutral-700">Organizer: <span className="font-medium text-neutral-800">{trek.organizer_username}</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Request Approvals */}
        {isOrganizer && pendingRequests.length > 0 && (
          <div className="bg-white p-5 rounded-2xl border border-amber-200/70 bg-gradient-to-b from-amber-50/20 to-transparent text-left shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
            <h3 className="text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-600" />
              <span>Requests ({pendingRequests.length})</span>
            </h3>

            <div className="space-y-2.5">
              {pendingRequests.map((req) => (
                <div key={req.id} className="p-3 rounded-xl bg-neutral-50/50 border border-neutral-200/70 text-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/profile/${req.user}`}
                      className="flex items-center justify-between w-full group no-underline"
                      title="View profile"
                    >
                      <div>
                        <p className="font-medium text-neutral-800 group-hover:text-amber-600 transition duration-150">
                          {req.username}
                        </p>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-tight mt-0.5">
                          XP: {req.experience_level} • ★ {req.rating || 'N/A'}
                        </p>
                      </div>
                      <Eye className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-800 transition duration-150 shrink-0" />
                    </Link>
                  </div>
                  
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleRequestMutation.mutate({ reqId: req.id, status: 'APPROVED' })}
                      className="flex-1 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg flex items-center justify-center gap-1 transition duration-150 text-[11px]"
                    >
                      <Check className="w-3 h-3" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleRequestMutation.mutate({ reqId: req.id, status: 'REJECTED' })}
                      className="py-1.5 px-2.5 bg-white hover:bg-neutral-50 text-neutral-500 font-medium rounded-lg border border-neutral-200 flex items-center justify-center transition duration-150"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Member list */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] text-left">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3.5">Expedition Squad</h3>
          <div className="space-y-3">
            {trek.members?.map((member) => (
              <div key={member.id} className="flex items-center justify-between text-xs border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
                <Link to={`/profile/${member.user}`} className="flex items-center gap-2.5 hover:text-amber-600 transition duration-150 no-underline text-neutral-800">
                  {member.profile_picture_url ? (
                    <img
                      src={member.profile_picture_url}
                      alt={member.username}
                      className="w-6 h-6 rounded-full object-cover border border-neutral-200 shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 font-medium uppercase text-[10px] border border-neutral-200 shrink-0">
                      {member.username[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-neutral-800">{member.username}</p>
                    <p className="text-[9px] text-neutral-400 uppercase font-medium tracking-tight">{member.experience_level}</p>
                  </div>
                </Link>
                <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full border tracking-tight uppercase ${
                  member.role === 'ADMIN' 
                    ? 'border-amber-200 bg-amber-50 text-amber-700' 
                    : 'border-neutral-200 bg-neutral-50 text-neutral-500'
                }`}>
                  {member.role === 'ADMIN' ? 'Lead' : 'Member'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Workspace Area (Tabs) */}
      <div className="lg:col-span-3 space-y-6">
        {/* Workspace Tab Bar */}
        <div className="flex border-b border-neutral-200 overflow-x-auto gap-1 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 -mb-[2px] transition duration-200 shrink-0 focus:outline-none tracking-tight ${
                  isActive 
                    ? 'border-neutral-900 text-neutral-900 font-semibold' 
                    : 'border-transparent text-neutral-400 hover:text-neutral-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 stroke-[1.5] ${isActive ? 'text-amber-600' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Panel render */}
        <div className="min-h-[55vh] bg-white border border-neutral-200/80 rounded-2xl p-4 sm:p-6 shadow-[0_2px_16px_rgba(0,0,0,0.01)]">
          {activeTab === 'chat' && <ChatTab trekId={id} members={trek.members} />}
          {activeTab === 'map' && <MapTab trekId={id} checkpoints={trek.checkpoints} isOrganizer={isOrganizer} />}
          {activeTab === 'gear' && <EquipmentTab trekId={id} />}
          {activeTab === 'expenses' && <ExpenseTab trekId={id} members={trek.members} />}
          {activeTab === 'emergency' && <EmergencyTab trekId={id} trek={trek} />}
        </div>
      </div>
    </div>
  );
}