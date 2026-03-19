import { create } from 'zustand';
import { api } from '@/lib/axios';
import { Task } from '@/types';
import { toast } from 'sonner';

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: (listId: string) => Promise<void>;
  createTask: (listId: string, data: Partial<Task>) => Promise<Task | null>;
  updateTask: (taskId: string, data: Partial<Task>) => Promise<Task | null>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTaskStatus: (taskId: string, status: string, taskName: string) => Promise<void>;
  setTasks: (tasks: Task[]) => void;
  clearTasks: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async (listId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/lists/${listId}/tasks`);
      set({ tasks: response.data.data, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch tasks', loading: false });
    }
  },

  createTask: async (listId: string, data: Partial<Task>) => {
    try {
      const response = await api.post(`/lists/${listId}/tasks`, data);
      const newTask = response.data.data;
      set({ tasks: [...get().tasks, newTask] });
      
      // Invalidate analytics cache
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('invalidateAnalyticsCache'));
      }
      
      toast.success("Task created successfully");
      return newTask;
    } catch (error: any) {
      // Check for task limit error
      if (error.response?.data?.code === 'TASK_LIMIT_REACHED') {
        toast.error(error.response?.data?.message || 'Task limit reached. Please upgrade your plan to create more tasks.');
      } else {
        const msg = error.response?.data?.message || 'Failed to create task';
        toast.error(msg);
      }
      return null;
    }
  },

  updateTaskStatus: async (taskId: string, status: string, taskName: string) => {
    const previousTasks = [...get().tasks];
    
    // Cast status to proper type
    const taskStatus = status as Task['status'];
    
    console.log('[TaskStore] updateTaskStatus called:', { taskId, status: taskStatus });
    
    // 1. Optimistic Update (Instant UI move)
    set({
      tasks: get().tasks.map(task =>
        task._id === taskId ? { ...task, status: taskStatus } : task
      )
    });
    
    console.log('[TaskStore] Optimistic update applied');

    try {
      console.log('[TaskStore] Sending PATCH request to /tasks/' + taskId);
      const response = await api.patch(`/tasks/${taskId}`, { status: taskStatus });
      
      console.log('[TaskStore] API response received:', response.data);
      
      // Sync with real server data
      set({
        tasks: get().tasks.map(task =>
          task._id === taskId ? response.data.data : task
        )
      });
      
      // Invalidate analytics cache
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('invalidateAnalyticsCache'));
      }
      
      console.log('[TaskStore] State synced with server response');

    } catch (error: any) {
      // 2. Rollback on error
      console.error('[TaskStore] Error updating task status, rolling back');
      set({ tasks: previousTasks });
      
      console.error('[updateTaskStatus] Error:', error);
      console.error('[updateTaskStatus] Error response:', error.response?.data);
      
      const errorMsg = error.response?.status === 403 
        ? "Access Denied: You don't have permission to edit this task." 
        : error.response?.data?.message || "Failed to change task status";
      toast.error(errorMsg);
    }
  },

  updateTask: async (taskId: string, data: Partial<Task>) => {
    try {
      const response = await api.patch(`/tasks/${taskId}`, data);
      const updatedTask = response.data.data;
      set({ tasks: get().tasks.map(t => t._id === taskId ? updatedTask : t) });
      
      // Invalidate analytics cache
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('invalidateAnalyticsCache'));
      }
      
      return updatedTask;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Update failed");
      return null;
    }
  },

  deleteTask: async (taskId: string) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      set({ tasks: get().tasks.filter(t => t._id !== taskId) });
      
      // Invalidate analytics cache
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('invalidateAnalyticsCache'));
      }
      
      toast.success("Task deleted");
    } catch (error: any) {
      toast.error("Permission denied");
    }
  },

  setTasks: (tasks: Task[]) => set({ tasks }),
  clearTasks: () => set({ tasks: [], error: null }),
}));