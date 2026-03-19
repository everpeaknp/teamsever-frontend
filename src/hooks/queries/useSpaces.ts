import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface Space {
  _id: string;
  name: string;
  workspaceId: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export const spaceKeys = {
  all: ['spaces'] as const,
  lists: () => [...spaceKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...spaceKeys.lists(), { workspaceId }] as const,
  details: () => [...spaceKeys.all, 'detail'] as const,
  detail: (id: string) => [...spaceKeys.details(), id] as const,
};

/**
 * Fetch all spaces for a workspace
 * Cached for 1 minute
 */
export function useSpaces(workspaceId: string | undefined) {
  return useQuery({
    queryKey: spaceKeys.list(workspaceId || ''),
    queryFn: async () => {
      if (!workspaceId) throw new Error('Workspace ID is required');
      const response = await api.get<{ data: Space[] }>(`/workspaces/${workspaceId}/spaces`);
      return response.data.data;
    },
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch a single space by ID
 */
export function useSpace(spaceId: string | undefined) {
  return useQuery({
    queryKey: spaceKeys.detail(spaceId || ''),
    queryFn: async () => {
      if (!spaceId) throw new Error('Space ID is required');
      const response = await api.get<{ data: Space }>(`/spaces/${spaceId}`);
      return response.data.data;
    },
    enabled: !!spaceId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Prefetch spaces for a workspace - call this on hover
 */
export function usePrefetchSpaces() {
  const queryClient = useQueryClient();
  
  return (workspaceId: string) => {
    queryClient.prefetchQuery({
      queryKey: spaceKeys.list(workspaceId),
      queryFn: async () => {
        const response = await api.get<{ data: Space[] }>(`/workspaces/${workspaceId}/spaces`);
        return response.data.data;
      },
      staleTime: 60 * 1000,
    });
  };
}

/**
 * Prefetch a single space - call this on hover
 */
export function usePrefetchSpace() {
  const queryClient = useQueryClient();
  
  return (spaceId: string) => {
    queryClient.prefetchQuery({
      queryKey: spaceKeys.detail(spaceId),
      queryFn: async () => {
        const response = await api.get<{ data: Space }>(`/spaces/${spaceId}`);
        return response.data.data;
      },
      staleTime: 60 * 1000,
    });
  };
}
