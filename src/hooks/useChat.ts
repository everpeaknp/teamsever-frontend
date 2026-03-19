import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, joinDM, leaveDM } from '@/lib/socket';
import { useChatStore } from '@/store/useChatStore';
import { api } from '@/lib/axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ChatMessage {
  _id: string;
  workspace?: string;
  conversation?: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  content: string;
  type?: 'text' | 'system';
  mentions?: string[];
  readBy?: string[];
  createdAt: string;
  updatedAt: string;
  // Optimistic update fields
  sending?: boolean;  // True while message is being sent
  failed?: boolean;   // True if message failed to send
  tempId?: string;    // Temporary ID for optimistic messages
}

interface UseChatOptions {
  workspaceId?: string;
  conversationId?: string;
  userId?: string; // For DM - the other user's ID
  type: 'workspace' | 'direct';
  onInitialLoad?: () => void; // Callback after initial messages load
}

export const useChat = ({ workspaceId, conversationId, userId, type, onInitialLoad }: UseChatOptions) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onInitialLoadRef = useRef(onInitialLoad);
  const socket = getSocket();
  
  // Update ref when callback changes
  useEffect(() => {
    onInitialLoadRef.current = onInitialLoad;
  }, [onInitialLoad]);
  
  // Get Zustand store actions
  const { addMessage: addMessageToStore } = useChatStore();

  // Fetch initial messages
  const fetchMessages = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      if (!token) {
        console.error('[useChat] No token found');
        setError('Authentication required. Please login again.');
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      let response;
      const limit = 50; // Increased to 50 for better UX - load more messages initially
      
      if (type === 'workspace' && workspaceId) {
        response = await api.get(`/workspaces/${workspaceId}/chat?page=${pageNum}&limit=${limit}`);
      } else if (type === 'direct' && conversationId) {
        response = await api.get(`/dm/${conversationId}/messages?page=${pageNum}&limit=${limit}`);
      } else {
        console.error('[useChat] Invalid parameters');
        setError('Invalid chat configuration');
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (response?.data?.success) {
        const newMessages = response.data.data || [];
        const pagination = response.data.pagination;
        
        if (append) {
          // Prepend older messages (they come in chronological order within the page)
          setMessages(prev => [...newMessages, ...prev]);
        } else {
          // Initial load - set messages directly
          setMessages(newMessages);
          // Trigger callback to scroll to bottom
          if (onInitialLoadRef.current) {
            setTimeout(() => onInitialLoadRef.current?.(), 100);
          }
        }
        
        setHasMore(pagination?.hasMore || false);
        setPage(pageNum);
      } else {
        console.error('[useChat] Response not successful:', response?.data);
        setError('Failed to load messages');
      }
    } catch (err: any) {
      console.error('[useChat] Failed to fetch messages:', err);
      console.error('[useChat] Error message:', err.message);
      console.error('[useChat] Error response:', err.response?.data);
      console.error('[useChat] Error status:', err.response?.status);
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load messages';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [workspaceId, conversationId, type]);

  // Load more messages
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchMessages(page + 1, true);
    }
  }, [fetchMessages, page, hasMore, loadingMore]);

  // Send message
  const sendMessage = useCallback(async (content: string, mentions: string[] = []) => {
    if (!content.trim()) return;

    try {
      setSending(true);
      setError(null);

      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      if (!token) {
        console.error('[useChat] No token found for sending message');
        setError('Authentication required');
        setSending(false);
        return;
      }

      if (type === 'workspace' && workspaceId) {
        // Send via socket for real-time
        socket?.emit('chat:send', {
          workspaceId,
          content: content.trim(),
          mentions
        });
      } else if (type === 'direct' && userId) {
        // For DM, send via API using userId
        const response = await api.post(`/dm/${userId}/message`, { 
          content: content.trim() 
        });
        
        if (response.data.success) {
          // Message will be received via socket
        }
      }
    } catch (err: any) {
      console.error('[useChat] Failed to send message:', err);
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [workspaceId, userId, type, socket]);

  // Typing indicator
  const sendTypingIndicator = useCallback(() => {
    if (type === 'workspace' && workspaceId) {
      socket?.emit('chat:typing', { workspaceId });
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit('chat:stop_typing', { workspaceId });
      }, 3000);
    }
  }, [workspaceId, type, socket]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Join appropriate room
    if (type === 'direct' && conversationId) {
      joinDM(conversationId);
    }

    // Socket error handler
    const handleSocketError = (error: any) => {
      console.error('[useChat] Socket error:', error);
      setError(error.message || 'An error occurred');
      setSending(false);
    };

    socket.on('error', handleSocketError);

    // Workspace chat events
    if (type === 'workspace' && workspaceId) {
      // New message received
      const handleNewMessage = (data: { message: ChatMessage }) => {
        console.log('[useChat] New message received:', data.message);
        setMessages(prev => {
          // Check if message already exists (avoid duplicates)
          const exists = prev.some(m => m._id === data.message._id);
          if (exists) {
            console.log('[useChat] Message already exists, skipping');
            return prev;
          }
          console.log('[useChat] Adding new message to list');
          return [...prev, data.message];
        });
        // Add to Zustand store
        const roomId = `workspace_${workspaceId}`;
        addMessageToStore(roomId, data.message);
      };

      // User typing
      const handleUserTyping = (data: { userId: string; userName: string }) => {
        setTypingUsers(prev => new Set(prev).add(data.userName));
      };

      // User stopped typing
      const handleUserStopTyping = (data: { userId: string }) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          // Remove by userId (we'd need to track userId to userName mapping)
          return newSet;
        });
      };

      socket.on('chat:new', handleNewMessage);
      socket.on('chat:user_typing', handleUserTyping);
      socket.on('chat:user_stop_typing', handleUserStopTyping);

      return () => {
        socket.off('error', handleSocketError);
        socket.off('chat:new', handleNewMessage);
        socket.off('chat:user_typing', handleUserTyping);
        socket.off('chat:user_stop_typing', handleUserStopTyping);
      };
    }

    // Direct message events
    if (type === 'direct' && conversationId) {
      const handleNewDM = (data: { message: ChatMessage }) => {
        if (data.message.conversation === conversationId) {
          setMessages(prev => [...prev, data.message]);
          // Add to Zustand store
          addMessageToStore(conversationId, data.message);
        }
      };

      socket.on('dm:new', handleNewDM);

      return () => {
        socket.off('error', handleSocketError);
        socket.off('dm:new', handleNewDM);
        if (conversationId) {
          leaveDM(conversationId);
        }
      };
    }

    return () => {
      socket.off('error', handleSocketError);
    };
  }, [socket, type, workspaceId, conversationId, addMessageToStore]);

  // Fetch messages on mount
  useEffect(() => {
    if ((type === 'workspace' && workspaceId) || (type === 'direct' && conversationId)) {
      fetchMessages();
    }
  }, [fetchMessages, type, workspaceId, conversationId]);

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages,
    loading,
    loadingMore,
    sending,
    error,
    hasMore,
    typingUsers: Array.from(typingUsers),
    sendMessage,
    sendTypingIndicator,
    loadMore,
    refetch: fetchMessages
  };
};
