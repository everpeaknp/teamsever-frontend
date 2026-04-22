'use client';

import { useState, useEffect, useRef, KeyboardEvent, useCallback } from 'react';
import { Send, Smile, Loader2, Check, CheckCheck, AlertCircle, RefreshCw, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat, ChatMessage } from '@/hooks/useChat';
import { useChatStore, generateDMRoomId } from '@/store/useChatStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAuthStore } from '@/store/useAuthStore';
import { format, isToday, isYesterday } from 'date-fns';

interface ChatWindowProps {
  workspaceId?: string;
  channelId?: string; // NEW: Support for channels
  conversationId?: string;
  userId?: string; // For DM - the other user's ID
  type: 'workspace' | 'direct';
  title: string;
  isAdmin?: boolean;
}

import { EditChannelModal } from './EditChannelModal';
import { MessageBubble } from './MessageBubble';

export const ChatWindow = ({ workspaceId, channelId, conversationId, userId, type, title, isAdmin }: ChatWindowProps) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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

  // Generate room ID
  const roomId = type === 'workspace' 
    ? (channelId ? `channel_${channelId}` : `workspace_${workspaceId}`) 
    : userId && currentUserId 
      ? generateDMRoomId(currentUserId, userId)
      : conversationId || '';

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
    setActiveRoom
  } = useChatStore();
  
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
    }

    // Cleanup: clear active room when leaving component
    return () => {
      setActiveRoom('');
    };
  }, [roomId, type, workspaceId, userId, currentUserId, getRoom, createRoom, setActiveRoom]);

  // Get draft from store
  const draft = getDraft(roomId);
  const [inputValue, setInputValue] = useState(draft);

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
    channelId, // NEW
    conversationId, 
    userId, 
    type,
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
    
    setLocalMessages(merged);
  }, [fetchedMessages, optimisticMessages]);

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
    <div className="flex-1 flex flex-col bg-[#FDFDFD] dark:bg-background h-full overflow-hidden relative">
      {/* Header - Sticky & Premium */}
      <div className="h-16 border-b border-border/40 bg-background/80 backdrop-blur-xl px-6 flex items-center justify-between flex-shrink-0 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shadow-sm">
            {type === 'workspace' ? '#' : '@'}
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-foreground tracking-tight">{title}</h2>
            <p className="text-[11px] text-muted-foreground font-medium">
              {type === 'workspace' ? 'Workspace Channel' : 'Direct Message'}
            </p>
          </div>
        </div>
        {type === 'workspace' && channelId && channelId !== 'general' && isAdmin && (
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="p-2 hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-all active:scale-95"
            title="Channel Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}
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
        className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(155, 155, 155, 0.2) transparent'
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
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground min-h-[400px] h-full">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Send className="h-6 w-6 text-primary ml-1" />
            </div>
            <h3 className="text-foreground font-medium text-lg mb-1">Start the conversation</h3>
            <p className="text-sm text-center max-w-[250px]">Send a message to kick things off.</p>
          </div>
        ) : (
          <div className="flex flex-col justify-end min-h-full">
            {localMessages.map((message, index) => {
              const showAvatar = shouldShowAvatar(message, index);
              const isSystemMessage = message.type === 'system';
              const isOwnMessage = message.sender._id === currentUserId;

              return (
                <MessageBubble
                  key={message._id || `msg-${index}`}
                  message={message}
                  isOwn={isOwnMessage}
                  showAvatar={showAvatar}
                  isSystemMessage={isSystemMessage}
                  onRetry={message.failed ? () => {
                    setInputValue(message.content);
                    setOptimisticMessages(prev => prev.filter(m => m._id !== message._id));
                    removeMessage(roomId, message._id);
                  } : undefined}
                />
              );
            })}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-2 text-xs text-muted-foreground flex-shrink-0">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Input Area - Polished & Premium */}
      <div className="border-t border-border/40 p-4 pb-4 md:pb-6 bg-background/80 backdrop-blur-xl sticky bottom-0 z-20">
        <div className="max-w-4xl mx-auto flex gap-3 items-end">
          <div className="flex-1 relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/0 rounded-[18px] blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-end bg-card border border-border/60 focus-within:border-primary/50 shadow-sm rounded-[16px] transition-colors">
              <button
                type="button"
                className="p-3 text-muted-foreground/60 hover:text-foreground transition-colors"
                title="Add emoji"
              >
                <Smile className="h-[22px] w-[22px]" />
              </button>
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message..."
                className="min-h-[48px] max-h-32 resize-none py-3 px-1 border-none focus-visible:ring-0 shadow-none bg-transparent flex-1 text-[15px]"
                rows={1}
                autoFocus
              />
            </div>
          </div>
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            size="icon"
            className={cn(
              "h-[48px] w-[48px] flex-shrink-0 rounded-[16px] transition-all duration-300",
              inputValue.trim() ? "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0" : "bg-muted text-muted-foreground opacity-50"
            )}
          >
            <Send className="h-5 w-5 ml-0.5" />
          </Button>
        </div>
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[11px] font-medium text-muted-foreground mt-3 px-1">
          <span className="hidden sm:inline">Press <kbd className="font-sans px-1.5 py-0.5 bg-muted rounded-md border border-border/50 shadow-sm">Enter</kbd> to send</span>
          <span className="sm:hidden">Press send to transmit</span>
        </div>
      </div>
    </div>
  );
};
