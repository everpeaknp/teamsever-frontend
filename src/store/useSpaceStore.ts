import { create } from 'zustand';
import { api } from '@/lib/axios';
import { Space, List } from '@/types';

interface Folder {
  _id: string;
  name: string;
  spaceId: string;
  lists: List[];
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

interface SpaceStore {
  currentSpace: Space | null;
  lists: List[];
  folders: Folder[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchSpace: (spaceId: string) => Promise<void>;
  fetchLists: (spaceId: string) => Promise<void>;
  fetchFolders: (spaceId: string) => Promise<void>;
  createList: (spaceId: string, data: { name: string; description?: string; folderId?: string }) => Promise<List>;
  createFolder: (spaceId: string, data: { name: string; color?: string }) => Promise<Folder>;
  updateSpace: (spaceId: string, data: Partial<Space>) => Promise<Space>;
  deleteList: (listId: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  addMemberToSpace: (spaceId: string, userId: string, role?: 'admin' | 'member') => Promise<void>;
  removeMemberFromSpace: (spaceId: string, userId: string) => Promise<void>;
  addListOptimistic: (list: List) => void; // Add optimistic update method
  clearSpace: () => void;
}

export const useSpaceStore = create<SpaceStore>((set, get) => ({
  currentSpace: null,
  lists: [],
  folders: [],
  loading: false,
  error: null,

  fetchSpace: async (spaceId: string) => {
    if (!spaceId || spaceId === 'undefined') {
      console.warn('[useSpaceStore] fetchSpace called with invalid spaceId:', spaceId);
      set({ loading: false, error: 'Space ID is required' });
      return;
    }
    
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/spaces/${spaceId}`);
      set({ currentSpace: response.data.data, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch space',
        loading: false 
      });
      throw error;
    }
  },

  fetchLists: async (spaceId: string) => {
    if (!spaceId || spaceId === 'undefined') {
      console.warn('[useSpaceStore] fetchLists called with invalid spaceId:', spaceId);
      set({ lists: [] });
      return;
    }
    
    try {
      const response = await api.get(`/spaces/${spaceId}/lists`);
      set({ lists: response.data.data });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch lists' });
      throw error;
    }
  },

  fetchFolders: async (spaceId: string) => {
    if (!spaceId || spaceId === 'undefined') {
      console.warn('[useSpaceStore] fetchFolders called with invalid spaceId:', spaceId);
      set({ folders: [] });
      return;
    }
    
    try {
      const response = await api.get(`/spaces/${spaceId}/folders`);
      set({ folders: response.data.data });
    } catch (error: any) {
      // If folders endpoint doesn't exist, just set empty array
      console.log('[useSpaceStore] fetchFolders error (setting empty array):', error.response?.status);
      set({ folders: [] });
    }
  },

  createList: async (spaceId: string, data) => {
    try {
      const response = await api.post(`/spaces/${spaceId}/lists`, data);
      const newList = response.data.data;
      set({ lists: [...get().lists, newList] });
      return newList;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to create list' });
      throw error;
    }
  },

  createFolder: async (spaceId: string, data) => {
    try {
      const response = await api.post(`/spaces/${spaceId}/folders`, data);
      const newFolder = response.data.data;
      set({ folders: [...get().folders, newFolder] });
      return newFolder;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to create folder' });
      throw error;
    }
  },

  updateSpace: async (spaceId: string, data) => {
    try {
      const response = await api.patch(`/spaces/${spaceId}`, data);
      const updatedSpace = response.data.data;
      set({ currentSpace: updatedSpace });
      return updatedSpace;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update space' });
      throw error;
    }
  },

  deleteList: async (listId: string) => {
    try {
      await api.delete(`/lists/${listId}`);
      
      set((state) => {
        // Find the list to get its folderId
        const listToDelete = state.lists.find(l => l._id === listId);
        const folderId = listToDelete?.folderId;
        
        // Remove from main lists array
        const newLists = state.lists.filter(list => list._id !== listId);
        
        // If list was in a folder, also remove it from that folder's lists array
        let newFolders = state.folders;
        if (folderId) {
          newFolders = state.folders.map(folder =>
            folder._id === folderId
              ? { ...folder, lists: folder.lists.filter(l => l._id !== listId) }
              : folder
          );
        }
        
        return {
          lists: newLists,
          folders: newFolders
        };
      });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete list' });
      throw error;
    }
  },

  deleteFolder: async (folderId: string) => {
    try {
      await api.delete(`/folders/${folderId}`);
      set({ folders: get().folders.filter(folder => folder._id !== folderId) });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete folder' });
      throw error;
    }
  },

  addMemberToSpace: async (spaceId: string, userId: string, role = 'member' as 'admin' | 'member') => {
    try {
      await api.post(`/spaces/${spaceId}/members`, { userId, role });
      // Refresh space to get updated members
      const response = await api.get(`/spaces/${spaceId}`);
      set({ currentSpace: response.data.data });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to add member' });
      throw error;
    }
  },

  removeMemberFromSpace: async (spaceId: string, userId: string) => {
    try {
      await api.delete(`/spaces/${spaceId}/members/${userId}`);
      // Refresh space to get updated members
      const response = await api.get(`/spaces/${spaceId}`);
      set({ currentSpace: response.data.data });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to remove member' });
      throw error;
    }
  },

  addListOptimistic: (list: List) => {
    console.log('[SpaceStore] addListOptimistic called with:', list);
    set((state) => {
      console.log('[SpaceStore] Current folders:', state.folders);
      console.log('[SpaceStore] List folderId:', list.folderId);
      
      // Add to main lists array
      const newLists = [...state.lists, list];
      
      // If list belongs to a folder, also add it to that folder's lists array
      let newFolders = state.folders;
      if (list.folderId) {
        newFolders = state.folders.map(folder => {
          if (folder._id === list.folderId) {
            console.log('[SpaceStore] Adding list to folder:', folder.name);
            return { ...folder, lists: [...folder.lists, list] };
          }
          return folder;
        });
      }
      
      console.log('[SpaceStore] New folders:', newFolders);
      
      return {
        lists: newLists,
        folders: newFolders
      };
    });
  },

  clearSpace: () => set({ currentSpace: null, lists: [], folders: [], error: null }),
}));
