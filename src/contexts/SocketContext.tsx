'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { initializeSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { api } from '@/lib/axios';
import { useChatStore } from '@/store/useChatStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAuthStore } from '@/store/useAuthStore';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  onlineUsers: string[];
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  isConnecting: false,
  onlineUsers: [],
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const joinedWorkspaceIdsRef = useRef<string[]>([]);

  // Monitor token changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkToken = () => {
      const currentToken = localStorage.getItem('authToken');
      if (currentToken !== token) {
        console.log('[SocketContext] Token changed:', currentToken ? 'Token found' : 'No token');
        setToken(currentToken);
        // Set connecting state immediately when token is found
        if (currentToken && !token) {
          setIsConnecting(true);
        }
      }
    };

    // Check immediately
    checkToken();

    // Listen for auth token updates (from login/register)
    const handleAuthUpdate = (event: CustomEvent) => {
      console.log('[SocketContext] Auth token updated event received');
      setIsConnecting(true);
      checkToken();
    };

    window.addEventListener('auth-token-updated', handleAuthUpdate as EventListener);

    // Listen for storage changes (for multi-tab support)
    window.addEventListener('storage', checkToken);

    return () => {
      window.removeEventListener('auth-token-updated', handleAuthUpdate as EventListener);
      window.removeEventListener('storage', checkToken);
    };
  }, [token]);

  // Initialize socket when token is available
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (!token) {
      // No token, disconnect if connected
      if (socket) {
        console.log('[SocketContext] No token, disconnecting...');
        disconnectSocket();
        setSocket(null);
        setIsConnected(false);
        setIsConnecting(false);
      }
      return;
    }

    // Check if socket already exists and is connected
    const existingSocket = getSocket();
    if (existingSocket && existingSocket.connected) {
      console.log('[SocketContext] Socket already connected, reusing...');
      setSocket(existingSocket);
      setIsConnected(true);
      setIsConnecting(false);
      return;
    }

    // Token exists, initialize socket
    try {
      console.log('[SocketContext] Initializing socket with token...');
      setIsConnecting(true);
      
      const socketInstance = initializeSocket(token);
      setSocket(socketInstance);

      // Set initial connection state
      if (socketInstance.connected) {
        console.log('[SocketContext] Socket already connected on init');
        setIsConnected(true);
        setIsConnecting(false);
      }

      const handleConnect = async () => {
        console.log('[SocketContext] ✓ Connected');
        setIsConnected(true);
        setIsConnecting(false);

        try {
          if (joinedWorkspaceIdsRef.current.length === 0) {
            const response = await api.get('/workspaces');
            const workspaces = response.data.data || [];
            joinedWorkspaceIdsRef.current = workspaces
              .map((ws: any) => ws?._id)
              .filter(Boolean);
          }

          joinedWorkspaceIdsRef.current.forEach((workspaceId) => {
            console.log(`[SocketContext] Joining workspace room: ${workspaceId}`);
            socketInstance.emit('join_workspace', { workspaceId });
          });
        } catch (error) {
          console.error('[SocketContext] Failed to join workspace rooms:', error);
        }
      };

      const handleDisconnect = () => {
        console.log('[SocketContext] ✗ Disconnected');
        setIsConnected(false);
        setIsConnecting(false);
      };

      const handleConnectError = (error: Error) => {
        // Only log non-websocket errors to reduce console noise
        if (!error.message?.includes('websocket error')) {
          console.log('[SocketContext] ✗ Connection error:', error.message);
        }
        setIsConnecting(false);
      };

      const handlePresenceUpdate = (data: { workspaceId: string; onlineUsers: string[] }) => {
        setOnlineUsers(data.onlineUsers);
        // Also sync with Chat Store for global access (online dots)
        const { setOnlineUsers: setStoreOnlineUsers } = useChatStore.getState();
        if (typeof setStoreOnlineUsers === 'function') {
          setStoreOnlineUsers(data.onlineUsers);
        }
      };

      const handleGlobalChatMessage = (data: { message: any }) => {
        const { addMessage } = useChatStore.getState();
        const { showBrowserNotification } = useNotificationStore.getState();

        const workspaceId =
          typeof data.message.workspace === 'string'
            ? data.message.workspace
            : data.message.workspace?._id?.toString?.() || data.message.workspace?.toString?.();
        if (!workspaceId) return;

        const roomId = `workspace_${workspaceId}`;
        addMessage(roomId, data.message);

        const channelId =
          typeof data.message.channel === 'string'
            ? data.message.channel
            : data.message.channel?._id?.toString?.() || data.message.channel?.toString?.();
        if (channelId) {
          addMessage(`channel_${channelId}`, data.message);
        }

        const currentUserId = useAuthStore.getState().user?._id || localStorage.getItem('userId');
        const senderId =
          typeof data?.message?.sender === 'string'
            ? data.message.sender
            : data?.message?.sender?._id?.toString?.();
        const { permission, fcmToken } = useNotificationStore.getState();
        const hasFCMDelivery = permission === 'granted' && !!fcmToken;
        if (senderId && currentUserId && senderId !== currentUserId && document.hidden && !hasFCMDelivery) {
          showBrowserNotification('New Group Message', data?.message?.content || 'You have a new message', {
            workspaceId,
            resourceType: 'chat',
          });
        }
      };

      const handleGlobalDM = (data: { message: any; conversation: any }) => {
        const { addMessage, createRoom } = useChatStore.getState();
        const { showBrowserNotification } = useNotificationStore.getState();

        const roomId =
          typeof data.message.conversation === 'string'
            ? data.message.conversation
            : data.message.conversation?._id?.toString?.() || data.message.conversation?.toString?.();
        if (!roomId) return;

        const participants = Array.isArray(data?.conversation?.participants)
          ? data.conversation.participants
              .map((p: any) => (typeof p === 'string' ? p : p?._id?.toString?.()))
              .filter(Boolean)
          : undefined;

        const conversationWorkspaceId =
          (typeof data?.conversation?.workspace === 'string'
            ? data.conversation.workspace
            : data?.conversation?.workspace?._id?.toString?.()) ||
          (typeof data?.message?.workspace === 'string'
            ? data.message.workspace
            : data?.message?.workspace?._id?.toString?.());

        if (participants && participants.length > 0) {
          createRoom(roomId, 'direct', conversationWorkspaceId, participants);
        }

        addMessage(roomId, data.message);

        const currentUserId = useAuthStore.getState().user?._id || localStorage.getItem('userId');
        const senderId =
          typeof data?.message?.sender === 'string'
            ? data.message.sender
            : data?.message?.sender?._id?.toString?.();
        const { permission, fcmToken } = useNotificationStore.getState();
        const hasFCMDelivery = permission === 'granted' && !!fcmToken;
        if (senderId && currentUserId && senderId !== currentUserId && document.hidden && !hasFCMDelivery) {
          const senderName = data?.message?.sender?.name || 'Someone';
          showBrowserNotification(`New DM from ${senderName}`, data?.message?.content || 'You have a new direct message', {
            workspaceId: conversationWorkspaceId,
            conversationId: roomId,
            resourceType: 'dm',
          });
        }
      };

      const handleGlobalNotification = (data: { notification: any }) => {
        const { addNotification, processedNotificationIds } = useNotificationStore.getState();
        const notification = data?.notification;
        if (!notification?._id) return;

        // Workspace scoping guard: while inside a workspace route, ignore
        // notifications from other workspaces for sidebar/badge realtime.
        if (typeof window !== 'undefined') {
          const match = window.location.pathname.match(/\/workspace\/([^/]+)/);
          const activeWorkspaceId = match?.[1];
          const notificationWorkspaceId = notification?.data?.workspaceId;
          if (
            activeWorkspaceId &&
            notificationWorkspaceId &&
            notificationWorkspaceId !== activeWorkspaceId
          ) {
            return;
          }
        }

        // Dedupe across socket + FCM paths.
        if (processedNotificationIds.has(notification._id)) return;
        processedNotificationIds.add(notification._id);

        addNotification(notification);
      };

      socketInstance.on('connect', handleConnect);
      socketInstance.on('disconnect', handleDisconnect);
      socketInstance.on('connect_error', handleConnectError);
      socketInstance.on('presence:update', handlePresenceUpdate);
      socketInstance.on('chat:new', handleGlobalChatMessage);
      socketInstance.on('dm:new', handleGlobalDM);
      socketInstance.on('notification:new', handleGlobalNotification);

      // Cleanup only removes listeners, doesn't disconnect
      return () => {
        console.log('[SocketContext] Removing event listeners...');
        socketInstance.off('connect', handleConnect);
        socketInstance.off('disconnect', handleDisconnect);
        socketInstance.off('connect_error', handleConnectError);
        socketInstance.off('presence:update', handlePresenceUpdate);
        socketInstance.off('chat:new', handleGlobalChatMessage);
        socketInstance.off('dm:new', handleGlobalDM);
        socketInstance.off('notification:new', handleGlobalNotification);
      };
    } catch (error) {
      console.error('[SocketContext] Failed to initialize socket:', error);
      setSocket(null);
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, isConnecting, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
