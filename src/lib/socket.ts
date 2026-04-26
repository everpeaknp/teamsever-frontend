import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

let socket: Socket | null = null;
let isInitializing = false;
let initializationPromise: Promise<Socket> | null = null;

export const initializeSocket = (token: string): Socket => {
  // VALIDATE TOKEN before attempting connection
  if (!token || 
      token === 'undefined' || 
      token === 'null' || 
      token.trim() === '' ||
      typeof token !== 'string') {
    throw new Error('Invalid authentication token for socket connection');
  }
  
  // If socket exists and is connected, reuse it
  if (socket?.connected) {
    return socket;
  }

  // If already initializing, wait for that to complete
  if (isInitializing && initializationPromise) {
    throw new Error('Socket initialization in progress');
  }

  // Disconnect old socket if it exists but not connected
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  isInitializing = true;

  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000, // Start at 1s
    reconnectionDelayMax: 30000, // Max 30s
    reconnectionAttempts: Infinity, // Keep trying
    timeout: 20000,
    randomizationFactor: 0.5,
  });

  socket.on('connect', () => {
    console.log('[Socket] ✓ Connected');
    isInitializing = false;
  });

  socket.on('disconnect', (reason) => {
    // Log the disconnect reason (e.g., "io server disconnect", "transport close")
    // Note: Do NOT clear the token here. 'io server disconnect' happens when the server restarts
    // gracefully via Nodemon. Genuine auth errors are caught by 'connect_error' or Axios 401s.
    console.log(`[Socket] Disconnected: ${reason}`);
    
    // If it was a forced disconnect by the server, we might want to manually reconnect
    // but socket.io typically handles this or wait for page interactions.
    if (reason === 'io server disconnect') {
      // the disconnection was initiated by the server, you need to reconnect manually
      setTimeout(() => {
        if (socket && !isInitializing) {
          socket.connect();
        }
      }, 5000);
    }
  });

  socket.on('connect_error', (error) => {
    // Silently handle WebSocket connection errors
    // These are expected when server is starting or during reconnection
    
    // Only handle auth errors
    if (error.message.includes('Authentication') || error.message.includes('auth')) {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const isPublicPage = currentPath.includes('/login') || currentPath.includes('/register') || currentPath === '/';
        
        if (!isPublicPage) {
          localStorage.removeItem('token');
          localStorage.removeItem('authToken');
          localStorage.removeItem('userId');
          localStorage.removeItem('userName');
          localStorage.removeItem('userEmail');
        }
      }
    }
    isInitializing = false;
  });

  socket.on('reconnect_failed', () => {
    // Stop reconnection attempts after max attempts reached
    console.log('[Socket] Reconnection failed - stopping attempts');
    if (socket) {
      socket.disconnect();
    }
    isInitializing = false;
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    // Only log every 3rd attempt to reduce console noise
    if (attemptNumber % 3 === 0) {
      console.log(`[Socket] Reconnection attempt ${attemptNumber}`);
    }
  });

  // Remove the generic error handler to reduce console noise
  // socket.on('error', ...) removed

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinWorkspace = (workspaceId: string): void => {
  if (!socket) return;
  socket.emit('join_workspace', { workspaceId });
};

export const joinSpace = (spaceId: string): void => {
  if (!socket) return;
  socket.emit('join_space', { spaceId });
};

export const joinTask = (taskId: string): void => {
  if (!socket) return;
  socket.emit('join_task', { taskId });
};

export const leaveTask = (taskId: string): void => {
  if (!socket) return;
  socket.emit('leave_task', { taskId });
};

export const joinDM = (conversationId: string): void => {
  if (!socket) return;
  socket.emit('join_dm', { conversationId });
};

export const leaveDM = (conversationId: string): void => {
  if (!socket) return;
  socket.emit('leave_dm', { conversationId });
};
