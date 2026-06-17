import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, Map, Briefcase, DollarSign, ShieldAlert, 
  Users, Calendar, Compass, UserCheck, Check, X, AlertCircle
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
  const [activeTab, setActiveTab] = useState('chat');

  // Queries
  const { data: trek, isLoading, isError } = useQuery({
    queryKey: ['trek', id],
    queryFn: () => treksAPI.get(id),
  });

  const isOrganizer = trek && currentUser && trek.organizer === currentUser.id;

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !trek) {
    return (
      <div className="p-8 text-center glass-panel rounded-xl border border-red-500/20 text-red-400">
        <p>Failed to load trek workspace details. Ensure you are an approved member.</p>
      </div>
    );
  }

  const pendingRequests = joinRequests.filter(req => req.status === 'PENDING');

  const tabs = [
    { id: 'chat', label: 'Trek Chat', icon: MessageSquare },
    { id: 'map', label: 'Route Planner', icon: Map },
    { id: 'gear', label: 'Belongings', icon: Briefcase },
    { id: 'expenses', label: 'Expense Splitter', icon: DollarSign },
    { id: 'emergency', label: 'Emergency', icon: ShieldAlert },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
      {/* Sidebar - Group Info */}
      <div className="space-y-6 lg:col-span-1">
        <div className="glass-panel p-5 rounded-xl border border-dark-border/30 text-left">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20 bg-primary/10 text-primary uppercase tracking-wider">
                {trek.difficulty}
              </span>
              <h2 className="text-xl font-extrabold text-dark-text tracking-tight mt-2">{trek.title}</h2>
              <p className="text-xs text-dark-muted mt-1 leading-relaxed">{trek.description}</p>
            </div>

            <div className="space-y-2.5 text-xs text-dark-muted border-t border-dark-border/30 pt-4">
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
        </div>

        {/* Admin Request Approvals */}
        {isOrganizer && pendingRequests.length > 0 && (
          <div className="glass-panel p-5 rounded-xl border border-primary/20 text-left">
            <h3 className="text-sm font-bold text-dark-text mb-3 flex items-center gap-1.5">
              <UserCheck className="w-4.5 h-4.5 text-primary animate-bounce" />
              <span>Pending Requests ({pendingRequests.length})</span>
            </h3>

            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.id} className="p-3 rounded-lg bg-dark-bg/60 border border-dark-border text-xs flex flex-col gap-2.5">
                  <div>
                    <p className="font-bold text-dark-text">{req.username}</p>
                    <p className="text-[10px] text-dark-muted uppercase font-semibold">XP: {req.experience_level} • Rating: {req.rating}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequestMutation.mutate({ reqId: req.id, status: 'APPROVED' })}
                      className="flex-1 py-1.5 bg-primary hover:bg-primary-hover text-dark-bg font-extrabold rounded-md flex items-center justify-center gap-1 transition duration-150"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleRequestMutation.mutate({ reqId: req.id, status: 'REJECTED' })}
                      className="py-1.5 px-2.5 bg-dark-border hover:bg-red-500/10 hover:text-red-400 font-bold rounded-md border border-dark-border/80 flex items-center justify-center transition duration-150"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Member list */}
        <div className="glass-panel p-5 rounded-xl border border-dark-border/30 text-left">
          <h3 className="text-sm font-bold text-dark-muted mb-3">Group Members</h3>
          <div className="space-y-3.5">
            {trek.members?.map((member) => (
              <div key={member.id} className="flex items-center justify-between text-xs border-b border-dark-border/10 pb-2.5">
                <Link to={`/profile/${member.user}`} className="flex items-center gap-2 hover:text-primary transition duration-150">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase">
                    {member.username[0]}
                  </div>
                  <div>
                    <p className="font-bold text-dark-text">{member.username}</p>
                    <p className="text-[9px] text-dark-muted uppercase font-bold">{member.experience_level}</p>
                  </div>
                </Link>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                  member.role === 'ADMIN' 
                    ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' 
                    : 'border-dark-border bg-dark-bg text-dark-muted'
                }`}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Workspace Area (Tabs) */}
      <div className="lg:col-span-3 space-y-6">
        {/* Workspace Tab Bar */}
        <div className="flex border-b border-dark-border/30 overflow-x-auto gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition duration-200 shrink-0 ${
                  isActive 
                    ? 'border-primary text-primary bg-primary/5' 
                    : 'border-transparent text-dark-muted hover:text-dark-text hover:border-dark-border/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Panel render */}
        <div className="min-h-[55vh]">
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
