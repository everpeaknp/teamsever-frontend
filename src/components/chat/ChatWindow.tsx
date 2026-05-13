'use client';

import { useState, useEffect, useRef, KeyboardEvent, useCallback } from 'react';
import { Send, Smile, Loader2, Check, CheckCheck, AlertCircle, RefreshCw, Settings, Github, Filter, ArrowLeft, ExternalLink, GitBranch, Calendar as CalendarIcon, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat, ChatMessage } from '@/hooks/useChat';
import { useChatStore, generateDMRoomId } from '@/store/useChatStore';
import { useProfileModalStore } from '@/store/useProfileModalStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/axios';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isYesterday, isWithinInterval, startOfDay, endOfDay, subDays, startOfWeek } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as UICalendar } from '@/components/ui/calendar';

interface ChatWindowProps {
  workspaceId?: string;
  channelId?: string; // NEW: Support for channels
  conversationId?: string;
  userId?: string; // For DM - the other user's ID
  type: 'workspace' | 'direct';
  title: string;
  isAdmin?: boolean;
  onMenuClick?: () => void;
}

import { EditChannelModal } from './EditChannelModal';

export const ChatWindow = ({ workspaceId, channelId, conversationId, userId, type, title, isAdmin, onMenuClick }: ChatWindowProps) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | 'week' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date());
  const [filterUserId, setFilterUserId] = useState<string>('all');
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastScrollHeightRef = useRef<number>(0);
  const shouldAutoScrollRef = useRef(true);

  // Get current user from store
  const { user: currentUser } = useAuthStore();
  // Fall back to localStorage in case Zustand store hasn't been hydrated yet
  const currentUserId = currentUser?._id || (typeof window !== 'undefined' ? localStorage.getItem('userId') : null);
  const currentUserName = currentUser?.name || (typeof window !== 'undefined' ? localStorage.getItem('userName') : null);
  const currentUserEmail = currentUser?.email || (typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null);

  // Generate room ID - prefer conversationId for DMs to match socket events
  const roomId = type === 'workspace' 
    ? (channelId ? `channel_${channelId}` : `workspace_${workspaceId}`) 
    : conversationId || (userId && currentUserId ? generateDMRoomId(currentUserId, userId) : '');

  // Zustand store
  const { 
    getRoom, 
    createRoom, 
    addMessage, 
    setMessages,
    updateMessage,
    removeMessage,
    getDraft, 
    setDraft, 
    clearDraft,
    setActiveRoom,
    clearUnread
  } = useChatStore();
  const { openProfile } = useProfileModalStore();
  
  // Get or create room
  useEffect(() => {
    if (userId && !currentUserId) return; // Wait for current userId

    if (roomId) {
      const room = getRoom(roomId);
      if (!room) {
        createRoom(roomId, type, workspaceId, userId ? [currentUserId!, userId] : undefined);
      }
      // Set active room - this also clears unread count in useChatStore
      setActiveRoom(roomId);
      if (type === 'workspace' && workspaceId) {
        clearUnread(`workspace_${workspaceId}`);
      }
    }

    // Cleanup: clear active room when leaving component
    return () => {
      setActiveRoom('');
    };
  }, [roomId, type, workspaceId, userId, currentUserId, getRoom, createRoom, setActiveRoom, clearUnread]);

  useEffect(() => {
    const syncReadState = async () => {
      try {
        if (type === 'workspace' && workspaceId) {
          await api.patch(`/workspaces/${workspaceId}/chat/read`);
        } else if (type === 'direct' && conversationId && workspaceId) {
          await api.patch(`/dm/${conversationId}/read?workspaceId=${workspaceId}`);
        }
      } catch (error) {
        console.error('[ChatWindow] Failed to sync read state:', error);
      }
    };

    if ((type === 'workspace' && workspaceId) || (type === 'direct' && conversationId)) {
      syncReadState();
    }
  }, [type, workspaceId, conversationId]);

  // Get draft from store
  const draft = getDraft(roomId);
  const [inputValue, setInputValue] = useState(draft);

  // Fetch workspace members for filtering
  useEffect(() => {
    if (workspaceId && title.includes('Commit Log')) {
      const fetchMembers = async () => {
        try {
          const response = await api.get(`/workspaces/${workspaceId}`);
          if (response.data.success) {
            setWorkspaceMembers(response.data.data.members || []);
          }
        } catch (err) {
          console.error('Failed to fetch workspace members for filtering:', err);
        }
      };
      fetchMembers();
    }
  }, [workspaceId, title]);

  // Sync draft to store
  useEffect(() => {
    if (roomId && inputValue !== draft) {
      setDraft(roomId, inputValue);
    }
  }, [inputValue, roomId, draft, setDraft]);

  // Load draft when room changes
  useEffect(() => {
    setInputValue(getDraft(roomId));
  }, [roomId, getDraft]);

  // Callback for scrolling to bottom after initial load
  const handleInitialLoad = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  const {
    messages: fetchedMessages,
    loading,
    loadingMore,
    sending,
    error,
    hasMore,
    typingUsers,
    sendMessage,
    sendTypingIndicator,
    loadMore
  } = useChat({ 
    workspaceId, 
    channelId,
    conversationId, 
    userId, 
    type,
    filterUserId: filterUserId === 'all' ? undefined : filterUserId,
    onInitialLoad: handleInitialLoad
  });

  // Local state for messages (includes optimistic messages)
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);

  // Merge fetched messages with optimistic messages
  useEffect(() => {
    // Combine fetched messages with optimistic messages that haven't been confirmed yet
    const fetchedIds = new Set(fetchedMessages.map(m => m._id));
    
    // Keep only optimistic messages that haven't been replaced by real messages
    const pendingOptimistic = optimisticMessages.filter(m => 
      m.tempId && !fetchedIds.has(m.tempId) && (m.sending || m.failed)
    );
    
    // Merge and sort ASCENDING (oldest at top)
    const merged = [...fetchedMessages, ...pendingOptimistic];
    merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // Apply filters
    const filtered = merged.filter(m => {
      if (dateFilter === 'all') return true;
      
      const msgDate = new Date(m.createdAt);
      const now = new Date();
      
      if (dateFilter === 'today') return isToday(msgDate);
      if (dateFilter === 'yesterday') return isYesterday(msgDate);
      if (dateFilter === '7days') return isWithinInterval(msgDate, { start: startOfDay(subDays(now, 7)), end: endOfDay(now) });
      if (dateFilter === 'week') return isWithinInterval(msgDate, { start: startOfWeek(now), end: endOfDay(now) });
      if (dateFilter === 'custom' && customDate) return isWithinInterval(msgDate, { start: startOfDay(customDate), end: endOfDay(customDate) });
      
      return true;
    });
    
    setLocalMessages(filtered);
  }, [fetchedMessages, optimisticMessages, dateFilter, customDate]);

  // Sync messages to store
  useEffect(() => {
    if (fetchedMessages.length > 0 && roomId) {
      setMessages(roomId, fetchedMessages);
    }
  }, [fetchedMessages, roomId, setMessages]);

  // Auto-focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [roomId]); // Re-focus when room changes

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current && shouldAutoScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // If we are already near bottom or just sent a message, keep at bottom
      if (distanceFromBottom < 100) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [localMessages]);

  // Preserve scroll position when loading more messages
  useEffect(() => {
    if (loadingMore) {
      lastScrollHeightRef.current = messagesContainerRef.current?.scrollHeight || 0;
    } else if (lastScrollHeightRef.current > 0 && messagesContainerRef.current) {
      const newScrollHeight = messagesContainerRef.current.scrollHeight;
      const heightDifference = newScrollHeight - lastScrollHeightRef.current;
      if (heightDifference > 0) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollTop + heightDifference;
      }
      lastScrollHeightRef.current = 0;
    }
  }, [loadingMore, messagesContainerRef]);

  // Check if user is scrolling
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    
    // Infinite Scroll: Load more when reaching the TOP (older messages are at the top)
    if (scrollTop < 100 && hasMore && !loadingMore && !loading && localMessages.length > 0) {
      loadMore();
    }
    
    // Near Bottom means we should auto-scroll new messages at the bottom
    setIsNearBottom(scrollHeight - scrollTop - clientHeight < 100);
  };

  // Handle send message with optimistic update
  const handleSend = async () => {
    if (!inputValue.trim() || sending || !currentUserId || !currentUserName) return;

    const messageContent = inputValue.trim();
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    
    // Create optimistic message with sending status
    const optimisticMessage: ChatMessage = {
      _id: tempId,
      tempId: tempId,
      sender: {
        _id: currentUserId,
        name: currentUserName,
        email: currentUserEmail || '',
        profilePicture: currentUser?.profilePicture,
        avatar: currentUser?.avatar
      },
      content: messageContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: 'text',
      sending: true,  // Mark as sending
      failed: false,
      ...(type === 'workspace' ? { workspace: workspaceId } : { conversation: conversationId }),
    };

    console.log('[ChatWindow] Adding optimistic message:', tempId);

    // Add optimistic message to optimistic state
    setOptimisticMessages(prev => [...prev, optimisticMessage]);

    // Also add to Zustand store
    addMessage(roomId, optimisticMessage);

    // Clear input immediately for better UX
    setInputValue('');
    clearDraft(roomId);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Scroll to bottom immediately (newest message)
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    // Send message to backend
    try {
      await sendMessage(messageContent);
      
      console.log('[ChatWindow] Message sent successfully, waiting for socket confirmation');
      
      // Update optimistic message status
      setOptimisticMessages(prev => 
        prev.map(m => 
          m._id === tempId 
            ? { ...m, sending: false } 
            : m
        )
      );
      
      // Update in store
      updateMessage(roomId, tempId, { sending: false });
      
    } catch (error) {
      console.error('[ChatWindow] Failed to send message:', error);
      
      // Mark message as failed in optimistic state
      setOptimisticMessages(prev => 
        prev.map(m => 
          m._id === tempId 
            ? { ...m, sending: false, failed: true } 
            : m
        )
      );
      
      // Update in store
      updateMessage(roomId, tempId, { 
        sending: false, 
        failed: true 
      });
    }

    // Focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  // Handle keyboard events - Enter to send
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle input change with typing indicator
  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    if (value.trim() && type === 'workspace') {
      sendTypingIndicator();
    }

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Format message timestamp
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  // Group messages by sender
  const shouldShowAvatar = (message: ChatMessage, index: number) => {
    if (index === 0) return true;
    
    const prevMessage = localMessages[index - 1];
    if (!prevMessage) return true;
    
    // Show avatar if different sender or more than 5 minutes apart
    const timeDiff = new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime();
    return prevMessage.sender._id !== message.sender._id || timeDiff > 5 * 60 * 1000;
  };

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <div className="text-muted-foreground">Loading messages...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <div className="text-destructive text-lg font-semibold mb-2">Failed to load messages</div>
          <div className="text-muted-foreground mb-4">{error}</div>
          <Button onClick={() => window.location.reload()} variant="outline">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      {/* Header - Fixed */}
      <div className="h-14 border-b border-border px-4 md:px-6 flex items-center justify-between flex-shrink-0 bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            className="md:hidden p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
            onClick={onMenuClick}
            aria-label={type === 'direct' ? 'Back to conversations' : 'Open filters'}
          >
            {type === 'direct' ? (
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Filter className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          <h2 className="text-base md:text-lg font-bold text-foreground truncate">{title}</h2>
          
          {title.includes('Commit Log') && (
            <div className="flex items-center gap-1 ml-4 bg-muted/20 p-1 rounded-lg border border-border/30 overflow-x-auto no-scrollbar">
              {(['all', 'today', 'yesterday', '7days', 'week'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setDateFilter(f)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-medium rounded-md transition-all whitespace-nowrap",
                    dateFilter === f 
                      ? "bg-background text-primary shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                  )}
                >
                  {f === 'all' && 'All'}
                  {f === 'today' && 'Today'}
                  {f === 'yesterday' && 'Yesterday'}
                  {f === '7days' && '7d'}
                  {f === 'week' && 'Week'}
                </button>
              ))}
              
              <Popover>
                <PopoverContent className="w-auto p-0" align="end">
                  <UICalendar
                    mode="single"
                    selected={customDate}
                    onSelect={(date) => {
                      setCustomDate(date);
                      if (date) setDateFilter('custom');
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <div className="w-[1px] h-4 bg-border/40 mx-1 hidden sm:block" />

              {/* User Filter Dropdown */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
                      filterUserId !== 'all' 
                        ? "bg-background text-primary shadow-sm" 
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    )}
                  >
                    <User className="w-3 h-3" />
                    {filterUserId === 'all' ? 'Users' : workspaceMembers.find(m => (m.user?._id || m.user) === filterUserId)?.user?.name || 'User'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="end">
                  <div className="max-h-60 overflow-y-auto">
                    <button
                      onClick={() => setFilterUserId('all')}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[11px] font-medium rounded-md transition-colors",
                        filterUserId === 'all' ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      )}
                    >
                      All Contributors
                    </button>
                    {workspaceMembers.map((member) => {
                      const mId = member.user?._id || member.user;
                      return (
                        <button
                          key={mId}
                          onClick={() => setFilterUserId(mId)}
                          className={cn(
                            "w-full text-left px-3 py-2 text-[11px] font-medium rounded-md transition-colors flex items-center gap-2",
                            filterUserId === mId ? "bg-primary/10 text-primary" : "hover:bg-muted"
                          )}
                        >
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={member.user?.profilePicture} />
                            <AvatarFallback className="text-[8px]">{getInitials(member.user?.name || 'U')}</AvatarFallback>
                          </Avatar>
                          <span className="truncate">{member.user?.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          {type === 'direct' && userId && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition-all hidden sm:flex"
              onClick={() => openProfile(userId)}
            >
              <User className="w-3.5 h-3.5" />
              View Profile
            </Button>
          )}
          {type === 'workspace' && channelId && !title.includes('General') && !title.includes('Commit Log') && isAdmin && (
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
              title="Channel Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {workspaceId && channelId && (
        <EditChannelModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          workspaceId={workspaceId}
          channelId={channelId}
          onSuccess={() => {
            // Ideally refetch channel list - this is handled by state in parent usually
            window.location.reload(); // Simple sync for now or we could use custom events
          }}
        />
      )}

      {/* Messages - Scrollable */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4 chat-scrollbar"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(148, 163, 184, 0.45) transparent'
        }}
      >
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Load More Indicator at the top (older messages) */}
        {hasMore && !loadingMore && localMessages.length > 0 && (
          <div className="flex justify-center p-4">
            <span className="text-xs text-muted-foreground italic">Scroll up for older messages</span>
          </div>
        )}

        {loadingMore && (
          <div className="flex justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {localMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground min-h-[300px]">
            <div className="text-center p-8 bg-muted/10 rounded-2xl border border-dashed border-border/50 max-w-sm mx-auto">
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          localMessages.map((message, index) => {
            const showAvatar = shouldShowAvatar(message, index);
            const isSystemMessage = message.type === 'system';
            const isOwnMessage = message.sender._id === currentUserId;

            if (isSystemMessage) {
              return (
                <div key={message._id} className="flex justify-center">
                  <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {message.content}
                  </div>
                </div>
              );
            }

            if (message.type === 'github_commit') {
              return (
                <div key={message._id} className="group relative pl-8 pr-4 py-4 border-l-2 border-border/30 hover:border-primary/30 transition-colors ml-6">
                  {/* Timeline Dot with Avatar/Icon */}
                  <div className="absolute -left-3 top-5 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center group-hover:border-primary/50 transition-colors overflow-hidden">
                    {message.sender && typeof message.sender === 'object' && (message.sender as any).profilePicture ? (
                      <img 
                        src={(message.sender as any).profilePicture} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Github className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-bold text-foreground">
                        {message.sender && typeof message.sender === 'object' && (message.sender as any).name 
                          ? (message.sender as any).name 
                          : (message.metadata?.pusher || (message.metadata?.commits && message.metadata.commits[0]?.author) || 'GitHub Bot')}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <GitBranch className="h-3 w-3" />
                        <span>{message.metadata?.repoName}</span>
                        <span className="text-border">/</span>
                        <span className="text-primary/70">{message.metadata?.branchName || 'main'}</span>
                        {message.metadata?.spaceName && (
                          <>
                            <span className="mx-1 text-muted-foreground/30">•</span>
                            <span className="bg-muted px-1.5 py-0.5 rounded text-[9px] text-muted-foreground font-bold tracking-tight">
                              {message.metadata.spaceName}
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 ml-auto">
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                        {message.content}
                      </p>

                      {message.metadata?.commits && message.metadata.commits.length > 0 && (
                        <div className="space-y-3 pl-4 border-l border-border/50">
                          {message.metadata.commits.map((commit: any, i: number) => (
                            <div key={i} className="space-y-1 group/commit">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-foreground/70">
                                  {commit.author}
                                </span>
                                {commit.url && commit.url !== '#' && (
                                  <a 
                                    href={commit.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[9px] text-muted-foreground hover:text-primary transition-colors font-mono"
                                  >
                                    {commit.url.split('/').pop()?.substring(0, 7)}
                                  </a>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground leading-snug">
                                {commit.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {message.metadata?.compareUrl && (
                        <a 
                          href={message.metadata.compareUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline"
                        >
                          View comparison <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // Own messages on the right, others on the left
            if (isOwnMessage) {
              return (
                <div
                  key={message._id}
                  className={cn(
                    'flex gap-3 justify-end',
                    !showAvatar && 'mr-11'
                  )}
                >
                  <div className="flex flex-col items-end max-w-[85%]">
                    {showAvatar && (
                      <div className="flex items-center gap-2 mb-1.5 opacity-90">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {formatMessageTime(message.createdAt)}
                        </span>
                        <span className="font-bold text-xs text-primary">
                          You
                        </span>
                      </div>
                    )}
                    <div className={cn(
                      "px-4 py-2 rounded-lg text-sm whitespace-pre-wrap break-words w-fit min-w-[40px] max-w-full",
                      message.failed 
                        ? "bg-destructive/20 text-destructive border border-destructive" 
                        : "bg-primary text-primary-foreground"
                    )}>
                      {message.content}
                      
                      {/* Status indicators */}
                      <div className="flex items-center gap-1 mt-1 justify-end text-xs opacity-70">
                        {message.sending && (
                          <><Loader2 className="h-3 w-3 animate-spin" /> Sending...</>
                        )}
                        {message.failed && (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>Failed</span>
                            <button
                              onClick={() => {
                                setInputValue(message.content);
                                // Remove from optimistic state
                                setOptimisticMessages(prev => prev.filter(m => m._id !== message._id));
                                // Remove from store
                                removeMessage(roomId, message._id);
                              }}
                              className="underline hover:no-underline ml-1"
                            >
                              Retry
                            </button>
                          </div>
                        )}
                        {!message.sending && !message.failed && !message.tempId && (
                          <CheckCheck className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                  </div>

                  {showAvatar ? (
                    <UserAvatar 
                      user={message.sender} 
                      className="h-8 w-8 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
                      onClick={() => openProfile(message.sender._id)}
                    />
                  ) : (
                    <div className="w-8 flex-shrink-0" />
                  )}
                </div>
              );
            }

            // Other users' messages on the left
            return (
              <div
                key={message._id}
                className={cn(
                  'flex gap-3 items-start',
                  !showAvatar && 'ml-11'
                )}
              >
                {showAvatar && (
                  <UserAvatar 
                    user={message.sender} 
                    className="h-8 w-8 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
                    onClick={() => openProfile(message.sender._id)}
                  />
                )}

                <div className="flex flex-col max-w-[85%]">
                  {showAvatar && (
                    <div className="flex items-center gap-2 mb-1.5 opacity-90">
                      <span 
                        className="font-bold text-xs text-foreground cursor-pointer hover:text-primary transition-colors"
                        onClick={() => openProfile(message.sender._id)}
                      >
                        {message.sender.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className="bg-muted px-4 py-2 rounded-lg text-sm text-foreground whitespace-pre-wrap break-words w-fit min-w-[40px] max-w-full">
                    {message.content}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-2 text-xs text-muted-foreground flex-shrink-0">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Input Area - Hidden for Commit Log */}
      {!title.includes('Commit Log') && (
        <div className="border-t border-border p-4 pb-4 md:pb-6 bg-background/95 backdrop-blur-sm sticky bottom-0 z-10 transition-all">
          <div className="max-w-4xl mx-auto flex gap-2 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="min-h-[44px] max-h-32 resize-none pr-10 rounded-xl bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary shadow-none"
                rows={1}
                autoFocus
              />
              <button
                type="button"
                className="absolute right-3 bottom-2.5 p-1 hover:bg-muted rounded-full transition-colors"
                title="Add emoji"
              >
                <Smile className="h-5 w-5 text-muted-foreground/60" />
              </button>
            </div>
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || sending}
              size="icon"
              className="h-[44px] w-[44px] flex-shrink-0 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] text-muted-foreground mt-2 px-1">
            <span className="hidden sm:inline">Shift + Enter for new line • Enter to send</span>
            <span className="sm:hidden">Press send to transmit</span>
          </div>
        </div>
      )}
    </div>
  );
};
