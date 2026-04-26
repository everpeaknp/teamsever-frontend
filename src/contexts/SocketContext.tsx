'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { initializeSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { api } from '@/lib/axios';
import { useChatStore } from '@/store/useChatStore';
import { useNotificationStore } from '@/store/useNotificationStore';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionState: ConnectionState;
  onlineUsers: string[];
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  isConnecting: false,
  connectionState: 'disconnected',
  onlineUsers: [],
  reconnect: () => { },
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);

  const reconnectAttemptsRef = useRef(0);

  // Sync state with convenience flags
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting' || connectionState === 'reconnecting';

  const reconnect = useCallback(() => {
    if (token) {
      console.log('[SocketContext] Manual reconnection triggered');
      disconnectSocket();
      const newSocket = initializeSocket(token);
      setSocket(newSocket);
      setConnectionState('connecting');
    }
  }, [token]);

  // Monitor token changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkToken = () => {
      const currentToken = localStorage.getItem('authToken');
      if (currentToken !== token) {
        setToken(currentToken);
      }
    };

    checkToken();
    const handleAuthUpdate = () => checkToken();
    window.addEventListener('auth-token-updated', handleAuthUpdate);
    window.addEventListener('storage', checkToken);

    return () => {
      window.removeEventListener('auth-token-updated', handleAuthUpdate);
      window.removeEventListener('storage', checkToken);
    };
  }, [token]);

  // Network Interruption Handling
  useEffect(() => {
    const handleOnline = () => {
      console.log('[SocketContext] Browser online - reconnecting...');
      reconnect();
    };
    const handleOffline = () => {
      console.log('[SocketContext] Browser offline');
      setConnectionState('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [reconnect]);

  // Initialize and handle listeners
  useEffect(() => {
    if (!token) {
      if (socket) {
        disconnectSocket();
        setSocket(null);
        setConnectionState('disconnected');
      }
      return;
    }

    const socketInstance = initializeSocket(token);
    setSocket(socketInstance);
    setConnectionState(socketInstance.connected ? 'connected' : 'connecting');

    const setupListeners = (s: Socket) => {
      s.on('connect', () => {
        console.log('[SocketContext] ✓ Connected');
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;

        // Fetch missed messages on reconnect
        // We trigger a refetch in the active chat if it exists
        const { activeRoomId } = useChatStore.getState();
        if (activeRoomId) {
          console.log('[SocketContext] Reconnected - Triggering message sync for:', activeRoomId);
          // This will be caught by useChat hook or can be manually triggered
          window.dispatchEvent(new CustomEvent('socket-reconnected', { detail: { roomId: activeRoomId } }));
        }
      });

      s.on('disconnect', (reason) => {
        console.log(`[SocketContext] ✗ Disconnected: ${reason}`);
        if (reason === 'io server disconnect' || reason === 'io client disconnect') {
          setConnectionState('disconnected');
        } else {
          setConnectionState('reconnecting');
        }
      });

      s.on('connect_error', (err) => {
        console.error('[SocketContext] Connection error:', err.message);
        setConnectionState('error');
      });

      s.on('reconnect_attempt', (attempt) => {
        console.log(`[SocketContext] Reconnection attempt ${attempt}`);
        setConnectionState('reconnecting');
      });

      // Presence & Chat Listeners
      s.on('user:online', (data: { userId: string }) => {
        const { setUserOnline } = useChatStore.getState();
        setUserOnline(data.userId);
      });

      s.on('user:offline', (data: { userId: string }) => {
        const { setUserOffline } = useChatStore.getState();
        setUserOffline(data.userId);
      });

      s.on('chat:new', (data: { message: any }) => {
        const { addMessage } = useChatStore.getState();
        const roomId = data.message.channel ? `channel_${data.message.channel}` : `workspace_${data.message.workspace}`;
        addMessage(roomId, data.message);
      });

      s.on('dm:new', (data: { message: any; conversation: string }) => {
        const { addMessage } = useChatStore.getState();
        addMessage(data.conversation, data.message);
      });

      s.on('message:sent:sync', (data: { message: any }) => {
        // Handle sync across multiple sessions
        const { addMessage } = useChatStore.getState();
        const roomId = data.message.conversation || (data.message.channel ? `channel_${data.message.channel}` : `workspace_${data.message.workspace}`);
        addMessage(roomId, data.message);
      });

      s.on('notification:new', (data: { notification: any }) => {
        const { addNotification, showBrowserNotification } = useNotificationStore.getState();
        addNotification(data.notification);
        showBrowserNotification(
          data.notification.title || 'New Notification',
          data.notification.body || '',
          { resourceId: data.notification.resourceId, resourceType: data.notification.resourceType }
        );
      });
    };

    setupListeners(socketInstance);

    return () => {
      console.log('[SocketContext] Cleaning up listeners...');
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      socketInstance.off('connect_error');
      socketInstance.off('reconnect_attempt');
      socketInstance.off('user:online');
      socketInstance.off('user:offline');
      socketInstance.off('chat:new');
      socketInstance.off('dm:new');
      socketInstance.off('message:sent:sync');
      socketInstance.off('notification:new');
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      isConnecting,
      connectionState,
      onlineUsers,
      reconnect
    }}>
      {children}
    </SocketContext.Provider>
  );
};
