import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  _id: string;
  sender: {
    _id: string;
    name: string;
    email: string;
  };
  content: string;
  createdAt: string;
  conversation?: string;
  workspace?: string;
  type?: 'text' | 'system';
  mentions?: string[];
  readBy?: string[];
  // Optimistic update fields
  sending?: boolean;  // True while message is being sent
  failed?: boolean;   // True if message failed to send
  tempId?: string;    // Temporary ID for optimistic messages
}

export interface ChatRoom {
  roomId: string;
  type: 'workspace' | 'direct';
  messages: ChatMessage[];
  unreadCount: number;
  lastMessage?: ChatMessage;
  draft?: string; // Persisted draft message
  participants?: string[]; // For DM rooms
  workspaceId?: string;
}

interface ChatStore {
  rooms: Record<string, ChatRoom>;
  activeRoomId: string | null;
  onlineUsers: Set<string>;
  
  // Room management
  setActiveRoom: (roomId: string) => void;
  getRoom: (roomId: string) => ChatRoom | undefined;
  createRoom: (roomId: string, type: 'workspace' | 'direct', workspaceId?: string, participants?: string[]) => void;
  
  // Message management
  addMessage: (roomId: string, message: ChatMessage) => void;
  setMessages: (roomId: string, messages: ChatMessage[]) => void;
  updateMessage: (roomId: string, tempId: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (roomId: string, messageId: string) => void;
  
  // Unread management
  incrementUnread: (roomId: string) => void;
  clearUnread: (roomId: string) => void;
  getTotalUnread: () => number;
  
  // Draft management
  setDraft: (roomId: string, draft: string) => void;
  getDraft: (roomId: string) => string;
  clearDraft: (roomId: string) => void;
  
  // Presence management
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  isUserOnline: (userId: string) => boolean;
  
  // Utility
  clearRoom: (roomId: string) => void;
  clearAllRooms: () => void;
}

// Generate stable room ID for DMs
export const generateDMRoomId = (userId1: string, userId2: string): string => {
  const sorted = [userId1, userId2].sort();
  return `dm_${sorted.join('_')}`;
};

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      rooms: {},
      activeRoomId: null,
      onlineUsers: new Set(),

      setActiveRoom: (roomId: string) => {
        set({ activeRoomId: roomId });
        // Clear unread when entering room
        get().clearUnread(roomId);
      },

      getRoom: (roomId: string) => {
        return get().rooms[roomId];
      },

      createRoom: (roomId: string, type: 'workspace' | 'direct', workspaceId?: string, participants?: string[]) => {
        const rooms = get().rooms;
        if (!rooms[roomId]) {
          set({
            rooms: {
              ...rooms,
              [roomId]: {
                roomId,
                type,
                messages: [],
                unreadCount: 0,
                draft: '',
                workspaceId,
                participants,
              },
            },
          });
        }
      },

      addMessage: (roomId: string, message: ChatMessage) => {
        const rooms = get().rooms;
        const room = rooms[roomId];
        
        if (!room) {
          // Create room if it doesn't exist
          const type = roomId.startsWith('dm_') ? 'direct' : 'workspace';
          get().createRoom(roomId, type);
        }

        set({
          rooms: {
            ...rooms,
            [roomId]: {
              ...rooms[roomId],
              messages: [...(rooms[roomId]?.messages || []), message],
              lastMessage: message,
            },
          },
        });

        // Increment unread if not active room
        if (get().activeRoomId !== roomId) {
          get().incrementUnread(roomId);
        }
      },

      setMessages: (roomId: string, messages: ChatMessage[]) => {
        const rooms = get().rooms;
        set({
          rooms: {
            ...rooms,
            [roomId]: {
              ...rooms[roomId],
              messages,
              lastMessage: messages[messages.length - 1],
            },
          },
        });
      },

      updateMessage: (roomId: string, tempId: string, updates: Partial<ChatMessage>) => {
        const rooms = get().rooms;
        const room = rooms[roomId];
        
        if (!room) return;

        const messageIndex = room.messages.findIndex(m => m._id === tempId || m.tempId === tempId);
        
        if (messageIndex === -1) return;

        const updatedMessages = [...room.messages];
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          ...updates,
        };

        set({
          rooms: {
            ...rooms,
            [roomId]: {
              ...room,
              messages: updatedMessages,
              lastMessage: updatedMessages[updatedMessages.length - 1],
            },
          },
        });
      },

      removeMessage: (roomId: string, messageId: string) => {
        const rooms = get().rooms;
        const room = rooms[roomId];
        
        if (!room) return;

        const filteredMessages = room.messages.filter(m => m._id !== messageId && m.tempId !== messageId);

        set({
          rooms: {
            ...rooms,
            [roomId]: {
              ...room,
              messages: filteredMessages,
              lastMessage: filteredMessages[filteredMessages.length - 1],
            },
          },
        });
      },

      incrementUnread: (roomId: string) => {
        const rooms = get().rooms;
        const room = rooms[roomId];
        if (room) {
          set({
            rooms: {
              ...rooms,
              [roomId]: {
                ...room,
                unreadCount: room.unreadCount + 1,
              },
            },
          });
        }
      },

      clearUnread: (roomId: string) => {
        const rooms = get().rooms;
        const room = rooms[roomId];
        if (room && room.unreadCount > 0) {
          set({
            rooms: {
              ...rooms,
              [roomId]: {
                ...room,
                unreadCount: 0,
              },
            },
          });
        }
      },

      getTotalUnread: () => {
        const rooms = get().rooms;
        return Object.values(rooms).reduce((total, room) => total + room.unreadCount, 0);
      },

      setDraft: (roomId: string, draft: string) => {
        const rooms = get().rooms;
        const room = rooms[roomId];
        if (room) {
          set({
            rooms: {
              ...rooms,
              [roomId]: {
                ...room,
                draft,
              },
            },
          });
        }
      },

      getDraft: (roomId: string) => {
        return get().rooms[roomId]?.draft || '';
      },

      clearDraft: (roomId: string) => {
        get().setDraft(roomId, '');
      },

      setUserOnline: (userId: string) => {
        const onlineUsers = new Set(get().onlineUsers);
        onlineUsers.add(userId);
        set({ onlineUsers });
      },

      setUserOffline: (userId: string) => {
        const onlineUsers = new Set(get().onlineUsers);
        onlineUsers.delete(userId);
        set({ onlineUsers });
      },

      isUserOnline: (userId: string) => {
        return get().onlineUsers.has(userId);
      },

      clearRoom: (roomId: string) => {
        const rooms = { ...get().rooms };
        delete rooms[roomId];
        set({ rooms });
      },

      clearAllRooms: () => {
        set({ rooms: {}, activeRoomId: null });
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        rooms: state.rooms,
        // Don't persist onlineUsers as they should be fresh on reload
      }),
    }
  )
);
