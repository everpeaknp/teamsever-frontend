import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

// Space metadata query (fast, loads instantly)
export function useSpaceMetadata(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['space', 'metadata', spaceId],
    queryFn: async () => {
      if (!spaceId) throw new Error('Space ID is required');
      const response = await api.get(`/spaces/${spaceId}/metadata`);
      return response.data.data;
    },
    enabled: !!spaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

// Space lists metadata query (without tasks, lightweight)
export function useSpaceListsMetadata(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['space', 'lists', 'metadata', spaceId],
    queryFn: async () => {
      if (!spaceId) throw new Error('Space ID is required');
      const response = await api.get(`/spaces/${spaceId}/lists/metadata`);
      return response.data.data;
    },
    enabled: !!spaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Full space query (heavy, for backward compatibility)
export function useSpace(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['space', 'full', spaceId],
    queryFn: async () => {
      if (!spaceId) throw new Error('Space ID is required');
      const response = await api.get(`/spaces/${spaceId}`);
      return response.data.data;
    },
    enabled: !!spaceId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
  });
}
