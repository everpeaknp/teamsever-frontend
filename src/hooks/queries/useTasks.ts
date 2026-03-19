import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  assignees?: string[];
  dueDate?: string;
  listId: string;
  spaceId: string;
  workspaceId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: { spaceId?: string; listId?: string; status?: string }) => 
    [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  infinite: (filters: { spaceId?: string; listId?: string }) =>
    [...taskKeys.all, 'infinite', filters] as const,
};

/**
 * Fetch tasks for a space or list
 * Cached for 30 seconds (tasks change frequently)
 */
export function useTasks(filters: { 
  spaceId?: string; 
  listId?: string; 
  status?: string;
}) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.spaceId) params.append('spaceId', filters.spaceId);
      if (filters.listId) params.append('listId', filters.listId);
      if (filters.status) params.append('status', filters.status);
      
      const response = await api.get<{ data: Task[] }>(`/tasks?${params.toString()}`);
      return response.data.data;
    },
    enabled: !!(filters.spaceId || filters.listId),
    staleTime: 30 * 1000, // 30 seconds (tasks change frequently)
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch tasks with infinite scroll/pagination
 * For large task lists
 */
export function useInfiniteTasks(filters: {
  spaceId?: string;
  listId?: string;
  limit?: number;
}) {
  return useInfiniteQuery({
    queryKey: taskKeys.infinite(filters),
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams();
      if (filters.spaceId) params.append('spaceId', filters.spaceId);
      if (filters.listId) params.append('listId', filters.listId);
      params.append('limit', String(filters.limit || 50));
      params.append('skip', String(pageParam));
      
      const response = await api.get<{ data: Task[]; hasMore: boolean }>(
        `/tasks?${params.toString()}`
      );
      return response.data;
    },
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.hasMore) return undefined;
      return pages.length * (filters.limit || 50);
    },
    enabled: !!(filters.spaceId || filters.listId),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    initialPageParam: 0,
  });
}

/**
 * Fetch a single task by ID
 */
export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: taskKeys.detail(taskId || ''),
    queryFn: async () => {
      if (!taskId) throw new Error('Task ID is required');
      const response = await api.get<{ data: Task }>(`/tasks/${taskId}`);
      return response.data.data;
    },
    enabled: !!taskId,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });
}

/**
 * Prefetch tasks - call this on hover
 */
export function usePrefetchTasks() {
  const queryClient = useQueryClient();
  
  return (filters: { spaceId?: string; listId?: string }) => {
    queryClient.prefetchQuery({
      queryKey: taskKeys.list(filters),
      queryFn: async () => {
        const params = new URLSearchParams();
        if (filters.spaceId) params.append('spaceId', filters.spaceId);
        if (filters.listId) params.append('listId', filters.listId);
        
        const response = await api.get<{ data: Task[] }>(`/tasks?${params.toString()}`);
        return response.data.data;
      },
      staleTime: 30 * 1000,
    });
  };
}
