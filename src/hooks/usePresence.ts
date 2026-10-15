import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSocket } from '@/lib/socket';
import { api } from '@/lib/axios';
import { normalizeWorkspacePresence, type UserPresence } from '@/lib/chat/normalizeWorkspacePresence';

export type { UserPresence } from '@/lib/chat/normalizeWorkspacePresence';

export const usePresence = (workspaceId: string) => {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [userPresence, setUserPresence] = useState<Map<string, UserPresence>>(new Map());
  const socket = getSocket();

  // Fetch initial presence
  const fetchPresence = useCallback(async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const token = localStorage.getItem('token');
      const finalToken = authToken || token;
      
      if (!finalToken || finalToken === 'undefined' || finalToken === 'null' || finalToken.trim() === '') {
        return;
      }

      const response = await api.get(`/presence/${workspaceId}`);

      if (response.data.success) {
        const presence = normalizeWorkspacePresence(response.data.data ?? {});
        setOnlineUsers(new Set(presence.onlineUsers));
        setUserPresence(presence.userPresence);
      }
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        console.error('Failed to fetch presence:', err);
      }
    }
  }, [workspaceId]);

  // Listen for presence updates
  useEffect(() => {
    if (!socket || !workspaceId) return;

    const handleUserOnline = (data: { userId?: string; userName?: string; user?: { _id?: string; name?: string }; workspaceId: string }) => {
      if (data.workspaceId === workspaceId) {
        const userId = data.userId || data.user?._id;
        if (!userId) return;
        setOnlineUsers(prev => {
          if (prev.has(userId)) return prev;
          const next = new Set(prev);
          next.add(userId);
          return next;
        });
        setUserPresence(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, {
            userId,
            userName: data.userName || data.user?.name || '',
            status: 'online'
          });
          return newMap;
        });
      }
    };

    const handleUserOffline = (data: { userId?: string; userName?: string; user?: { _id?: string; name?: string }; workspaceId: string; lastSeen?: Date | string | null }) => {
      if (data.workspaceId === workspaceId) {
        const userId = data.userId || data.user?._id;
        if (!userId) return;
        setOnlineUsers(prev => {
          if (!prev.has(userId)) return prev;
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        setUserPresence(prev => {
          const newMap = new Map(prev);
          const lastSeen = data.lastSeen ? new Date(data.lastSeen) : null;
          newMap.set(userId, {
            userId,
            userName: data.userName || data.user?.name || newMap.get(userId)?.userName || '',
            status: 'offline',
            lastSeen: lastSeen && Number.isFinite(lastSeen.getTime()) ? lastSeen : null,
          });
          return newMap;
        });
      }
    };

    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    fetchPresence();

    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [socket, workspaceId, fetchPresence]);

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  const memoizedOnlineUsers = useMemo(() => Array.from(onlineUsers), [onlineUsers]);

  return useMemo(() => ({
    onlineUsers: memoizedOnlineUsers,
    isUserOnline,
    userPresence,
    refetch: fetchPresence
  }), [memoizedOnlineUsers, isUserOnline, userPresence, fetchPresence]);
};
