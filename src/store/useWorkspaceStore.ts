import { create } from 'zustand';
import { api } from '@/lib/axios';

export interface List {
  _id: string;
  name: string;
  description?: string;
  space: string;
  folderId?: string;
  workspace: string;
  status?: string;
  type: 'list';
  taskCount?: number; // Added from hierarchy endpoint
  createdAt?: string;
}

export interface Folder {
  _id: string;
  name: string;
  spaceId: string;
  color?: string;
  icon?: string;
  lists: List[];
  type: 'folder';
  createdAt?: string;
}

export interface Space {
  _id: string;
  name: string;
  description?: string;
  workspace: string;
  color?: string;
  icon?: string;
  status: string;
  members?: any[];
  folders: Folder[];
  lists: List[]; // Changed from listsWithoutFolder to match backend
  type: 'space';
  createdAt?: string;
}

export interface WorkspaceHierarchy {
  workspaceId: string;
  workspaceName: string;
  logo?: string;
  spaces: Space[];
}

interface WorkspaceStore {
  hierarchy: WorkspaceHierarchy | null;
  loading: boolean;
  error: string | null;
  lastFetchedWorkspaceId: string | null; // Track which workspace was fetched
  lastFetchTime: number | null; // Track when it was fetched
  
  // Actions
  fetchHierarchy: (workspaceId: string, force?: boolean) => Promise<void>;
  setHierarchy: (hierarchy: WorkspaceHierarchy) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Optimistic updates
  addSpace: (space: Space) => void;
  updateSpace: (spaceId: string, updates: Partial<Space>) => void;
  deleteSpace: (spaceId: string) => void;
  
  addFolder: (spaceId: string, folder: Folder) => void;
  updateFolder: (spaceId: string, folderId: string, updates: Partial<Folder>) => void;
  deleteFolder: (spaceId: string, folderId: string) => void;
  
  addList: (spaceId: string, list: List, folderId?: string) => void;
  updateList: (spaceId: string, listId: string, updates: Partial<List>, folderId?: string) => void;
  deleteList: (spaceId: string, listId: string, folderId?: string) => void;
  
  // Clear store
  clear: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  hierarchy: null,
  loading: false,
  error: null,
  lastFetchedWorkspaceId: null,
  lastFetchTime: null,

