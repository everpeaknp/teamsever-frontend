import { useState, useEffect, useCallback } from 'react';
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
      
      // Skip if no valid token
      if (!finalToken || finalToken === 'undefined' || finalToken === 'null' || finalToken.trim() === '') {
        console.warn('[usePresence] No valid token available, skipping presence fetch');
        return;
      }

      const response = await axios.get(
        `${API_URL}/api/presence/${workspaceId}/online`,
        {
          headers: { Authorization: `Bearer ${finalToken}` }
        }
      );

      if (response.data.success) {
        const users = response.data.data || [];
        // Ensure users is an array before mapping
        if (Array.isArray(users)) {
          const onlineSet = new Set<string>(users.map((u: any) => u._id as string));
          setOnlineUsers(onlineSet);
        } else {
          console.warn('[usePresence] Expected array but got:', typeof users);
          setOnlineUsers(new Set());
        }
      }
    } catch (err: any) {
      // Only log non-auth errors to avoid console spam
      if (err?.response?.status !== 401) {
        console.error('Failed to fetch presence:', err);
      }
      // Ensure we have a valid state even on error
      setOnlineUsers(new Set());
    }
  }, [workspaceId]);

  // Listen for presence updates
  useEffect(() => {
    if (!socket || !workspaceId) return;

    const handleUserOnline = (data: { userId: string; userName: string; workspaceId: string }) => {
      if (data.workspaceId === workspaceId) {
        setOnlineUsers(prev => new Set(prev).add(data.userId));
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
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
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

    // Fetch initial presence
    fetchPresence();

    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [socket, workspaceId, fetchPresence]);

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  return {
    onlineUsers: Array.from(onlineUsers),
    isUserOnline,
    userPresence,
    refetch: fetchPresence
  };
};
