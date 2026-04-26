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
  const sendMessage = useCallback(async (content: string, tempId: string, mentions: string[] = []) => {
    if (!content.trim()) return;

    return new Promise((resolve, reject) => {
      if (!socket || !socket.connected) {
        reject(new Error('Socket disconnected'));
        return;
      }

      const payload = {
        workspaceId,
        channelId: channelId === 'general' ? undefined : channelId,
        conversationId,
        content: content.trim(),
        mentions,
        tempId // Pass tempId for server to echo back
      };

      const event = type === 'workspace' ? 'chat:send' : 'dm:send';

      socket.emit(event, payload, (response: any) => {
        if (response.status === 'ok') {
          resolve(response.messageId);
        } else {
          reject(new Error(response.message || 'Failed to send message'));
        }
      });
    });
  }, [workspaceId, channelId, conversationId, type, socket]);

  // Typing indicator
  const sendTypingIndicator = useCallback(() => {
    if (!socket || !socket.connected) return;

    const payload = type === 'workspace' ? { channelId } : { conversationId };
    socket.emit('chat:typing', payload);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:stop_typing', payload);
    }, 3000);
  }, [channelId, conversationId, type, socket]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Join appropriate rooms
    if (type === 'workspace' && channelId) {
      socket.emit('join_channel', { channelId });
    } else if (type === 'direct' && conversationId) {
      socket.emit('join_dm', { conversationId });
    }

    const handleNewMessage = (data: { message: ChatMessage }) => {
      const msg = data.message;

      // Syncing messages: if we receive a message with a tempId that matches one of our optimistic messages
      setMessages(prev => {
        // If message already exists (by ID or tempId), update it
        const index = prev.findIndex(m => m._id === msg._id || (msg.tempId && m.tempId === msg.tempId));
        if (index !== -1) {
          const next = [...prev];
          next[index] = { ...next[index], ...msg, sending: false, failed: false };
          return next;
        }
        return [...prev, msg];
      });

      // Also update store
      const roomId = type === 'workspace'
        ? (channelId ? `channel_${channelId}` : `workspace_${workspaceId}`)
        : conversationId!;
      addMessageToStore(roomId, msg);
    };

    const handleUserTyping = (data: { channelId?: string; conversationId?: string; userName: string }) => {
      const isRelevant = (data.channelId && data.channelId === channelId) ||
        (data.conversationId && data.conversationId === conversationId);
      if (isRelevant) {
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

    // Missed messages sync
    const handleReconnectSync = (e: any) => {
      const { roomId: reconnectedRoomId } = e.detail;
      const currentRoomId = type === 'workspace' 
        ? (channelId ? `channel_${channelId}` : `workspace_${workspaceId}`) 
        : conversationId!;
        
      if (reconnectedRoomId === currentRoomId) {
        console.log('[useChat] Syncing missed messages after reconnect...');
        fetchMessages(1, false);
      }
    };

    window.addEventListener('socket-reconnected', handleReconnectSync);

    return () => {
      socket.off('chat:new', handleNewMessage);
      socket.off('dm:new', handleNewMessage);
      socket.off('chat:user_typing', handleUserTyping);
      socket.off('chat:user_stop_typing', handleUserStopTyping);
      window.removeEventListener('socket-reconnected', handleReconnectSync);
    };
  }, [socket, type, workspaceId, channelId, conversationId, addMessageToStore]);

  // Load messages on mount/change
  useEffect(() => {
    if ((type === 'workspace' && (channelId || workspaceId)) || (type === 'direct' && conversationId)) {
      fetchMessages(1, false);
    }
  }, [fetchMessages, type, workspaceId, channelId, conversationId]);

  return {
    messages,
    setMessages, // Exported to allow optimistic updates from outside
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

