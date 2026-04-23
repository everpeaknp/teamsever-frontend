'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { initializeSocket, joinWorkspace } from '@/lib/socket';
import { useChatStore, generateDMRoomId } from '@/store/useChatStore';
import { usePresence } from '@/hooks/usePresence';
import { Loader2, User, Circle } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import { api } from '@/lib/axios';
import { ChatSkeleton } from '@/components/skeletons/PageSkeleton';
import { motion } from 'framer-motion';

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

  useEffect(() => {
    if (!currentUserId || !workspaceId) return;

    const fetchData = async () => {
      try {
        const [membersRes, conversationsRes] = await Promise.all([
          api.get(`/workspaces/${workspaceId}/members`),
          api.get('/dm')
        ]);

        if (membersRes.data.success) {
          const allMembers = membersRes.data.data || [];
          const filteredMembers = allMembers.filter((m: WorkspaceMember) => m._id !== currentUserId);
          
          // Get recent conversations to sort members
          const conversations = conversationsRes.data.success ? conversationsRes.data.data : [];
          
          // Map lastMessageAt to members
          const sortedMembers = [...filteredMembers].sort((a, b) => {
            const convA = conversations.find((c: any) => 
              c.participants.some((p: any) => p._id === a._id)
            );
            const convB = conversations.find((c: any) => 
              c.participants.some((p: any) => p._id === b._id)
            );
            
            const timeA = convA ? new Date(convA.lastMessageAt).getTime() : 0;
            const timeB = convB ? new Date(convB.lastMessageAt).getTime() : 0;
            
            return timeB - timeA;
          });

          setMembers(sortedMembers);
          
          // Auto-select first member if available and nothing selected
          if (sortedMembers.length > 0 && !selectedMember) {
            handleMemberSelect(sortedMembers[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch inbox data:', err);
      }
    };

    fetchData();
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
    <div className="flex h-screen bg-[#FDFDFD] dark:bg-[#0B0E11] overflow-hidden">
      {/* Members List Sidebar - Responsive & Premium */}
      <div className={cn(
        "border-r border-border/30 flex flex-col bg-white/40 dark:bg-[#0B0E11]/40 backdrop-blur-xl",
        "w-full md:w-[360px] lg:w-[400px]",
        // Hide on mobile when chat is open
        !showMembersList && selectedMember && "hidden md:flex"
      )}>
        <div className="p-8 pb-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[24px] font-black text-foreground tracking-tighter">Messages</h2>
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary cursor-pointer hover:bg-primary/20 transition-all active:scale-90 shadow-sm border border-primary/10">
              <User className="h-5 w-5" />
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground/40 group-focus-within:text-primary/60 transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input 
              type="text" 
              placeholder="Search conversations..."
              className="w-full bg-muted/30 border border-border/40 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 rounded-[20px] py-3 pl-11 pr-4 text-sm font-medium transition-all outline-none placeholder:text-muted-foreground/30"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-6 custom-scrollbar">
          <div className="px-4">
             <h3 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-4">Direct Messages</h3>
             
             {members.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-48 text-center bg-muted/10 rounded-[32px] border border-dashed border-border/40">
                 <div className="h-12 w-12 bg-muted/20 rounded-2xl flex items-center justify-center mb-4">
                   <User className="h-6 w-6 text-muted-foreground/30" />
                 </div>
                 <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">No members found</p>
               </div>
             ) : (
               <div className="space-y-2">
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
                         'w-full flex items-center gap-4 p-3.5 rounded-[24px] transition-all duration-300 relative group',
                         isSelected
                           ? 'bg-primary text-primary-foreground shadow-[0_12px_40px_rgba(var(--primary-rgb),0.25)] scale-[1.02] border-t border-white/10'
                           : 'hover:bg-muted/50 text-foreground/80 hover:text-foreground active:scale-[0.98]'
                       )}
                     >
                       <div className="relative flex-shrink-0">
                         <div className={cn(
                           "p-0.5 rounded-[18px] transition-all duration-500",
                           isSelected ? "bg-white/20 scale-105" : "bg-transparent group-hover:bg-primary/10"
                         )}>
                            <UserAvatar 
                              user={member} 
                              className={cn(
                                "h-12 w-12 border-2 shadow-sm transition-all duration-500 rounded-[16px]",
                                isSelected ? "border-primary-foreground/30" : "border-background group-hover:scale-105"
                              )} 
                            />
                         </div>
                         <div
                           className={cn(
                             'h-4 w-4 absolute -bottom-1 -right-1 border-2 rounded-full transition-all duration-500 shadow-sm',
                             isSelected ? "border-primary" : "border-white dark:border-[#0B0E11]",
                             online ? 'bg-green-500' : 'bg-muted-foreground/30'
                           )}
                         />
                       </div>
                       <div className="flex-1 text-left min-w-0">
                         <div className={cn("font-extrabold truncate tracking-tight text-[15px] mb-0.5", isSelected ? "text-primary-foreground" : "text-foreground")}>
                           {member.name}
                         </div>
                         <div className={cn("text-[11px] truncate font-bold opacity-50 tracking-tight", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>
                           {member.email}
                         </div>
                       </div>
                       {unreadCount > 0 && !isSelected && (
                         <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20 animate-in zoom-in duration-500">
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
      </div>

      {/* Chat Window - Responsive & Premium */}
      <div className={cn(
        "flex-1 flex flex-col relative bg-[#FDFDFD] dark:bg-[#0B0E11]",
        // Show on mobile only when chat is selected
        showMembersList && selectedMember && "hidden md:flex"
      )}>
        {selectedMember && conversationId ? (
          <div className="flex flex-col h-full">
            {/* Mobile back button with premium style */}
            <div className="md:hidden flex items-center gap-4 p-6 border-b border-border/30 bg-background/80 backdrop-blur-xl">
              <button
                onClick={() => setShowMembersList(true)}
                className="h-10 w-10 flex items-center justify-center bg-muted/40 rounded-xl transition-all active:scale-90 border border-border/20"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <UserAvatar user={selectedMember} className="h-10 w-10 border-2 border-primary/20 rounded-xl" />
                  {isUserOnline(selectedMember._id) && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-black tracking-tight text-[15px]">{selectedMember.name}</span>
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Active now</span>
                </div>
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
          <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/[0.03] via-transparent to-transparent">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-12">
                <div className="absolute -inset-16 bg-primary/10 rounded-full blur-[80px] animate-pulse"></div>
                <div className="relative h-28 w-28 bg-gradient-to-br from-primary/15 to-primary/5 rounded-[40px] flex items-center justify-center shadow-2xl rotate-[15deg] group-hover:rotate-0 transition-transform duration-700">
                  <User className="h-12 w-12 text-primary -rotate-[15deg]" />
                </div>
                
                {/* Decorative dots */}
                <div className="absolute -top-4 -right-4 h-8 w-8 bg-primary/10 rounded-full blur-xl"></div>
                <div className="absolute -bottom-6 -left-6 h-12 w-12 bg-primary/5 rounded-full blur-2xl"></div>
              </div>
              
              <h3 className="text-[28px] font-black text-foreground tracking-tighter mb-4 text-center">Your Private Space</h3>
              <p className="text-muted-foreground/60 text-center max-w-[320px] leading-relaxed font-bold tracking-tight text-[15px]">
                Connect with your team members through high-quality, encrypted direct messaging.
              </p>
              
              <div className="mt-12 flex items-center gap-3">
                 <div className="h-1.5 w-1.5 rounded-full bg-primary/20"></div>
                 <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse"></div>
                 <div className="h-1.5 w-1.5 rounded-full bg-primary/20"></div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}


