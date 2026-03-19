'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { initializeSocket, joinWorkspace } from '@/lib/socket';
import { useChatStore, generateDMRoomId } from '@/store/useChatStore';
import { usePresence } from '@/hooks/usePresence';
import { Loader2, User, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/axios';
import { ChatSkeleton } from '@/components/skeletons/PageSkeleton';

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function InboxPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showMembersList, setShowMembersList] = useState(true); // For mobile toggle

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

  // Fetch workspace members
  useEffect(() => {
    if (!currentUserId || !workspaceId) return;

    const fetchMembers = async () => {
      try {
        const response = await api.get(`/workspaces/${workspaceId}/members`);

        if (response.data.success) {
          // Filter out current user
          const allMembers = response.data.data || [];
          const filteredMembers = allMembers.filter((m: WorkspaceMember) => m._id !== currentUserId);
          setMembers(filteredMembers);
          
          // Auto-select first member if available
          if (filteredMembers.length > 0) {
            handleMemberSelect(filteredMembers[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch members:', err);
      }
    };

    fetchMembers();
  }, [workspaceId, currentUserId]);

  const handleMemberSelect = async (member: WorkspaceMember) => {
    try {
      const response = await api.post(`/dm/${member._id}`, {});

      if (response.data.success) {
        const conversation = response.data.data;
        setSelectedMember(member);
        setConversationId(conversation._id);
        
        // Set active room in store
        const roomId = currentUserId ? generateDMRoomId(currentUserId, member._id) : conversation._id;
        setActiveRoom(roomId);
        
        // Hide members list on mobile when a conversation is selected
        setShowMembersList(false);
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  };

  if (isLoading || !currentUserId) {
    return <ChatSkeleton />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Members List Sidebar - Responsive */}
      <div className={cn(
        "border-r border-border flex flex-col bg-background",
        "w-full md:w-80 lg:w-96",
        // Hide on mobile when chat is open
        !showMembersList && selectedMember && "hidden md:flex"
      )}>
        <div className="p-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold text-foreground">Direct Messages</h2>
          <p className="text-sm text-muted-foreground">Chat with workspace members</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {members.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No members available
            </div>
          ) : (
            <div className="p-2">
              {members.map((member) => {
                const online = isUserOnline(member._id);
                const dmRoomId = currentUserId ? generateDMRoomId(currentUserId, member._id) : '';
                const dmRoom = getRoom(dmRoomId);
                const unreadCount = dmRoom?.unreadCount || 0;
                const isSelected = selectedMember?._id === member._id;

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
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <Circle
                        className={cn(
                          'h-3 w-3 absolute -bottom-0.5 -right-0.5 border-2 border-background rounded-full',
                          online ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'
                        )}
                      />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium truncate">{member.name}</div>
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
            {/* Mobile back button */}
            <div className="md:hidden flex items-center gap-2 p-3 border-b border-border bg-background">
              <button
                onClick={() => setShowMembersList(true)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold">{selectedMember.name}</span>
              </div>
            </div>
            
            <ChatWindow
              conversationId={conversationId}
              userId={selectedMember._id}
              type="direct"
              title={selectedMember.name}
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
