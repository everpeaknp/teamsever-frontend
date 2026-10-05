import { useState, useEffect, useCallback, useRef } from 'react';
import { joinDM, leaveDM } from '@/lib/socket';
import { useSocket } from '@/contexts/SocketContext';
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
  type?: 'text' | 'system' | 'github_commit' | 'leave_request';
  reactions?: Array<{
    emoji: string;
    users: string[];
    count: number;
  }>;
  metadata?: {
    repoName?: string;
    branchName?: string;
    commits?: Array<{
      message: string;
      url: string;
      author: string;
    }>;
    compareUrl?: string;
    [key: string]: any;
  };
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
  filterUserId?: string; // Filter by specific user
  filterFolderId?: string; // Filter by folder
  filterSpaceName?: string;
  onInitialLoad?: () => void;
}

export const useChat = ({ workspaceId, channelId, conversationId, userId, type, filterUserId, filterFolderId, filterSpaceName, onInitialLoad }: UseChatOptions) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  // Socket messages can arrive before the initial history request completes.
  // Keep their latest versions so an older HTTP snapshot cannot erase them.
  const socketMessagesRef = useRef<Map<string, ChatMessage>>(new Map());
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onInitialLoadRef = useRef(onInitialLoad);
  // Subscribe through context so mounting before socket initialization doesn't
  // leave this chat permanently without realtime event listeners.
  const { socket } = useSocket();
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  
  // Update ref when callback changes
  useEffect(() => {
    onInitialLoadRef.current = onInitialLoad;
  }, [onInitialLoad]);
  
  // Get Zustand store actions
  const { addMessage: addMessageToStore } = useChatStore();

  // Fetch initial messages
  const fetchMessages = useCallback(async (pageNum: number = 1, append: boolean = false): Promise<ChatMessage[] | null> => {
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
        return null;
      }

      let response;
      const limit = 50;
      const filters = [];
      if (filterUserId) filters.push(`userId=${filterUserId}`);
      if (filterFolderId) filters.push(`folderId=${filterFolderId}`);
      if (filterSpaceName) filters.push(`spaceName=${filterSpaceName}`);
      const filterQuery = filters.length > 0 ? `&${filters.join('&')}` : '';
      
      if (type === 'workspace' && channelId && channelId !== 'general') {
        response = await api.get(`/chat/channels/${channelId}/messages?page=${pageNum}&limit=${limit}${filterQuery}`);
      } else if (type === 'workspace' && workspaceId) {
        // Fallback for General chat if channelId not provided or is 'general'
        response = await api.get(`/workspaces/${workspaceId}/chat?page=${pageNum}&limit=${limit}${filterQuery}`);
      } else if (type === 'direct' && conversationId && workspaceId) {
        response = await api.get(`/dm/${conversationId}/messages?page=${pageNum}&limit=${limit}&workspaceId=${workspaceId}${filterQuery}`);
      } else {
        setLoading(false);
        setLoadingMore(false);
        return null;
      }

      if (response?.data?.success) {
        const newMessages: ChatMessage[] = response.data.data || [];
        const pagination = response.data.pagination;
        
        if (append) {
          setMessages(prev => [...newMessages, ...prev]);
        } else {
          const merged = new Map<string, ChatMessage>(
            newMessages.map(message => [String(message._id), message])
          );
          socketMessagesRef.current.forEach((message, id) => {
            const historyMessage = merged.get(id);
            merged.set(id, historyMessage ? { ...historyMessage, ...message } : message);
          });
          setMessages(Array.from(merged.values()));
          if (onInitialLoadRef.current) {
            setTimeout(() => onInitialLoadRef.current?.(), 100);
          }
        }
        
        setHasMore(pagination?.hasMore || false);
        setPage(pageNum);
        return newMessages;
      }
      return null;
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load messages');
      return null;
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [workspaceId, channelId, conversationId, type, filterUserId, filterFolderId]);

  // Send message
  const sendMessage = useCallback(async (content: string, mentions: string[] = []) => {
    if (!content.trim()) return;

    try {
      setSending(true);
      setError(null);
      if (type === 'workspace' && workspaceId) {
        socket?.emit('chat:send', {
          workspaceId,
          channelId: channelId === 'general' ? undefined : channelId,
          content: content.trim(),
          mentions
        });
      } else if (type === 'direct' && userId && workspaceId) {
        await api.post(`/dm/${userId}/message`, { content: content.trim(), workspaceId });
      } else if (type === 'direct' && userId && !workspaceId) {
        throw new Error('workspaceId is required for direct messages');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to send message';
      setError(message);
      throw err;
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
        if (msg._id) socketMessagesRef.current.set(String(msg._id), msg);
        setMessages(prev => {
          if (prev.some(m => String(m._id) === String(msg._id))) return prev;
          return [...prev, msg];
        });
        
        const roomId = type === 'workspace' 
          ? (channelId ? `channel_${channelId}` : `workspace_${workspaceId}`) 
          : (userId && (localStorage.getItem('userId') || localStorage.getItem('userId')) 
            ? generateDMRoomId(localStorage.getItem('userId')!, userId) 
            : conversationId!);
        addMessageToStore(roomId, msg);

        const senderId = typeof msg.sender === 'object' ? msg.sender._id : undefined;
        if (senderId && currentUserId && senderId !== currentUserId) {
          if (type === 'workspace' && workspaceId) {
            api.patch(`/workspaces/${workspaceId}/chat/read`).catch((err) => {
              console.error('[useChat] Failed to mark workspace chat as read:', err);
            });
          } else if (type === 'direct' && conversationId && workspaceId) {
            api.patch(`/dm/${conversationId}/read?workspaceId=${workspaceId}`).catch((err) => {
              console.error('[useChat] Failed to mark DM as read:', err);
            });
          }
        }
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

    const handleReaction = (data: { messageId: string; reactions: any[] }) => {
      setMessages(prev =>
        prev.map(m => (m._id === data.messageId ? { ...m, reactions: data.reactions } : m))
      );
    };

    const handleDMUpdated = (data: { message: ChatMessage }) => {
      if (data.message) {
        const id = String(data.message._id);
        const previousSocketMessage = socketMessagesRef.current.get(id);
        const updatedMessage = previousSocketMessage
          ? { ...previousSocketMessage, ...data.message }
          : data.message;
        socketMessagesRef.current.set(id, updatedMessage);
        setMessages(prev =>
          prev.map(m => (String(m._id) === id ? { ...m, ...updatedMessage } : m))
        );
      }
    };

    socket.on('chat:new', handleNewMessage);
    socket.on('dm:new', handleNewMessage);
    socket.on('chat:reaction', handleReaction);
    socket.on('dm:reaction', handleReaction);
    socket.on('dm:updated', handleDMUpdated);
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
      socket.off('chat:reaction', handleReaction);
      socket.off('dm:reaction', handleReaction);
      socket.off('dm:updated', handleDMUpdated);
      socket.off('chat:user_typing', handleUserTyping);
      socket.off('chat:user_stop_typing', handleUserStopTyping);
    };
  }, [socket, type, workspaceId, channelId, conversationId, addMessageToStore, currentUserId, userId]);

  // Load messages on mount/change
  useEffect(() => {
    if ((type === 'workspace' && (channelId || workspaceId)) || (type === 'direct' && conversationId)) {
      setMessages([]); // Clear messages when switching channels
      socketMessagesRef.current.clear();
      fetchMessages(1, false);
    }
  }, [fetchMessages, type, workspaceId, channelId, conversationId, filterUserId, filterFolderId]);

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
