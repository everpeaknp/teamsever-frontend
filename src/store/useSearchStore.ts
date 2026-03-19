import { create } from 'zustand';

export interface SearchResult {
  id: string;
  type: 'space' | 'list' | 'task';
  name: string;
  parentName?: string;
  parentId?: string;
  workspaceId: string;
  spaceId?: string;
  listId?: string;
  path: string[]; // Breadcrumb path
  url: string;
}

interface SearchState {
  isOpen: boolean;
  query: string;
  results: SearchResult[];
  selectedIndex: number;
  isSearching: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (query: string) => void;
  setResults: (results: SearchResult[]) => void;
  setSelectedIndex: (index: number) => void;
  setIsSearching: (isSearching: boolean) => void;
  resetSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  isOpen: false,
  query: '',
  results: [],
  selectedIndex: 0,
  isSearching: false,
  openSearch: () => set({ isOpen: true }),
  closeSearch: () => set({ isOpen: false, query: '', results: [], selectedIndex: 0 }),
  setQuery: (query) => set({ query, selectedIndex: 0 }),
  setResults: (results) => set({ results }),
  setSelectedIndex: (index) => set({ selectedIndex: index }),
  setIsSearching: (isSearching) => set({ isSearching }),
  resetSearch: () => set({ query: '', results: [], selectedIndex: 0 }),
}));
