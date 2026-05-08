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
  type?: 'text' | 'system' | 'github_commit';
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
  setOnlineUsers: (userIds: string[]) => void;
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
        let wasInserted = false;

        set((state) => {
          const existingRoom = state.rooms[roomId];
          const inferredType: 'workspace' | 'direct' =
            (message.conversation || roomId.startsWith('dm_')) ? 'direct' : 'workspace';

          const baseRoom = existingRoom || {
            roomId,
            type: inferredType,
            messages: [],
            unreadCount: 0,
            draft: '',
            workspaceId: typeof message.workspace === 'string' ? message.workspace : undefined,
            participants: undefined,
          };

          // Prevent duplicate inserts when the same socket event is handled
          // by multiple listeners (global + page-level).
          if ((baseRoom.messages || []).some((m) => m._id === message._id)) {
            return state;
          }

          wasInserted = true;

          return {
            rooms: {
              ...state.rooms,
              [roomId]: {
                ...baseRoom,
                unreadCount: typeof baseRoom.unreadCount === 'number' ? baseRoom.unreadCount : 0,
                messages: [...(baseRoom.messages || []), message],
                lastMessage: message,
              },
            },
          };
        });

        if (!wasInserted) return;

        const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        
        // Handle sender being an object or just a string ID
        const senderId = typeof message.sender === 'object' ? message.sender._id : message.sender;
        const isFromOthers = senderId !== currentUserId;
        
        if (isFromOthers) {
          const activeRoomId = get().activeRoomId;
          const isActiveRoom = activeRoomId === roomId;

          // Guard against stale activeRoomId suppressing unread badges after navigation.
          // Only suppress unread when user is actually on the matching chat screen.
          let isActivelyViewingThisRoom = false;
          if (typeof window !== 'undefined' && isActiveRoom) {
            const path = window.location.pathname || '';
            const isWorkspaceRoom = roomId.startsWith('workspace_') || roomId.startsWith('channel_');
            const isDirectRoom = !isWorkspaceRoom;
            isActivelyViewingThisRoom =
              (isWorkspaceRoom && path.includes('/chat')) ||
              (isDirectRoom && path.includes('/inbox'));
          }

          if (!isActivelyViewingThisRoom) {
            get().incrementUnread(roomId);
          }
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
          const currentUnread = typeof room.unreadCount === 'number' ? room.unreadCount : 0;
          set({
            rooms: {
              ...rooms,
              [roomId]: {
                ...room,
                unreadCount: currentUnread + 1,
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
      
      setOnlineUsers: (userIds: string[]) => {
        set({ onlineUsers: new Set(userIds) });
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