  // Fetch hierarchy from new optimized endpoint
  fetchHierarchy: async (workspaceId: string, force = false) => {
    const state = get();
    const CACHE_DURATION = 30000; // 30 seconds cache
    const now = Date.now();

    // Check if we already have fresh data for this workspace
    if (
      !force &&
      state.hierarchy &&
      state.lastFetchedWorkspaceId === workspaceId &&
      state.lastFetchTime &&
      now - state.lastFetchTime < CACHE_DURATION
    ) {
      console.log('[WorkspaceStore] Using cached hierarchy');
      return;
    }

    try {
      set({ loading: true, error: null });
      console.log('[WorkspaceStore] Fetching hierarchy for workspace:', workspaceId);

      const response = await api.get(`/workspaces/${workspaceId}/hierarchy`);
      const hierarchyData = response.data.data;

      // Transform backend response to match frontend structure
      const transformedHierarchy: WorkspaceHierarchy = {
        workspaceId: hierarchyData.workspaceId,
        workspaceName: hierarchyData.workspaceName,
        logo: hierarchyData.logo,
        spaces: hierarchyData.spaces.map((space: any) => ({
          ...space,
          type: 'space',
          folders: (space.folders || []).map((folder: any) => ({
            ...folder,
            type: 'folder',
            spaceId: space._id,
            lists: (folder.lists || []).map((list: any) => ({
              ...list,
              type: 'list',
              folderId: folder._id,
            })),
          })),
          lists: (space.lists || []).map((list: any) => ({
            ...list,
            type: 'list',
          })),
        })),
      };

      console.log('[WorkspaceStore] Hierarchy fetched successfully:', {
        spaces: transformedHierarchy.spaces.length,
        totalFolders: transformedHierarchy.spaces.reduce((sum, s) => sum + s.folders.length, 0),
        totalLists: transformedHierarchy.spaces.reduce(
          (sum, s) => sum + s.lists.length + s.folders.reduce((fSum, f) => fSum + f.lists.length, 0),
          0
        ),
      });

      set({
        hierarchy: transformedHierarchy,
        loading: false,
        error: null,
        lastFetchedWorkspaceId: workspaceId,
        lastFetchTime: now,
      });
    } catch (err: any) {
      console.error('[WorkspaceStore] Failed to fetch hierarchy:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load workspace';
      set({ error: errorMessage, loading: false });
      throw err;
    }
  },

  setHierarchy: (hierarchy) => set({ hierarchy, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Optimistic space updates
  addSpace: (space) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: [...state.hierarchy.spaces, space],
        },
      };
    }),

  updateSpace: (spaceId, updates) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: state.hierarchy.spaces.map((space) =>
            space._id === spaceId ? { ...space, ...updates } : space
          ),
        },
      };
    }),

  deleteSpace: (spaceId) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: state.hierarchy.spaces.filter((space) => space._id !== spaceId),
        },
      };
    }),

  // Optimistic folder updates
  addFolder: (spaceId, folder) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: state.hierarchy.spaces.map((space) =>
            space._id === spaceId
              ? { ...space, folders: [...space.folders, folder] }
              : space
          ),
        },
      };
    }),

  updateFolder: (spaceId, folderId, updates) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: state.hierarchy.spaces.map((space) =>
            space._id === spaceId
              ? {
                  ...space,
                  folders: space.folders.map((folder) =>
                    folder._id === folderId ? { ...folder, ...updates } : folder
                  ),
                }
              : space
          ),
        },
      };
    }),

  deleteFolder: (spaceId, folderId) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: state.hierarchy.spaces.map((space) =>
            space._id === spaceId
              ? {
                  ...space,
                  folders: space.folders.filter((folder) => folder._id !== folderId),
                }
              : space
          ),
        },
      };
    }),

  // Optimistic list updates
  addList: (spaceId, list, folderId) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: state.hierarchy.spaces.map((space) => {
            if (space._id !== spaceId) return space;

            if (folderId) {
              // Add to folder
              return {
                ...space,
                folders: space.folders.map((folder) =>
                  folder._id === folderId
                    ? { ...folder, lists: [...folder.lists, list] }
                    : folder
                ),
              };
            } else {
              // Add to standalone lists
              return {
                ...space,
                lists: [...space.lists, list],
              };
            }
          }),
        },
      };
    }),

  updateList: (spaceId, listId, updates, folderId) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: state.hierarchy.spaces.map((space) => {
            if (space._id !== spaceId) return space;

            if (folderId) {
              // Update in folder
              return {
                ...space,
                folders: space.folders.map((folder) =>
                  folder._id === folderId
                    ? {
                        ...folder,
                        lists: folder.lists.map((list) =>
                          list._id === listId ? { ...list, ...updates } : list
                        ),
                      }
                    : folder
                ),
              };
            } else {
              // Update in standalone lists
              return {
                ...space,
                lists: space.lists.map((list) =>
                  list._id === listId ? { ...list, ...updates } : list
                ),
              };
            }
          }),
        },
      };
    }),

  deleteList: (spaceId, listId, folderId) =>
    set((state) => {
      if (!state.hierarchy) return state;
      return {
        hierarchy: {
          ...state.hierarchy,
          spaces: state.hierarchy.spaces.map((space) => {
            if (space._id !== spaceId) return space;

            if (folderId) {
              // Delete from folder
              return {
                ...space,
                folders: space.folders.map((folder) =>
                  folder._id === folderId
                    ? {
                        ...folder,
                        lists: folder.lists.filter((list) => list._id !== listId),
                      }
                    : folder
                ),
              };
            } else {
              // Delete from standalone lists
              return {
                ...space,
                lists: space.lists.filter((list) => list._id !== listId),
              };
            }
          }),
        },
      };
    }),

  clear: () => set({ hierarchy: null, loading: false, error: null, lastFetchedWorkspaceId: null, lastFetchTime: null }),
}));
