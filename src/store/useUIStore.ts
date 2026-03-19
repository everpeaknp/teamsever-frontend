import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Sidebar state
  isSidebarOpen: boolean;
  sidebarWidth: number;
  
  // Expanded items (Spaces/Folders)
  expandedIds: string[];
  
  // Favorites
  favoriteIds: string[];
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  
  // Expansion management
  toggleExpanded: (id: string) => void;
  setExpanded: (id: string, expanded: boolean) => void;
  expandAll: (ids: string[]) => void;
  collapseAll: () => void;
  
  // Favorites management
  toggleFavorite: (id: string) => void;
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      isSidebarOpen: true,
      sidebarWidth: 280,
      expandedIds: [],
      favoriteIds: [],

      // Sidebar actions
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      
      setSidebarOpen: (open: boolean) => set({ isSidebarOpen: open }),
      
      setSidebarWidth: (width: number) => set({ sidebarWidth: Math.max(240, Math.min(400, width)) }),

      // Expansion actions
      toggleExpanded: (id: string) => {
        const { expandedIds } = get();
        const isExpanded = expandedIds.includes(id);
        
        set({
          expandedIds: isExpanded
            ? expandedIds.filter((itemId) => itemId !== id)
            : [...expandedIds, id],
        });
      },

      setExpanded: (id: string, expanded: boolean) => {
        const { expandedIds } = get();
        const isExpanded = expandedIds.includes(id);

        if (expanded && !isExpanded) {
          set({ expandedIds: [...expandedIds, id] });
        } else if (!expanded && isExpanded) {
          set({ expandedIds: expandedIds.filter((itemId) => itemId !== id) });
        }
      },

      expandAll: (ids: string[]) => {
        const { expandedIds } = get();
        const newIds = ids.filter((id) => !expandedIds.includes(id));
        set({ expandedIds: [...expandedIds, ...newIds] });
      },

      collapseAll: () => set({ expandedIds: [] }),

      // Favorites actions
      toggleFavorite: (id: string) => {
        const { favoriteIds } = get();
        const isFavorite = favoriteIds.includes(id);

        set({
          favoriteIds: isFavorite
            ? favoriteIds.filter((itemId) => itemId !== id)
            : [...favoriteIds, id],
        });
      },

      addFavorite: (id: string) => {
        const { favoriteIds } = get();
        if (!favoriteIds.includes(id)) {
          set({ favoriteIds: [...favoriteIds, id] });
        }
      },

      removeFavorite: (id: string) => {
        set((state) => ({
          favoriteIds: state.favoriteIds.filter((itemId) => itemId !== id),
        }));
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        isSidebarOpen: state.isSidebarOpen,
        sidebarWidth: state.sidebarWidth,
        expandedIds: state.expandedIds,
        favoriteIds: state.favoriteIds,
      }),
    }
  )
);
