import { useState, useEffect, useCallback, useRef } from 'react';
import { joinDM, leaveDM } from '@/lib/socket';
import { useSocket } from '@/contexts/SocketContext';
import { useChatStore, generateDMRoomId } from '@/store/useChatStore';
import { api } from '@/lib/axios';
import { isMessageForChatRoom } from '@/lib/chat/isMessageForChatRoom';

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
  attachments?: string[];
  replyTo?: { _id: string; content: string; sender?: { _id: string; name?: string }; isDeleted?: boolean } | string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
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
  readBy?: Array<string | { _id: string; name?: string; avatar?: string; profilePicture?: string }>;
  createdAt: string;
  updatedAt: string;
  // Optimistic update fields
  sending?: boolean;
  failed?: boolean;
  tempId?: string;
}

const getEntityId = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const entity = value as { _id?: unknown; id?: unknown };
    if (typeof entity._id === 'string') return entity._id;
    if (typeof entity.id === 'string') return entity.id;
  }
  return undefined;
};

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
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingUserTimeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const liveMessagesRef = useRef(new Map<string, ChatMessage>());
  const onInitialLoadRef = useRef(onInitialLoad);
  // Read the socket from React context so a chat mounted before socket
  // initialization re-subscribes as soon as the provider publishes it.
  const { socket } = useSocket();
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const typingRoomKey = `${type}:${channelId || conversationId || workspaceId || ''}`;
  const previousTypingRoomKeyRef = useRef(typingRoomKey);

  useEffect(() => {
    if (previousTypingRoomKeyRef.current !== typingRoomKey) {
      previousTypingRoomKeyRef.current = typingRoomKey;
      setTypingUsers(new Map());
    }
    return () => {
      typingUserTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      typingUserTimeoutsRef.current.clear();
    };
  }, [typingRoomKey]);
  
  // Update ref when callback changes
  useEffect(() => {
    onInitialLoadRef.current = onInitialLoad;
  }, [onInitialLoad]);
  
  // Get Zustand store actions
  const { addMessage: addMessageToStore, updateMessage: updateMessageInStore } = useChatStore();

  const updateMessageReactions = useCallback((messageId: string, reactions: ChatMessage['reactions']) => {
    const previous = liveMessagesRef.current.get(messageId);
    const updated = previous ? { ...previous, reactions: reactions || [] } : undefined;
    if (updated) liveMessagesRef.current.set(messageId, updated);
    setMessages(current => current.map(message => message._id === messageId
      ? { ...message, reactions: reactions || [] }
      : message));
    const roomId = type === 'direct'
      ? conversationId
      : (channelId ? `channel_${channelId}` : (workspaceId ? `workspace_${workspaceId}` : undefined));
    if (roomId && updated) updateMessageInStore(roomId, messageId, updated);
  }, [type, conversationId, channelId, workspaceId, updateMessageInStore]);

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
        return;
      }

      if (response?.data?.success) {
        const newMessages = response.data.data || [];
        const pagination = response.data.pagination;
        
        if (append) {
          setMessages(prev => [...newMessages, ...prev]);
        } else {
          setMessages(prev => {
            const merged = new Map<string, ChatMessage>(newMessages.map((message: ChatMessage) => [message._id, message]));
            for (const message of [...prev, ...Array.from(liveMessagesRef.current.values())]) {
              const current = merged.get(message._id);
              merged.set(message._id, current
                ? { ...current, ...message, metadata: { ...current.metadata, ...message.metadata } }
                : message);
            }
            return Array.from(merged.values());
          });
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
  }, [workspaceId, channelId, conversationId, type, filterUserId, filterFolderId]);

  // Send message
  const sendMessage = useCallback(async (content: string, mentions: string[] = [], replyToMessageId?: string, attachments: string[] = []) => {
    if (!content.trim() && attachments.length === 0) return;

    try {
      setSending(true);
      setError(null);
      if (type === 'workspace' && workspaceId) {
        socket?.emit('chat:send', {
          workspaceId,
          channelId: channelId === 'general' ? undefined : channelId,
          content: content.trim(),
          mentions,
          replyToMessageId,
          ...(attachments.length ? { attachments } : {}),
        });
      } else if (type === 'direct' && userId && workspaceId) {
        await api.post(`/dm/${userId}/message`, { content: content.trim(), workspaceId, replyToMessageId, ...(attachments.length ? { attachments } : {}) });
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
    const target = type === 'workspace' && channelId
      ? { channelId }
      : type === 'direct' && conversationId
        ? { conversationId }
        : null;
    if (target) {
      socket?.emit('chat:typing', target);
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit('chat:stop_typing', target);
      }, 3000);
    }
  }, [channelId, conversationId, type, socket]);

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
      const isTargetChannel = type === 'workspace' && isMessageForChatRoom(channelId, msg);
      const messageConversationId = getEntityId(msg.conversation);
      const isTargetDM = type === 'direct' && conversationId && messageConversationId === conversationId;

      if (isTargetChannel || isTargetDM) {
        liveMessagesRef.current.set(msg._id, msg);
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

        const senderId = typeof msg.sender === 'object' ? msg.sender._id : undefined;
        if (senderId && currentUserId && senderId !== currentUserId) {
          if (type === 'workspace' && workspaceId) {
            const markChannelRead = channelId && channelId !== 'general'
              ? api.patch(`/chat/channels/${channelId}/read`)
              : api.patch(`/workspaces/${workspaceId}/chat/read`);
            markChannelRead.catch(() => undefined);
          } else if (type === 'direct' && conversationId && workspaceId) {
            api.patch(`/dm/${conversationId}/read?workspaceId=${workspaceId}`).catch((err) => {
            });
          }
        }
      }
    };

    const handleUserTyping = (data: { channelId?: string; conversationId?: string; userId?: string; userName: string }) => {
      if (!((data.channelId && data.channelId === channelId) || (data.conversationId && data.conversationId === conversationId))) return;
      if (currentUserId && data.userId === currentUserId) return;
      const key = data.userId || data.userName;
      const existingTimeout = typingUserTimeoutsRef.current.get(key);
      if (existingTimeout) clearTimeout(existingTimeout);
      setTypingUsers(prev => new Map(prev).set(key, data.userName));
      typingUserTimeoutsRef.current.set(key, setTimeout(() => {
        typingUserTimeoutsRef.current.delete(key);
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      }, 5_000));
    };

    const handleUserStopTyping = (data: { channelId?: string; conversationId?: string; userId?: string; userName: string }) => {
      if (!((data.channelId && data.channelId === channelId) || (data.conversationId && data.conversationId === conversationId))) return;
      const key = data.userId || data.userName;
      const timeout = typingUserTimeoutsRef.current.get(key);
      if (timeout) clearTimeout(timeout);
      typingUserTimeoutsRef.current.delete(key);
      setTypingUsers(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    };

    const handleReaction = (data: { messageId: string; reactions: any[] }) => {
      updateMessageReactions(data.messageId, data.reactions);
    };

    const handleDMUpdated = (data: { message: ChatMessage }) => {
      if (data.message && type === 'direct' && getEntityId(data.message.conversation) === conversationId) {
        const previous = liveMessagesRef.current.get(data.message._id);
        const updated = previous
          ? { ...previous, ...data.message, metadata: { ...previous.metadata, ...data.message.metadata } }
          : data.message;
        liveMessagesRef.current.set(data.message._id, updated);
        setMessages(prev =>
          prev.map(m => (m._id === data.message._id
            ? { ...m, ...data.message, metadata: { ...m.metadata, ...data.message.metadata } }
            : m))
        );
        const updateRoomId = conversationId || '';
        if (updateRoomId) updateMessageInStore(updateRoomId, data.message._id, updated);
      }
    };

    const handleChatUpdated = (data: { message: ChatMessage }) => {
      if (!data.message || type !== 'workspace' || !isMessageForChatRoom(channelId, data.message)) return;
      const updated = data.message;
      liveMessagesRef.current.set(updated._id, updated);
      setMessages(prev => prev.map(message => message._id === updated._id ? { ...message, ...updated } : message));
      const updateRoomId = channelId ? `channel_${channelId}` : `workspace_${workspaceId}`;
      updateMessageInStore(updateRoomId, updated._id, updated);
    };

    const handleReadReceipt = (receipt: { conversationId?: string; channelId?: string; channelName?: string; messageIds?: Array<string | { _id: string }>; reader?: ChatMessage['sender'] }) => {
      const matchesRoom = type === 'direct'
        ? getEntityId(receipt.conversationId) === conversationId
        : isMessageForChatRoom(channelId, { channel: receipt.channelId, channelName: receipt.channelName });
      if (!matchesRoom || !receipt.reader?._id) return;
      const messageIds = new Set((receipt.messageIds || []).map(id => typeof id === 'string' ? id : id._id));
      const apply = (message: ChatMessage): ChatMessage => messageIds.has(message._id)
        ? { ...message, readBy: [...(message.readBy || []).filter(reader => typeof reader === 'string' ? reader !== receipt.reader!._id : reader._id !== receipt.reader!._id), receipt.reader!] }
        : message;
      liveMessagesRef.current.forEach((message, id) => liveMessagesRef.current.set(id, apply(message)));
      setMessages(prev => prev.map(apply));
      const updateRoomId = type === 'direct' ? conversationId! : (channelId ? `channel_${channelId}` : `workspace_${workspaceId}`);
      const room = useChatStore.getState().getRoom(updateRoomId);
      messageIds.forEach(messageId => {
        const stored = room?.messages.find(message => message._id === messageId);
        if (stored) updateMessageInStore(updateRoomId, messageId, apply(stored as unknown as ChatMessage));
      });
    };

    socket.on('chat:new', handleNewMessage);
    socket.on('dm:new', handleNewMessage);
    socket.on('chat:reaction', handleReaction);
    socket.on('dm:reaction', handleReaction);
    socket.on('dm:updated', handleDMUpdated);
    socket.on('chat:updated', handleChatUpdated);
    socket.on('dm:read', handleReadReceipt);
    socket.on('chat:read', handleReadReceipt);
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
      socket.off('chat:updated', handleChatUpdated);
      socket.off('dm:read', handleReadReceipt);
      socket.off('chat:read', handleReadReceipt);
      socket.off('chat:user_typing', handleUserTyping);
      socket.off('chat:user_stop_typing', handleUserStopTyping);
    };
  }, [socket, type, workspaceId, channelId, conversationId, addMessageToStore, updateMessageInStore, updateMessageReactions, currentUserId, userId]);

  // Load messages on mount/change
  useEffect(() => {
    if ((type === 'workspace' && (channelId || workspaceId)) || (type === 'direct' && conversationId)) {
      setMessages([]); // Clear messages when switching channels
      liveMessagesRef.current.clear();
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
    typingUsers: Array.from(typingUsers.values()),
    sendMessage,
    updateMessageReactions,
    deleteMessage: async (messageId: string) => {
      if (type === 'direct' && !conversationId) throw new Error('Direct conversation is required');
      if (type === 'workspace' && !channelId) throw new Error('Channel is required');
      const response = await api.delete(type === 'direct' ? `/dm/messages/${messageId}` : `/chat/${messageId}`);
      const deleted = response.data?.data as ChatMessage | undefined;
      const updated = deleted?._id ? deleted : (response.data?.message ? { _id: messageId, isDeleted: true, content: 'This message was deleted' } as ChatMessage : undefined);
      if (!updated?._id) throw new Error('Message deletion was not confirmed by the server');
      Object.assign(updated, type === 'direct' ? { conversation: updated.conversation || conversationId } : { channel: updated.channel || channelId });
      liveMessagesRef.current.set(messageId, updated);
      setMessages(prev => prev.map(message => message._id === messageId ? updated : message));
      updateMessageInStore(type === 'direct' ? conversationId! : `channel_${channelId}`, messageId, updated);
    },
    sendTypingIndicator,
    loadMore: () => fetchMessages(page + 1, true),
    refetch: fetchMessages
  };
};
