'use client';

import React, { useEffect, useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Badge } from '@/components/ui/badge';
import { ContributionHeatmap } from '@/components/analytics';
import { api } from '@/lib/axios';
import { useProfileModalStore } from '@/store/useProfileModalStore';
import { useChatStore, generateDMRoomId } from '@/store/useChatStore';
import { useRouter, useParams } from 'next/navigation';
import { 
  Mail, 
  Briefcase, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  Loader2,
  Clock,
  Github,
  X,
  Link as LinkIcon,
  CheckCircle2,
  Timer,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  profilePicture?: string;
  coverPhoto?: string;
  jobTitle?: string;
  department?: string;
  bio?: string;
  timezone?: string;
  createdAt: string;
  githubUsername?: string;
  website?: string;
}

interface UserPerformance {
  tasksDone: number;
  onTimeCompletions: number;
  completionRate: number;
  priorityDistribution: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}

interface UserProfileModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ userId, isOpen, onClose }: UserProfileModalProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserPerformance | null>(null);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  
  const { createRoom, setActiveRoom } = useChatStore();
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile();
    }
  }, [isOpen, userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const [userRes, statsRes] = await Promise.all([
        api.get(`/users/${userId}`),
        api.get(`/performance/contributions/${userId}${workspaceId ? `?workspaceId=${workspaceId}` : ''}`)
      ]);
      setUser(userRes.data.data);
      setStats(statsRes.data.data.performanceStats);
    } catch (err) {
      console.error('Failed to fetch user profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = () => {
    if (!userId || !currentUserId || !workspaceId) return;
    
    const roomId = generateDMRoomId(currentUserId, userId);
    createRoom(roomId, 'direct', workspaceId, [currentUserId, userId]);
    setActiveRoom(roomId);
    onClose();
    router.push(`/workspace/${workspaceId}/inbox`);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1100px] p-0 overflow-hidden border-none bg-[#0a0a0a] shadow-2xl rounded-2xl ring-1 ring-white/10">
        <DialogHeader className="sr-only">
          <DialogTitle>{user?.name || 'User Profile'}</DialogTitle>
          <DialogDescription>
            View profile details and contribution history.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-[500px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
          </div>
        ) : user ? (
          <div className="flex flex-col relative group">
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-all backdrop-blur-md"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Cover Area - Premium Mesh Gradient or Image */}
            <div className="relative h-44 overflow-hidden">
              {user.coverPhoto ? (
                <img 
                  src={user.coverPhoto} 
                  alt="Cover" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1e3a8a] via-[#312e81] to-[#4c1d95] opacity-80" />
              )}
              {/* Overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
            </div>
            
            <div className="px-8 pb-8 -mt-16 relative z-10">
              <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
                <div className="p-1.5 bg-[#0a0a0a] rounded-[2.5rem] ring-1 ring-white/10 shadow-2xl">
                  <UserAvatar 
                    user={user} 
                    className="w-32 h-32 rounded-[2rem] border-none text-4xl font-bold shadow-inner" 
                  />
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-3xl font-black text-white tracking-tight">{user.name}</h2>
                    {user.githubUsername && (
                      <Badge variant="secondary" className="bg-white/5 hover:bg-white/10 text-white/60 border-white/10 text-[10px] gap-1.5 py-0.5 px-2.5 h-6 transition-colors">
                        <Github className="w-3.5 h-3.5" />
                        {user.githubUsername}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 font-semibold text-sm">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" />
                      {user.jobTitle || 'Team Member'}
                    </span>
                    {user.department && (
                      <>
                        <span className="text-white/10">•</span>
                        <span>{user.department}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 pb-2">
                  {userId !== currentUserId && (
                    <Button 
                      onClick={handleMessage}
                      variant="outline" 
                      size="sm" 
                      className="bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary rounded-xl h-10 px-5 gap-2 transition-all font-bold"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Info Card */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-5 border border-white/[0.05] space-y-5">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Contact & Info</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-sm text-slate-300">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-primary/70" />
                        </div>
                        <span className="truncate font-medium">{user.email}</span>
                      </div>
                      {user.timezone && (
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-blue-400/70" />
                          </div>
                          <span className="font-medium">{user.timezone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-sm text-slate-300">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-emerald-400/70" />
                        </div>
                        <span className="font-medium">Joined {format(new Date(user.createdAt), 'MMM yyyy')}</span>
                      </div>
                      {user.website && (
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                            <LinkIcon className="w-4 h-4 text-purple-400/70" />
                          </div>
                          <a href={user.website} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary transition-colors truncate">
                            {user.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {user.bio && (
                    <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-5 border border-white/[0.05]">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Biography</h4>
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">
                        {user.bio}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Column: Stats Only */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Performance Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/[0.05] flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-emerald-400/80 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Tasks Done</span>
                      </div>
                      <span className="text-2xl font-black text-white">{stats?.tasksDone || 0}</span>
                    </div>
                    
                    <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/[0.05] flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-blue-400/80 mb-1">
                        <Timer className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Completion</span>
                      </div>
                      <span className="text-2xl font-black text-white">
                        {stats?.completionRate !== null && stats?.completionRate !== undefined 
                          ? `${stats.completionRate}%` 
                          : '--'}
                      </span>
                    </div>

                    <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/[0.05] flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-orange-400/80 mb-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-wider">High Prio</span>
                      </div>
                      <span className="text-2xl font-black text-white">{stats?.priorityDistribution.high || 0}</span>
                    </div>

                    <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/[0.05] flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-red-400/80 mb-1">
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Urgent</span>
                      </div>
                      <span className="text-2xl font-black text-white">{stats?.priorityDistribution.urgent || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Full Width Row: Activity Heatmap */}
                <div className="col-span-1 lg:col-span-12">
                  <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.05] overflow-hidden">
                    <ContributionHeatmap userId={user._id} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-20 text-center text-slate-500 font-medium">User profile not available</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
