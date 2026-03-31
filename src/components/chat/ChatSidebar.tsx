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
    <div className="w-full md:w-64 lg:w-80 bg-card border-r border-border flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 space-y-6">
        
        {/* Public Channels */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Channels
            </h3>
            {isAdmin && (
              <button 
                className="p-1 hover:bg-accent rounded-md transition-colors text-muted-foreground"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="space-y-0.5">
            {publicChannels.map((channel) => {
              const unread = getRoom(`channel_${channel._id}`)?.unreadCount || 0;
              return (
                <button
                  key={channel._id}
                  onClick={() => onChannelSelect(channel._id, 'workspace', channel.name)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors relative group',
                    activeChannel === channel._id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent text-foreground'
                  )}
                >
                  <Hash className={cn("h-4 w-4 flex-shrink-0", activeChannel === channel._id ? "text-primary-foreground" : "text-muted-foreground")} />
                  <span className="flex-1 text-left truncate font-medium">{channel.name}</span>
                  {unread > 0 && activeChannel !== channel._id && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Private Groups */}
        {privateChannels.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Private Groups
            </h3>
            <div className="space-y-0.5">
              {privateChannels.map((channel) => {
                const unread = getRoom(`channel_${channel._id}`)?.unreadCount || 0;
                return (
                  <button
                    key={channel._id}
                    onClick={() => onChannelSelect(channel._id, 'workspace', channel.name)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors relative',
                      activeChannel === channel._id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-foreground'
                    )}
                  >
                    <Lock className={cn("h-4 w-4 flex-shrink-0", activeChannel === channel._id ? "text-primary-foreground" : "text-muted-foreground")} />
                    <span className="flex-1 text-left truncate font-medium">{channel.name}</span>
                    {unread > 0 && activeChannel !== channel._id && (
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Direct Messages */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Direct Messages
          </h3>
          <div className="space-y-0.5">
            {useMemo(() => {
              // Create a map of targetUserId to lastMessageAt for quick lookup
              const conversationMap = new Map<string, string>();
              conversations.forEach(conv => {
                const otherParticipant = conv.participants.find(p => p._id !== currentUserId);
                if (otherParticipant && conv.lastMessage) {
                  conversationMap.set(otherParticipant._id, conv.lastMessage.createdAt);
                }
              });

              // Sort members: those with conversations first (ordered by lastMessageAt), then others
              return [...members].sort((a, b) => {
                const timeA = conversationMap.get(a._id);
                const timeB = conversationMap.get(b._id);

                if (timeA && timeB) {
                  return new Date(timeB).getTime() - new Date(timeA).getTime();
                }
                if (timeA) return -1;
                if (timeB) return 1;
                return a.name.localeCompare(b.name);
              });
            }, [members, conversations, currentUserId]).map((member) => {
              const online = isUserOnline(member._id);
              const dmRoomId = currentUserId ? generateDMRoomId(currentUserId, member._id) : '';
              const unread = getRoom(dmRoomId)?.unreadCount || 0;

              return (
                <button
                  key={member._id}
                  onClick={() => handleMemberClick(member)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors relative',
                    activeChannel === member._id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent text-foreground'
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <UserAvatar 
                      user={member} 
                      className="h-6 w-6" 
                      fallbackClassName="text-[8px]"
                    />
                    <Circle
                      className={cn(
                        'h-2 w-2 absolute -bottom-0.5 -right-0.5',
                        online ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400 border-background border'
                      )}
                    />
                  </div>
                  <span className="flex-1 text-left truncate">{member.name}</span>
                  {unread > 0 && activeChannel !== member._id && (
                    <div className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
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
