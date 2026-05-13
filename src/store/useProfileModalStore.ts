import { create } from 'zustand';

interface ProfileModalState {
  isOpen: boolean;
  userId: string | null;
  openProfile: (userId: string) => void;
  closeProfile: () => void;
}

export const useProfileModalStore = create<ProfileModalState>((set) => ({
  isOpen: false,
  userId: null,
  openProfile: (userId) => set({ isOpen: true, userId }),
  closeProfile: () => set({ isOpen: false, userId: null }),
}));
