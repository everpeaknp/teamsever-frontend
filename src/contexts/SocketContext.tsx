'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { initializeSocket, disconnectSocket, getSocket } from '@/lib/socket';

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

      const handleConnect = () => {
        console.log('[SocketContext] ✓ Connected');
        setIsConnected(true);
        setIsConnecting(false);
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
      };

      socketInstance.on('connect', handleConnect);
      socketInstance.on('disconnect', handleDisconnect);
      socketInstance.on('connect_error', handleConnectError);
      socketInstance.on('presence:update', handlePresenceUpdate);

      // Cleanup only removes listeners, doesn't disconnect
      return () => {
        console.log('[SocketContext] Removing event listeners...');
        socketInstance.off('connect', handleConnect);
        socketInstance.off('disconnect', handleDisconnect);
        socketInstance.off('connect_error', handleConnectError);
        socketInstance.off('presence:update', handlePresenceUpdate);
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
