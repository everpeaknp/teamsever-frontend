'use client';

import { useState, useEffect, useRef, KeyboardEvent, useCallback } from 'react';
import { Send, Smile, Loader2, Check, CheckCheck, AlertCircle, RefreshCw, Settings, Hash, User } from 'lucide-react';
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

import { useSocket } from '@/contexts/SocketContext';
import { EditChannelModal } from './EditChannelModal';
import { MessageBubble } from './MessageBubble';
import { motion, AnimatePresence } from 'framer-motion';

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
    setMessages: setMessagesInStore,
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
    socket,
    isConnected, 
    connectionState, 
    reconnect 
  } = useSocket();

  const {
    messages,
    setMessages,
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
    onInitialLoad: handleInitialLoad
  });

  // Sync messages to store
  useEffect(() => {
    if (messages.length > 0 && roomId) {
      setMessagesInStore(roomId, messages);
    }
  }, [messages, roomId, setMessagesInStore]);

  // Auto-focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [roomId]); // Re-focus when room changes

  // Auto-scroll and Read Receipts
  useEffect(() => {
    if (messagesContainerRef.current && shouldAutoScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      if (distanceFromBottom < 100) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }

    // Emit read receipt for the last message if it's from someone else
    if (messages.length > 0 && isConnected) {
      const lastMessage = messages[messages.length - 1];
      const isFromOthers = lastMessage.sender._id !== currentUserId;
      
      if (isFromOthers) {
        socket?.emit('message:read', {
          messageId: lastMessage._id,
          channelId,
          conversationId
        });
      }
    }
  }, [messages, isConnected, currentUserId, socket, channelId, conversationId]);

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
    if (scrollTop < 100 && hasMore && !loadingMore && !loading && messages.length > 0) {
      loadMore();
    }
    
    // Near Bottom means we should auto-scroll new messages at the bottom
    setIsNearBottom(scrollHeight - scrollTop - clientHeight < 100);
  };

  const handleSendRetry = (message: ChatMessage) => {
    setInputValue(message.content);
    removeMessage(roomId, message._id);
    // Remove from hook state as well
    setMessages(prev => prev.filter(m => m._id !== message._id && m.tempId !== message._id));
  };

  // Handle send message with optimistic update
  const handleSend = async () => {
    if (!inputValue.trim() || !currentUserId || !currentUserName) return;

    const messageContent = inputValue.trim();
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    
    // Create optimistic message
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
      sending: true,
      failed: false,
      ...(type === 'workspace' ? { workspace: workspaceId } : { conversation: conversationId }),
    };

    // Add to local state and store
    setMessages(prev => [...prev, optimisticMessage]);
    addMessage(roomId, optimisticMessage);

    setInputValue('');
    clearDraft(roomId);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Auto-scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      // Send with callback acknowledgment
      await sendMessage(messageContent, tempId);
    } catch (err) {
      console.error('[ChatWindow] Send failed:', err);
      // Mark as failed
      setMessages(prev => 
        prev.map(m => m.tempId === tempId ? { ...m, sending: false, failed: true } : m)
      );
      updateMessage(roomId, tempId, { sending: false, failed: true });
    }
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
    
    const prevMessage = messages[index - 1];
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
    <div className="flex-1 flex flex-col bg-[#FDFDFD] dark:bg-[#0B0E11] h-full overflow-hidden relative">
      {/* Header - Sticky & Premium Glassmorphism */}
      <div className="h-[76px] border-b border-border/30 bg-background/70 backdrop-blur-3xl px-8 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-4 group cursor-default">
          <div className="relative">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary shadow-sm group-hover:scale-105 transition-all duration-500 group-hover:rotate-3">
              {type === 'workspace' ? <Hash className="h-5.5 w-5.5" /> : <User className="h-5.5 w-5.5" />}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 border-2 border-background rounded-full shadow-sm" />
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-extrabold text-foreground tracking-tight leading-tight">{title}</h2>
              {type === 'workspace' && (
                <span className="text-[10px] font-black text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full uppercase tracking-widest border border-primary/10">Public</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground/60 font-bold uppercase tracking-widest mt-0.5">
              {type === 'workspace' ? 'Workspace Channel' : 'Direct Message'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 mr-4">
             {/* Mock avatar stack for premium feel */}
             {[1, 2, 3].map((i) => (
               <div key={i} className="h-7 w-7 rounded-full border-2 border-background bg-muted shadow-sm overflow-hidden scale-90 hover:scale-110 hover:z-10 transition-all cursor-pointer">
                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="member" />
               </div>
             ))}
             <div className="h-7 w-7 rounded-full border-2 border-background bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary scale-90">+12</div>
          </div>

          <div className="h-8 w-[1px] bg-border/40 mx-2" />

          {type === 'workspace' && channelId && channelId !== 'general' && isAdmin && (
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="p-2.5 hover:bg-primary/5 rounded-2xl text-muted-foreground hover:text-primary transition-all active:scale-95 border border-transparent hover:border-primary/10 group/settings"
              title="Channel Settings"
            >
              <Settings className="h-5 w-5 group-hover/settings:rotate-90 transition-transform duration-500" />
            </button>
          )}
        </div>
      </div>

      {/* Connection Status Banner */}
      <AnimatePresence>
        {connectionState !== 'connected' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={cn(
              "w-full text-[10px] font-black uppercase tracking-[0.2em] py-2 flex items-center justify-center gap-2 z-40 transition-colors",
              connectionState === 'reconnecting' || connectionState === 'connecting' 
                ? "bg-amber-500/10 text-amber-600 border-b border-amber-500/20"
                : "bg-red-500/10 text-red-600 border-b border-red-500/20"
            )}
          >
            {connectionState === 'reconnecting' || connectionState === 'connecting' ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Reconnecting to server...
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" />
                Connection lost. <button onClick={reconnect} className="underline ml-1 hover:text-red-700">Retry now</button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {workspaceId && channelId && (
        <EditChannelModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          workspaceId={workspaceId}
          channelId={channelId}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}

      {/* Messages - Scrollable Container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 md:px-10 py-8 space-y-2 custom-scrollbar bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/[0.02] via-transparent to-transparent"
      >
        {/* Load More Indicator */}
        {hasMore && !loadingMore && messages.length > 0 && (
          <div className="flex justify-center mb-8">
            <button 
              onClick={loadMore}
              className="text-[11px] font-bold text-primary/60 hover:text-primary bg-primary/5 hover:bg-primary/10 px-4 py-1.5 rounded-full transition-all tracking-widest uppercase border border-primary/5"
            >
              Load Older Messages
            </button>
          </div>
        )}

        {loadingMore && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 bg-muted/30 px-4 py-2 rounded-full border border-border/20">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Fetching...</span>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground min-h-[500px] h-full">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-24 w-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-[32px] flex items-center justify-center mb-8 shadow-inner"
            >
              <Send className="h-10 w-10 text-primary ml-1 rotate-12" />
            </motion.div>
            <h3 className="text-foreground font-extrabold text-2xl mb-2 tracking-tight">Start the conversation</h3>
            <p className="text-sm text-center max-w-[280px] text-muted-foreground font-medium leading-relaxed">
              Be the first to say hello and kick off a meaningful discussion.
            </p>
          </div>
        ) : (
          <div className="flex flex-col justify-end min-h-full">
            {messages.map((message, index) => {
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
                    handleSendRetry(message);
                  } : undefined}
                />
              );
            })}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator - Modern Floating Style */}
      {typingUsers.length > 0 && (
        <div className="absolute bottom-[100px] left-8 z-20">
          <div className="bg-background/80 backdrop-blur-md border border-border/40 px-3 py-1.5 rounded-2xl shadow-xl flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce"></span>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {typingUsers.length === 1 ? `${typingUsers[0]} is typing` : 'Several people are typing'}
            </span>
          </div>
        </div>
      )}

      {/* Input Area - Floating & Premium */}
      <div className="px-6 pb-8 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent relative z-30">
        <div className="max-w-4xl mx-auto">
          <div className="relative group">
            {/* Ambient Background Glow */}
            <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent rounded-[32px] blur-2xl opacity-0 group-focus-within:opacity-100 transition-all duration-700 pointer-events-none"></div>
            
            <div className="relative bg-white dark:bg-[#1A1D21] border border-border/50 focus-within:border-primary/50 shadow-[0_4px_20px_rgba(0,0,0,0.04)] focus-within:shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[28px] transition-all duration-500 overflow-hidden p-2 flex items-end">
              <button
                type="button"
                className="p-3 text-muted-foreground/40 hover:text-primary transition-all hover:bg-primary/5 rounded-2xl active:scale-90"
                title="Add emoji"
              >
                <Smile className="h-6 w-6" />
              </button>
              
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${title}...`}
                className="min-h-[48px] max-h-60 resize-none py-3 px-2 border-none focus-visible:ring-0 shadow-none bg-transparent flex-1 text-[15px] font-medium leading-relaxed placeholder:text-muted-foreground/30 placeholder:font-normal selection:bg-primary/10"
                rows={1}
                autoFocus
              />

              <div className="flex items-center gap-2 p-1">
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || sending}
                  size="icon"
                  className={cn(
                    "h-11 w-11 flex-shrink-0 rounded-[20px] transition-all duration-500 shadow-sm",
                    inputValue.trim() 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0" 
                      : "bg-muted/50 text-muted-foreground/20 opacity-40 cursor-not-allowed"
                  )}
                >
                  <Send className={cn("h-5 w-5 transition-transform duration-500", inputValue.trim() && "rotate-12 translate-x-0.5")} />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.15em] mt-4 px-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5 hover:text-muted-foreground/60 transition-colors cursor-default">
                <span className="bg-muted/50 px-1.5 py-0.5 rounded text-[9px]">ENTER</span>
                <span>to send</span>
              </div>
              <div className="flex items-center gap-1.5 hover:text-muted-foreground/60 transition-colors cursor-default">
                <span className="bg-muted/50 px-1.5 py-0.5 rounded text-[9px]">SHIFT + ENTER</span>
                <span>new line</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 group cursor-default">
              <CheckCheck className="h-3 w-3 text-green-500/50 group-hover:text-green-500 transition-colors" />
              <span className="group-hover:text-muted-foreground/60 transition-colors">Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

