import { create } from 'zustand';

export type ModalType = 'space' | 'folder' | 'list' | 'editSpace' | 'editFolder' | 'editList';
export type ParentType = 'workspace' | 'space' | 'folder';

interface ModalState {
  // Modal state
  isOpen: boolean;
  type: ModalType | null;
  parentId: string | null;
  parentType: ParentType | null;
  parentName: string | null;
  spaceId: string | null; // Added for list creation inside folders
  
  // Actions
  openModal: (
    type: ModalType,
    parentId: string,
    parentType: ParentType,
    parentName?: string,
    spaceId?: string // Added optional spaceId parameter
  ) => void;
  closeModal: () => void;
  
  // Callback for refresh after creation
  onSuccess?: () => void;
  setOnSuccess: (callback: () => void) => void;
}

export const useModalStore = create<ModalState>((set) => ({
  // Initial state
  isOpen: false,
  type: null,
  parentId: null,
  parentType: null,
  parentName: null,
  spaceId: null,
  onSuccess: undefined,

  // Open modal with context
  openModal: (type, parentId, parentType, parentName, spaceId) => {
    set({
      isOpen: true,
      type,
      parentId,
      parentType,
      parentName: parentName || null,
      spaceId: spaceId || null,
    });
  },

  // Close modal and reset state
  closeModal: () => {
    set({
      isOpen: false,
      type: null,
      parentId: null,
      parentType: null,
      parentName: null,
      spaceId: null,
    });
  },

  // Set success callback
  setOnSuccess: (callback) => {
    set({ onSuccess: callback });
  },
}));
