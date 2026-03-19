import { create } from 'zustand';

interface TaskSidebarState {
  isOpen: boolean;
  taskId: string | null;
  openTask: (id: string) => void;
  closeTask: () => void;
}

export const useTaskSidebarStore = create<TaskSidebarState>((set) => ({
  isOpen: false,
  taskId: null,
  openTask: (id: string) => set({ isOpen: true, taskId: id }),
  closeTask: () => set({ isOpen: false, taskId: null }),
}));
