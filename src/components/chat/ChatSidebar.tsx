'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Hash, User, Circle, Plus, Lock, Settings, Github, Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/axios';
import { cn } from '@/lib/utils';
import { usePresence } from '@/hooks/usePresence';
import { useChatStore, generateDMRoomId } from '@/store/useChatStore';
import { Button } from '@/components/ui/button';
import { CreateChannelModal } from './CreateChannelModal';
import { UserAvatar } from '@/components/ui/user-avatar';
import { getSocket } from '@/lib/socket';

interface ChatChannel {
  _id: string;
  name: string;
  description?: string;
  type: 'public' | 'private';
  lastMessageAt?: string;
  isDefault?: boolean;
  unreadCount?: number;
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
  onChannelSelect: (channelId: string, type: 'workspace' | 'direct', name: string, conversationId?: string, userId?: string, autoSelected?: boolean) => void;
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
  const { user, setUser } = useAuthStore();

  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  const fetchChannels = useCallback(async () => {
    try {
      if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null') {
        return;
      }
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) return;

      const response = await api.get(`/workspaces/${workspaceId}/chat/channels`);

      if (response.data.success) {
        setChannels(response.data.data || []);
        
        // If no active channel is selected yet, or it's 'general', 
        // find the actual 'general' channel ID and select it
        if (!activeChannel || activeChannel === 'general') {
          const generalChannel = response.data.data.find((c: any) => c.name.toLowerCase() === 'general');
          if (generalChannel) {
            onChannelSelect(generalChannel._id, 'workspace', generalChannel.name, undefined, undefined, true);
          }
        }
      }
    } catch (err) {
    }
  }, [workspaceId, activeChannel, onChannelSelect]);

  // Fetch channels
  useEffect(() => {
    if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null') return;
    fetchChannels();
  }, [workspaceId, fetchChannels]);

  // Fetch DM-related data
  useEffect(() => {
    if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null') return;
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (!token) return;

        const [membersRes, convsRes] = await Promise.all([
          api.get(`/workspaces/${workspaceId}/members`),
          api.get(`/dm?workspaceId=${workspaceId}`)
        ]);

        if (membersRes.data.success) {
          setMembers(membersRes.data.data.filter((m: WorkspaceMember) => m._id !== currentUserId));
        }
        if (convsRes.data.success) {
          setConversations(convsRes.data.data || []);
        }
      } catch (err) {
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

  const handleToggleMute = async (channelId: string, channelName: string) => {
    if (!user) return;
    
    const mutedChannels = user?.notificationPreferences?.mutedChannels || [];
    const isMuted = mutedChannels.includes(channelId);
    
    const newMutedChannels = isMuted 
      ? mutedChannels.filter((id: string) => id !== channelId)
      : [...mutedChannels, channelId];
      
    try {
      await api.patch('/users/notification-preferences', {
        mutedChannels: newMutedChannels
      });
      
      setUser({
        ...user,
        notificationPreferences: {
          ...user.notificationPreferences!,
          mutedChannels: newMutedChannels
        }
      });
      
      toast.success(isMuted ? `Unmuted ${channelName}` : `Muted ${channelName}`);
    } catch (error) {
      toast.error('Failed to update mute settings');
    }
  };

  const handleToggleMuteUser = async (userId: string, userName: string) => {
    if (!user) return;
    
    const mutedUsers = user?.notificationPreferences?.mutedUsers || [];
    const isMuted = mutedUsers.includes(userId);
    
    const newMutedUsers = isMuted 
      ? mutedUsers.filter((id: string) => id !== userId)
      : [...mutedUsers, userId];
      
    try {
      await api.patch('/users/notification-preferences', {
        mutedUsers: newMutedUsers
      });
      
      setUser({
        ...user,
        notificationPreferences: {
          ...user.notificationPreferences!,
          mutedUsers: newMutedUsers
        }
      });
      
      toast.success(isMuted ? `Unmuted ${userName}` : `Muted ${userName}`);
    } catch (error) {
      toast.error('Failed to update mute settings');
    }
  };

  const handleMemberClick = useCallback(async (member: WorkspaceMember) => {
    try {
      if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null') return;
      const response = await api.post(`/dm/${member._id}`, { workspaceId });

      if (response.data.success) {
        onChannelSelect(member._id, 'direct', member.name, response.data.data._id, member._id);
      }
    } catch (err) {
    }
  }, [workspaceId, onChannelSelect]);

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
    <div className="w-full bg-card border-r border-border flex flex-col h-full min-w-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden chat-scrollbar px-3 md:px-4">
      <div className="space-y-6 py-3 md:py-4">
        
        {/* Public Channels */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Channels
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{publicChannels.length}</span>
              {isAdmin && (
                <button
                  aria-label="Create channel"
                  className="grid h-11 w-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent md:h-7 md:w-7 md:rounded-md"
                  onClick={() => setIsModalOpen(true)}
                >
                  <Plus className="h-5 w-5 md:h-3.5 md:w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1.5 md:space-y-0.5">
            {publicChannels.map((channel) => {
              const room = getRoom(channel.isDefault ? `workspace_${workspaceId}` : `channel_${channel._id}`);
              const unread = room ? room.unreadCount : (channel.unreadCount || 0);
              return (
                <div
                  key={channel._id}
                  onClick={() => onChannelSelect(channel._id, 'workspace', channel.name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onChannelSelect(channel._id, 'workspace', channel.name);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'w-full min-h-[72px] flex items-center gap-3 px-3 py-3 rounded-xl border border-border/70 bg-background text-sm transition-colors relative group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary md:min-h-0 md:gap-2 md:px-3 md:py-1.5 md:rounded-md md:border-transparent md:bg-transparent',
                    activeChannel === channel._id
                      ? 'bg-primary/10 border-primary/30 text-foreground md:bg-primary md:text-primary-foreground'
                      : 'hover:bg-accent text-foreground'
                  )}
                >
                  <div className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary md:h-auto md:w-auto md:rounded-none md:bg-transparent',
                    activeChannel === channel._id ? 'md:text-primary-foreground' : 'md:text-muted-foreground'
                  )}>
                    {channel.name === 'Commit Log' ? <Github className="h-5 w-5 md:h-4 md:w-4" /> : <Hash className="h-5 w-5 md:h-4 md:w-4" />}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-semibold">{channel.name}</span>
                      {unread > 0 && activeChannel !== channel._id && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label={`${unread} unread messages`} />
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground md:hidden">
                      {channel.description || (channel.name === 'Commit Log' ? 'Recent code changes' : 'Public channel · Workspace-wide conversation')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {unread > 0 && activeChannel !== channel._id && (
                      <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary md:inline-flex">{unread > 99 ? '99+' : unread}</span>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleMute(channel._id, channel.name);
                      }}
                      className={cn(
                        "p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-all",
                        user?.notificationPreferences?.mutedChannels?.includes(channel._id) 
                          ? "opacity-100 text-amber-500" 
                          : "opacity-0 group-hover:opacity-100 text-muted-foreground"
                      )}
                    >
                      {user?.notificationPreferences?.mutedChannels?.includes(channel._id) ? (
                        <BellOff className="h-3 w-3" />
                      ) : (
                        <Bell className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Private Groups */}
        {privateChannels.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Private Groups</h3>
              <span className="text-xs text-muted-foreground">{privateChannels.length}</span>
            </div>
            <div className="space-y-1.5 md:space-y-0.5">
              {privateChannels.map((channel) => {
                const room = getRoom(`channel_${channel._id}`);
                const unread = room ? room.unreadCount : (channel.unreadCount || 0);
                return (
                  <div
                    key={channel._id}
                    onClick={() => onChannelSelect(channel._id, 'workspace', channel.name)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onChannelSelect(channel._id, 'workspace', channel.name);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'w-full min-h-[72px] flex items-center gap-3 px-3 py-3 rounded-xl border border-border/70 bg-background text-sm transition-colors relative group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary md:min-h-0 md:gap-2 md:px-3 md:py-1.5 md:rounded-md md:border-transparent md:bg-transparent',
                      activeChannel === channel._id
                        ? 'bg-primary/10 border-primary/30 text-foreground md:bg-primary md:text-primary-foreground'
                        : 'hover:bg-accent text-foreground'
                    )}
                  >
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary md:h-auto md:w-auto md:rounded-none md:bg-transparent',
                      activeChannel === channel._id ? 'md:text-primary-foreground' : 'md:text-muted-foreground'
                    )}>
                      <Lock className="h-5 w-5 md:h-4 md:w-4" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-semibold">{channel.name}</span>
                        {unread > 0 && activeChannel !== channel._id && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label={`${unread} unread messages`} />
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground md:hidden">
                        {channel.description || 'Private group · Invited members only'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {unread > 0 && activeChannel !== channel._id && <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary md:inline-flex">{unread > 99 ? '99+' : unread}</span>}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleMute(channel._id, channel.name);
                        }}
                        className={cn(
                          "p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-all",
                          user?.notificationPreferences?.mutedChannels?.includes(channel._id) 
                            ? "opacity-100 text-amber-500" 
                            : "opacity-0 group-hover:opacity-100 text-muted-foreground"
                        )}
                      >
                        {user?.notificationPreferences?.mutedChannels?.includes(channel._id) ? (
                          <BellOff className="h-3 w-3" />
                        ) : (
                          <Bell className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Direct Messages */}
        <div className="hidden md:block">
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
              const linkedConversation = conversations.find(conv =>
                conv.participants?.some((p) => p._id === member._id)
              );
              const conversationRoomId = linkedConversation?._id;
              // Realtime DM events are keyed by conversationId in the chat store.
              // Fallback to legacy generated room id for backward compatibility.
              const conversationRoom = conversationRoomId ? getRoom(conversationRoomId) : undefined;
              const legacyRoom = getRoom(dmRoomId);
              const unread = conversationRoom
                ? conversationRoom.unreadCount
                : legacyRoom
                  ? legacyRoom.unreadCount
                  : (linkedConversation?.unreadCount || 0);

              return (
                <div
                  key={member._id}
                  onClick={() => handleMemberClick(member)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleMemberClick(member);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors relative group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary',
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
                  <div className="flex items-center gap-1">
                    {unread > 0 && activeChannel !== member._id && (
                      <div className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {unread > 9 ? '9+' : unread}
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleMuteUser(member._id, member.name);
                      }}
                      className={cn(
                        "p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-all",
                        (user?.notificationPreferences as any)?.mutedUsers?.includes(member._id) 
                          ? "opacity-100 text-amber-500" 
                          : "opacity-0 group-hover:opacity-100 text-muted-foreground"
                      )}
                      title={(user?.notificationPreferences as any)?.mutedUsers?.includes(member._id) ? "Unmute" : "Mute"}
                    >
                      {(user?.notificationPreferences as any)?.mutedUsers?.includes(member._id) ? (
                        <BellOff className="h-3 w-3" />
                      ) : (
                        <Bell className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
