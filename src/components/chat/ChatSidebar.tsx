'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Hash, User, Circle, Plus, Lock, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePresence } from '@/hooks/usePresence';
import { useChatStore, generateDMRoomId } from '@/store/useChatStore';
import { Button } from '@/components/ui/button';
import { CreateChannelModal } from './CreateChannelModal';
import { UserAvatar } from '@/components/ui/user-avatar';
import axios from 'axios';
import { getSocket } from '@/lib/socket';
import { motion } from 'framer-motion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface ChatChannel {
  _id: string;
  name: string;
  description: string;
  type: 'public' | 'private';
  lastMessageAt?: string;
  isDefault?: boolean;
}

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  profilePicture?: string;
  avatar?: string;
}

interface Conversation {
  _id: string;
  participants: WorkspaceMember[];
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount?: number;
}

interface ChatSidebarProps {
  workspaceId: string;
  activeChannel: string;
  onChannelSelect: (channelId: string, type: 'workspace' | 'direct', name: string, conversationId?: string, userId?: string) => void;
  isAdmin?: boolean;
}

export const ChatSidebar = ({ workspaceId, activeChannel, onChannelSelect, isAdmin }: ChatSidebarProps) => {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isUserOnline } = usePresence(workspaceId);
  const { getRoom } = useChatStore();

  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const fetchChannels = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(
        `${API_URL}/api/workspaces/${workspaceId}/chat/channels`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setChannels(response.data.data || []);

        // If no active channel is selected yet, or it's 'general', 
        // find the actual 'general' channel ID and select it
        if (!activeChannel || activeChannel === 'general') {
          const generalChannel = response.data.data.find((c: any) => c.name.toLowerCase() === 'general');
          if (generalChannel) {
            onChannelSelect(generalChannel._id, 'workspace', generalChannel.name);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    }
  }, [workspaceId, activeChannel, onChannelSelect]);

  // Fetch channels
  useEffect(() => {
    fetchChannels();
  }, [workspaceId]);

  // Fetch DM-related data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (!token) return;

        const [membersRes, convsRes] = await Promise.all([
          axios.get(`${API_URL}/api/workspaces/${workspaceId}/members`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/api/dm`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (membersRes.data.success) {
          setMembers(membersRes.data.data.filter((m: WorkspaceMember) => m._id !== currentUserId));
        }
        if (convsRes.data.success) {
          setConversations(convsRes.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch sidebar data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workspaceId, currentUserId]);

  // Socket listeners for real-time sorting
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (data: { message: any }) => {
      const msg = data.message;

      if (msg.channel) {
        // Update channel lastMessageAt
        setChannels(prev => prev.map(c =>
          c._id === msg.channel ? { ...c, lastMessageAt: msg.createdAt } : c
        ));
      } else if (msg.conversation) {
        // Update conversation lastMessage
        setConversations(prev => {
          const exists = prev.some(conv => conv._id === msg.conversation);
          if (exists) {
            return prev.map(conv =>
              conv._id === msg.conversation ? { ...conv, lastMessage: { content: msg.content, createdAt: msg.createdAt } } : conv
            );
          } else {
            // New conversation - we might need to refetch to get participants etc, 
            // but for sorting, we can just update what we have if participants match
            return prev;
          }
        });
      }
    };

    socket.on('chat:new', handleNewMessage);
    socket.on('dm:new', handleNewMessage);

    return () => {
      socket.off('chat:new', handleNewMessage);
      socket.off('dm:new', handleNewMessage);
    };
  }, []);

  const handleMemberClick = useCallback(async (member: WorkspaceMember) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/dm/${member._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        onChannelSelect(member._id, 'direct', member.name, response.data.data._id, member._id);
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  }, [onChannelSelect]);

  const publicChannels = useMemo(() => {
    return [...channels]
      .filter(c => c.type === 'public')
      .sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [channels]);

  const privateChannels = useMemo(() => {
    return [...channels]
      .filter(c => c.type === 'private')
      .sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [channels]);

  return (
    <div className="w-full md:w-64 lg:w-80 bg-white/40 dark:bg-[#0B0E11]/40 backdrop-blur-3xl border-r border-border/30 flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-8">

        {/* Public Channels */}
        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="flex items-center justify-between mb-4 px-3">
            <h3 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
              Public Channels
            </h3>
            {isAdmin && (
              <button
                className="p-1.5 bg-primary/5 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-xl transition-all active:scale-90 border border-primary/5"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="h-[14px] w-[14px]" />
              </button>
            )}
          </div>
          <div className="space-y-1">
            {publicChannels.map((channel) => {
              const unread = getRoom(`channel_${channel._id}`)?.unreadCount || 0;
              const isActive = activeChannel === channel._id;
              return (
                <button
                  key={channel._id}
                  onClick={() => onChannelSelect(channel._id, 'workspace', channel.name)}
                  className={cn(
                    'w-full flex items-center gap-3.5 px-4 py-3 rounded-[18px] text-[14.5px] font-bold transition-all relative group',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-[0_8px_25px_rgba(var(--primary-rgb),0.2)] scale-[1.02] border-t border-white/10'
                      : 'hover:bg-muted/50 text-foreground/70 hover:text-foreground active:scale-[0.98]'
                  )}
                >
                  <Hash className={cn("h-[18px] w-[18px] flex-shrink-0 transition-all duration-300", isActive ? "text-primary-foreground rotate-12" : "text-muted-foreground/30 group-hover:text-primary/50")} />
                  <span className="flex-1 text-left truncate tracking-tight">{channel.name}</span>
                  {unread > 0 && !isActive && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)] animate-pulse" />
                  )}
                  {isActive && (
                    <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-5 bg-white/40 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Private Groups */}
        {privateChannels.length > 0 && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-700">
            <h3 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-4 px-3">
              Private Groups
            </h3>
            <div className="space-y-1">
              {privateChannels.map((channel) => {
                const unread = getRoom(`channel_${channel._id}`)?.unreadCount || 0;
                const isActive = activeChannel === channel._id;
                return (
                  <button
                    key={channel._id}
                    onClick={() => onChannelSelect(channel._id, 'workspace', channel.name)}
                    className={cn(
                      'w-full flex items-center gap-3.5 px-4 py-3 rounded-[18px] text-[14.5px] font-bold transition-all relative group',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-[0_8px_25px_rgba(var(--primary-rgb),0.2)] scale-[1.02] border-t border-white/10'
                        : 'hover:bg-muted/50 text-foreground/70 hover:text-foreground active:scale-[0.98]'
                    )}
                  >
                    <Lock className={cn("h-[16px] w-[16px] flex-shrink-0 transition-all duration-300", isActive ? "text-primary-foreground" : "text-muted-foreground/30 group-hover:text-primary/50")} />
                    <span className="flex-1 text-left truncate tracking-tight">{channel.name}</span>
                    {unread > 0 && !isActive && (
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)] animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Direct Messages */}
        <div className="animate-in fade-in slide-in-from-left-4 duration-1000">
          <div className="flex items-center justify-between mb-4 px-3">
            <h3 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
              Direct Messages
            </h3>
          </div>
          <div className="space-y-1">
            {useMemo(() => {
              const conversationMap = new Map<string, string>();
              conversations.forEach(conv => {
                const otherParticipant = conv.participants.find(p => p._id !== currentUserId);
                if (otherParticipant && conv.lastMessage) {
                  conversationMap.set(otherParticipant._id, conv.lastMessage.createdAt);
                }
              });

              return [...members].sort((a, b) => {
                const timeA = conversationMap.get(a._id);
                const timeB = conversationMap.get(b._id);

                if (timeA && timeB) return new Date(timeB).getTime() - new Date(timeA).getTime();
                if (timeA) return -1;
                if (timeB) return 1;
                return a.name.localeCompare(b.name);
              });
            }, [members, conversations, currentUserId]).map((member) => {
              const online = isUserOnline(member._id);
              const dmRoomId = currentUserId ? generateDMRoomId(currentUserId, member._id) : '';
              const unread = getRoom(dmRoomId)?.unreadCount || 0;
              const isActive = activeChannel === member._id;

              return (
                <button
                  key={member._id}
                  onClick={() => handleMemberClick(member)}
                  className={cn(
                    'w-full flex items-center gap-3.5 px-3 py-2.5 rounded-[20px] text-[14.5px] font-bold transition-all relative group',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-[0_8px_25px_rgba(var(--primary-rgb),0.2)] scale-[1.02] border-t border-white/10'
                      : 'hover:bg-muted/50 text-foreground/80 hover:text-foreground active:scale-[0.98]'
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <div className={cn(
                      "p-0.5 rounded-[12px] transition-all duration-500",
                      isActive ? "bg-white/20" : "bg-transparent group-hover:bg-primary/10"
                    )}>
                      <UserAvatar
                        user={member}
                        className={cn(
                          "h-[32px] w-[32px] rounded-[10px] shadow-sm transition-all duration-500 border-2",
                          isActive ? "border-primary-foreground/30" : "border-background group-hover:scale-105"
                        )}
                        fallbackClassName="text-[10px]"
                      />
                    </div>
                    <div
                      className={cn(
                        'h-3.5 w-3.5 absolute -bottom-1 -right-1 rounded-full border-2 transition-all duration-500 shadow-sm',
                        isActive ? "border-primary" : "border-white dark:border-[#0B0E11]",
                        online ? 'bg-green-500' : 'bg-muted-foreground/30'
                      )}
                    />
                  </div>
                  <span className="flex-1 text-left truncate tracking-tight">{member.name}</span>
                  {unread > 0 && !isActive && (
                    <div className="bg-primary text-primary-foreground text-[10px] font-black px-2 py-0.5 rounded-full shadow-[0_4px_10px_rgba(var(--primary-rgb),0.3)] animate-in zoom-in duration-500">
                      {unread > 9 ? '9+' : unread}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <CreateChannelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workspaceId={workspaceId}
        onSuccess={fetchChannels}
      />

      {/* Footer / User Settings could go here if needed, but currently handled by AppSidebar */}
    </div>
  );
};
