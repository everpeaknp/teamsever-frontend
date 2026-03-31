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
    <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      {/* Header - Fixed */}
      <div className="h-14 border-b border-border px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>
        {type === 'workspace' && channelId && channelId !== 'general' && isAdmin && (
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
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
                    <UserAvatar user={message.sender} className="h-8 w-8 flex-shrink-0" />
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
                  <UserAvatar user={message.sender} className="h-8 w-8 flex-shrink-0" />
                )}

                <div className="flex flex-col max-w-[85%]">
                  {showAvatar && (
                    <div className="flex items-center gap-2 mb-1.5 opacity-90">
                      <span className="font-bold text-xs text-foreground">
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

      {/* Input Area - Improved padding and layout */}
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
    </div>
  );
};
