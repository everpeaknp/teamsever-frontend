import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, joinDM, leaveDM } from '@/lib/socket';
import { useChatStore, generateDMRoomId } from '@/store/useChatStore';
import { api } from '@/lib/axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ChatMessage {
  _id: string;
  workspace?: string;
  channel?: string;
  conversation?: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    profilePicture?: string;
  };
  content: string;
  type?: 'text' | 'system';
  mentions?: string[];
  readBy?: string[];
  createdAt: string;
  updatedAt: string;
  // Optimistic update fields
  sending?: boolean;
  failed?: boolean;
  tempId?: string;
}

interface UseChatOptions {
  workspaceId?: string;
  channelId?: string;
  conversationId?: string;
  userId?: string;
  type: 'workspace' | 'direct';
  onInitialLoad?: () => void;
}

export const useChat = ({ workspaceId, channelId, conversationId, userId, type, onInitialLoad }: UseChatOptions) => {
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
        setError('Authentication required');
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      let response;
      const limit = 50;
      
      if (type === 'workspace' && channelId && channelId !== 'general') {
        response = await api.get(`/chat/channels/${channelId}/messages?page=${pageNum}&limit=${limit}`);
      } else if (type === 'workspace' && workspaceId) {
        // Fallback for General chat if channelId not provided or is 'general'
        response = await api.get(`/workspaces/${workspaceId}/chat?page=${pageNum}&limit=${limit}`);
      } else if (type === 'direct' && conversationId) {
        response = await api.get(`/dm/${conversationId}/messages?page=${pageNum}&limit=${limit}`);
      } else {
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (response?.data?.success) {
        const newMessages = response.data.data || [];
        const pagination = response.data.pagination;
        
        if (append) {
          setMessages(prev => [...newMessages, ...prev]);
        } else {
          setMessages(newMessages);
          if (onInitialLoadRef.current) {
            setTimeout(() => onInitialLoadRef.current?.(), 100);
          }
        }
        
        setHasMore(pagination?.hasMore || false);
        setPage(pageNum);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [workspaceId, channelId, conversationId, type]);

  // Send message
  const sendMessage = useCallback(async (content: string, mentions: string[] = []) => {
    if (!content.trim()) return;

    try {
      setSending(true);
      if (type === 'workspace' && workspaceId) {
        socket?.emit('chat:send', {
          workspaceId,
          channelId: channelId === 'general' ? undefined : channelId,
          content: content.trim(),
          mentions
        });
      } else if (type === 'direct' && userId) {
        await api.post(`/dm/${userId}/message`, { content: content.trim() });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [workspaceId, channelId, userId, type, socket]);

  // Typing indicator
  const sendTypingIndicator = useCallback(() => {
    if (type === 'workspace' && channelId) {
      socket?.emit('chat:typing', { channelId });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit('chat:stop_typing', { channelId });
      }, 3000);
    }
  }, [channelId, type, socket]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Join appropriate room
    if (type === 'workspace' && channelId) {
      socket.emit('join_channel', { channelId });
    } else if (type === 'direct' && conversationId) {
      joinDM(conversationId);
    }

    const handleNewMessage = (data: { message: ChatMessage }) => {
      const msg = data.message;
      const isTargetChannel = type === 'workspace' && channelId && msg.channel === channelId;
      const isTargetDM = type === 'direct' && conversationId && msg.conversation === conversationId;

      if (isTargetChannel || isTargetDM) {
        setMessages(prev => {
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        
        const roomId = type === 'workspace' 
          ? (channelId ? `channel_${channelId}` : `workspace_${workspaceId}`) 
          : (userId && (localStorage.getItem('userId') || localStorage.getItem('userId')) 
            ? generateDMRoomId(localStorage.getItem('userId')!, userId) 
            : conversationId!);
        addMessageToStore(roomId, msg);
      }
    };

    const handleUserTyping = (data: { channelId?: string; conversationId?: string; userName: string }) => {
      if ((data.channelId && data.channelId === channelId) || (data.conversationId && data.conversationId === conversationId)) {
        setTypingUsers(prev => new Set(prev).add(data.userName));
      }
    };

    const handleUserStopTyping = (data: { channelId?: string; conversationId?: string; userName: string }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(data.userName);
        return next;
      });
    };

    socket.on('chat:new', handleNewMessage);
    socket.on('dm:new', handleNewMessage);
    socket.on('chat:user_typing', handleUserTyping);
    socket.on('chat:user_stop_typing', handleUserStopTyping);

    return () => {
      if (type === 'workspace' && channelId) {
        socket.emit('leave_channel', { channelId });
      } else if (type === 'direct' && conversationId) {
        leaveDM(conversationId);
      }
      socket.off('chat:new', handleNewMessage);
      socket.off('dm:new', handleNewMessage);
      socket.off('chat:user_typing', handleUserTyping);
      socket.off('chat:user_stop_typing', handleUserStopTyping);
    };
  }, [socket, type, workspaceId, channelId, conversationId, addMessageToStore]);

  // Load messages on mount/change
  useEffect(() => {
    if ((type === 'workspace' && (channelId || workspaceId)) || (type === 'direct' && conversationId)) {
      setMessages([]); // Clear messages when switching channels
      fetchMessages(1, false);
    }
  }, [fetchMessages, type, workspaceId, channelId, conversationId]);

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
    loadMore: () => fetchMessages(page + 1, true),
    refetch: fetchMessages
  };
};
