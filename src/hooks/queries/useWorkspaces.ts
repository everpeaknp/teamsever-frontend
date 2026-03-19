import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface Workspace {
  _id: string;
  name: string;
  owner: string;
  members: Array<{
    userId: string;
    role: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export const workspaceKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  list: (filters: string) => [...workspaceKeys.lists(), { filters }] as const,
  details: () => [...workspaceKeys.all, 'detail'] as const,
  detail: (id: string) => [...workspaceKeys.details(), id] as const,
};

/**
 * Fetch all workspaces for the current user
 * Cached for 1 minute, refetches on window focus
 */
export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: async () => {
      const response = await api.get<{ data: Workspace[] }>('/workspaces');
      return response.data.data;
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });
}

/**
 * Fetch a single workspace by ID
 */
export function useWorkspace(workspaceId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId || ''),
    queryFn: async () => {
      if (!workspaceId) throw new Error('Workspace ID is required');
      const response = await api.get<{ data: Workspace }>(`/workspaces/${workspaceId}`);
      return response.data.data;
    },
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Prefetch workspaces - call this on hover
 */
export function usePrefetchWorkspaces() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: workspaceKeys.lists(),
      queryFn: async () => {
        const response = await api.get<{ data: Workspace[] }>('/workspaces');
        return response.data.data;
      },
      staleTime: 60 * 1000,
    });
  };
}

/**
 * Prefetch a single workspace - call this on hover
 */
export function usePrefetchWorkspace() {
  const queryClient = useQueryClient();
  
  return (workspaceId: string) => {
    queryClient.prefetchQuery({
      queryKey: workspaceKeys.detail(workspaceId),
      queryFn: async () => {
        const response = await api.get<{ data: Workspace }>(`/workspaces/${workspaceId}`);
        return response.data.data;
      },
      staleTime: 60 * 1000,
    });
  };
}
