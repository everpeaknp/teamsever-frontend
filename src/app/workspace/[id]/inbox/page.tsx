'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { initializeSocket, joinWorkspace, getSocket } from '@/lib/socket';
import { useChatStore, generateDMRoomId } from '@/store/useChatStore';
import { usePresence } from '@/hooks/usePresence';
import { Loader2, User, Circle } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import { api } from '@/lib/axios';
import { ChatSkeleton } from '@/components/skeletons/PageSkeleton';
import { format, isToday, isYesterday } from 'date-fns';
import { useMemo } from 'react';

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  profilePicture?: string;
}

export default function InboxPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showMembersList, setShowMembersList] = useState(true); // For mobile toggle
  const [dmSidebarWidth, setDmSidebarWidth] = useState(380);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const isResizingRef = useRef(false);
  const dmSidebarRef = useRef<HTMLDivElement>(null);

  const MIN_DM_SIDEBAR_WIDTH = 300;
  const MAX_DM_SIDEBAR_WIDTH = 560;
  const DEFAULT_DM_SIDEBAR_WIDTH = 380;

  const { setActiveRoom, getRoom } = useChatStore();
  const { isUserOnline } = usePresence(workspaceId);

  // Initialize auth and socket
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    const finalToken = authToken || token;
    
    // STRICT VALIDATION: Check for invalid tokens
    if (!finalToken || 
        !userId || 
        finalToken === 'undefined' || 
        finalToken === 'null' || 
        finalToken.trim() === '') {
      console.error('[Inbox] Auth failed - redirecting to login');
      
      // Clear invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      
      router.push('/login');
      return;
    }

    setCurrentUserId(userId);

    // Initialize socket with error handling
    try {
      initializeSocket(finalToken);
      joinWorkspace(workspaceId);

      setIsLoading(false);
    } catch (error) {
      console.error('[Inbox] Socket initialization failed:', error);
      // Don't redirect, just log - socket will retry
      setIsLoading(false);
    }
  }, [router, workspaceId]);

  useEffect(() => {
    if (!currentUserId || !workspaceId) return;

    const fetchData = async () => {
      try {
        const [membersRes, conversationsRes] = await Promise.all([
          api.get(`/workspaces/${workspaceId}/members`),
          api.get(`/dm${workspaceId ? `?workspaceId=${workspaceId}` : ''}`)
        ]);

        if (membersRes.data.success) {
          const allMembers = membersRes.data.data || [];
          setMembers(allMembers.filter((m: WorkspaceMember) => m._id !== currentUserId));
        }

        if (conversationsRes.data.success) {
          setConversations(conversationsRes.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch inbox data:', err);
      }
    };

    fetchData();
  }, [workspaceId, currentUserId]);

  // Socket listener for real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (payload: any) => {
      // Update conversations with new lastMessageAt
      const { conversation, message } = payload;
      if (!conversation || !conversation._id) return;

      setConversations(prev => {
        const index = prev.findIndex(c => c._id === conversation._id);
        if (index === -1) {
          // Add new conversation if it doesn't exist
          return [conversation, ...prev];
        }
        
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          lastMessageAt: conversation.lastMessageAt || new Date().toISOString(),
          lastMessage: message
        };
        return updated;
      });
    };

    socket.on('dm:new', handleNewMessage);
    
    return () => {
      socket.off('dm:new', handleNewMessage);
    };
  }, [getSocket()]);

  // Memoized sorted members
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const convA = conversations.find((c: any) => 
        c.participants.some((p: any) => p._id === a._id || p === a._id)
      );
      const convB = conversations.find((c: any) => 
        c.participants.some((p: any) => p._id === b._id || p === b._id)
      );
      
      const timeA = convA ? new Date(convA.lastMessageAt).getTime() : 0;
      const timeB = convB ? new Date(convB.lastMessageAt).getTime() : 0;
      
      return timeB - timeA;
    });
  }, [members, conversations]);

  // Helper to format last message time
  const formatLastMessageTime = (date: string | Date | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    if (isToday(d)) {
      return format(d, 'h:mm aa');
    }
    if (isYesterday(d)) {
      return 'Yesterday';
    }
    return format(d, 'MMM d');
  };

  const handleMemberSelect = async (member: WorkspaceMember) => {
    try {
      const response = await api.post(`/dm/${member._id}`, { workspaceId });

      if (response.data.success) {
        const conversation = response.data.data;
        setSelectedMember(member);
        setConversationId(conversation._id);
        
        // Set active room in store
        setActiveRoom(conversation._id);
        
        // Hide members list on mobile when a conversation is selected
        setShowMembersList(false);
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  };

  const startSidebarResizing = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizingSidebar(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopSidebarResizing = useCallback(() => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;
    setIsResizingSidebar(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (workspaceId && typeof window !== 'undefined') {
      localStorage.setItem(`inbox_sidebar_width_${workspaceId}`, String(dmSidebarWidth));
    }
  }, [workspaceId, dmSidebarWidth]);

  const resizeSidebar = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const containerLeft = dmSidebarRef.current?.getBoundingClientRect().left ?? 0;
    const nextWidth = Math.max(
      MIN_DM_SIDEBAR_WIDTH,
      Math.min(MAX_DM_SIDEBAR_WIDTH, e.clientX - containerLeft)
    );
    setDmSidebarWidth(nextWidth);
  }, []);

  const resetSidebarWidth = useCallback(() => {
    setDmSidebarWidth(DEFAULT_DM_SIDEBAR_WIDTH);
    if (workspaceId && typeof window !== 'undefined') {
      localStorage.setItem(`inbox_sidebar_width_${workspaceId}`, String(DEFAULT_DM_SIDEBAR_WIDTH));
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || typeof window === 'undefined') return;
    const saved = localStorage.getItem(`inbox_sidebar_width_${workspaceId}`);
    if (!saved) return;
    const parsed = Number(saved);
    if (!Number.isNaN(parsed)) {
      setDmSidebarWidth(
        Math.max(MIN_DM_SIDEBAR_WIDTH, Math.min(MAX_DM_SIDEBAR_WIDTH, parsed))
      );
    }
  }, [workspaceId]);

  useEffect(() => {
    window.addEventListener('mousemove', resizeSidebar);
    window.addEventListener('mouseup', stopSidebarResizing);
    return () => {
      window.removeEventListener('mousemove', resizeSidebar);
      window.removeEventListener('mouseup', stopSidebarResizing);
    };
  }, [resizeSidebar, stopSidebarResizing]);

  if (isLoading || !currentUserId) {
    return <ChatSkeleton />;
  }

  return (
    <div className="flex h-full min-h-0 bg-background overflow-hidden">
      {/* Members List Sidebar - Responsive */}
      <div className={cn(
        "border-r border-border flex flex-col bg-background",
        "w-full md:w-[var(--dm-sidebar-width)] md:shrink-0 relative",
        !isResizingSidebar && "md:transition-[width]",
        // Hide on mobile when chat is open
        !showMembersList && selectedMember && "hidden md:flex"
      )}
      style={{ ['--dm-sidebar-width' as any]: `${dmSidebarWidth}px` }}
      ref={dmSidebarRef}
      >
        <div
          className="hidden md:block absolute top-0 -right-1 h-full w-2 cursor-col-resize z-30"
          onMouseDown={startSidebarResizing}
          onDoubleClick={resetSidebarWidth}
        />
        <div className="p-4 border-b border-border flex-shrink-0 sticky top-0 z-20 bg-background">
          <h2 className="text-lg font-semibold text-foreground">Direct Messages</h2>
          <p className="text-sm text-muted-foreground">Chat with workspace members</p>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden chat-scrollbar">
          {sortedMembers.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No members available
            </div>
          ) : (
            <div className="p-2">
              {sortedMembers.map((member) => {
                const online = isUserOnline(member._id);
                const conversation = conversations.find((c: any) => 
                  c.participants.some((p: any) => p._id === member._id || p === member._id)
                );
                const dmRoomId = conversation?._id || '';
                const dmRoom = getRoom(dmRoomId);
                const unreadCount = dmRoom?.unreadCount || 0;
                const isSelected = selectedMember?._id === member._id;
                const lastMessageTime = conversation?.lastMessageAt;

                return (
                  <button
                    key={member._id}
                    onClick={() => handleMemberSelect(member)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg transition-colors mb-1',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-foreground'
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <UserAvatar user={member} className="h-10 w-10 border border-background shadow-sm" />
                      <Circle
                        className={cn(
                          'h-3 w-3 absolute -bottom-0.5 -right-0.5 border-2 border-background rounded-full',
                          online ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'
                        )}
                      />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-medium truncate">{member.name}</div>
                        {lastMessageTime && (
                          <div className={cn(
                            "text-[10px] whitespace-nowrap ml-2",
                            isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {formatLastMessageTime(lastMessageTime)}
                          </div>
                        )}
                      </div>
                      <div className="text-xs opacity-70 truncate">{member.email}</div>
                    </div>
                    {unreadCount > 0 && (
                      <div className="h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Window - Responsive */}
      <div className={cn(
        "flex-1 flex flex-col",
        // Show on mobile only when chat is selected
        showMembersList && selectedMember && "hidden md:flex"
      )}>
        {selectedMember && conversationId ? (
          <div className="flex flex-col h-full">
            <ChatWindow
              workspaceId={workspaceId}
              conversationId={conversationId}
              userId={selectedMember._id}
              type="direct"
              title={selectedMember.name}
              onMenuClick={() => setShowMembersList(true)}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center text-muted-foreground p-4">
              <User className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Select a conversation</p>
              <p className="text-sm">Choose a member from the list to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
