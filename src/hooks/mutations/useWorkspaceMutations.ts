import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Workspace, workspaceKeys } from '../queries/useWorkspaces';
import { toast } from 'sonner';

interface CreateWorkspaceInput {
  name: string;
}

interface UpdateWorkspaceInput {
  workspaceId: string;
  name: string;
}

/**
 * Create workspace with optimistic update
 */
export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorkspaceInput) => {
      const response = await api.post<{ data: Workspace }>('/workspaces', input);
      return response.data.data;
    },

    onMutate: async (newWorkspace) => {
      await queryClient.cancelQueries({ queryKey: workspaceKeys.lists() });

      const previousWorkspaces = queryClient.getQueryData<Workspace[]>(workspaceKeys.lists());

      // Optimistically add workspace
      const optimisticWorkspace: Workspace = {
        _id: `temp-${Date.now()}`,
        name: newWorkspace.name,
        owner: 'current-user',
        members: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Workspace[]>(
        workspaceKeys.lists(),
        (old) => old ? [...old, optimisticWorkspace] : [optimisticWorkspace]
      );

      return { previousWorkspaces, optimisticWorkspace };
    },

    onSuccess: (data, variables, context) => {
      queryClient.setQueryData<Workspace[]>(
        workspaceKeys.lists(),
        (old) => old ? old.map(ws => 
          ws._id === context?.optimisticWorkspace._id ? data : ws
        ) : [data]
      );
      toast.success('Workspace created successfully!');
    },

    onError: (err: any, variables, context) => {
      if (context?.previousWorkspaces) {
        queryClient.setQueryData(workspaceKeys.lists(), context.previousWorkspaces);
      }
      
      if (err.response?.data?.code === 'WORKSPACE_LIMIT_REACHED') {
        toast.error(err.response?.data?.message || 'Workspace limit reached');
      } else {
        toast.error('Failed to create workspace');
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
  });
}

/**
 * Update workspace with optimistic update
 */
export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateWorkspaceInput) => {
      const { workspaceId, ...updates } = input;
      const response = await api.patch<{ data: Workspace }>(`/workspaces/${workspaceId}`, updates);
      return response.data.data;
    },

    onMutate: async (updatedWorkspace) => {
      await queryClient.cancelQueries({ queryKey: workspaceKeys.lists() });

      const previousWorkspaces = queryClient.getQueryData<Workspace[]>(workspaceKeys.lists());

      queryClient.setQueryData<Workspace[]>(
        workspaceKeys.lists(),
        (old) => old ? old.map(ws =>
          ws._id === updatedWorkspace.workspaceId
            ? { ...ws, ...updatedWorkspace, updatedAt: new Date().toISOString() }
            : ws
        ) : []
      );

      return { previousWorkspaces };
    },

    onSuccess: () => {
      toast.success('Workspace updated successfully!');
    },

    onError: (err, variables, context) => {
      if (context?.previousWorkspaces) {
        queryClient.setQueryData(workspaceKeys.lists(), context.previousWorkspaces);
      }
      toast.error('Failed to update workspace');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
  });
}

/**
 * Delete workspace with optimistic update
 */
export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      await api.delete(`/workspaces/${workspaceId}`);
      return workspaceId;
    },

    onMutate: async (workspaceId) => {
      await queryClient.cancelQueries({ queryKey: workspaceKeys.lists() });

      const previousWorkspaces = queryClient.getQueryData<Workspace[]>(workspaceKeys.lists());

      queryClient.setQueryData<Workspace[]>(
        workspaceKeys.lists(),
        (old) => old ? old.filter(ws => ws._id !== workspaceId) : []
      );

      return { previousWorkspaces };
    },

    onSuccess: () => {
      toast.success('Workspace deleted successfully!');
    },

    onError: (err, workspaceId, context) => {
      if (context?.previousWorkspaces) {
        queryClient.setQueryData(workspaceKeys.lists(), context.previousWorkspaces);
      }
      toast.error('Failed to delete workspace');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
  });
}
