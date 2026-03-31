import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSocket } from '@/lib/socket';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface UserPresence {
  userId: string;
  userName: string;
  status: 'online' | 'offline';
  lastSeen?: Date;
}

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

      const response = await axios.get(
        `${API_URL}/api/presence/${workspaceId}/online`,
        {
          headers: { Authorization: `Bearer ${finalToken}` }
        }
      );

      if (response.data.success) {
        const users = response.data.data?.onlineUsers || [];
        if (Array.isArray(users)) {
          const onlineSet = new Set<string>(users.map((u: any) => u._id as string));
          setOnlineUsers(onlineSet);
        }
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

    const handleUserOnline = (data: { userId: string; userName: string; workspaceId: string }) => {
      if (data.workspaceId === workspaceId) {
        setOnlineUsers(prev => {
          if (prev.has(data.userId)) return prev;
          const next = new Set(prev);
          next.add(data.userId);
          return next;
        });
        setUserPresence(prev => {
          const newMap = new Map(prev);
          newMap.set(data.userId, {
            userId: data.userId,
            userName: data.userName,
            status: 'online'
          });
          return newMap;
        });
      }
    };

    const handleUserOffline = (data: { userId: string; userName: string; workspaceId: string }) => {
      if (data.workspaceId === workspaceId) {
        setOnlineUsers(prev => {
          if (!prev.has(data.userId)) return prev;
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
        setUserPresence(prev => {
          const newMap = new Map(prev);
          newMap.set(data.userId, {
            userId: data.userId,
            userName: data.userName,
            status: 'offline',
            lastSeen: new Date()
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
