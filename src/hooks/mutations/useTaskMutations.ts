import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Task, taskKeys } from '../queries/useTasks';
import { toast } from 'sonner';

interface CreateTaskInput {
  title: string;
  description?: string;
  listId: string;
  spaceId: string;
  workspaceId: string;
  status?: string;
  priority?: string;
  assignees?: string[];
  dueDate?: string;
}

interface UpdateTaskInput {
  taskId: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignees?: string[];
  dueDate?: string;
}

/**
 * Create task with optimistic update
 * UI updates instantly, rolls back on error
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const response = await api.post<{ data: Task }>('/tasks', input);
      return response.data.data;
    },
    
    // Optimistic update - runs immediately
    onMutate: async (newTask) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: taskKeys.list({ spaceId: newTask.spaceId, listId: newTask.listId }) 
      });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(
        taskKeys.list({ spaceId: newTask.spaceId, listId: newTask.listId })
      );

      // Optimistically update with temporary task
      const optimisticTask: Task = {
        _id: `temp-${Date.now()}`,
        ...newTask,
        status: newTask.status || 'todo',
        createdBy: 'current-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Task[]>(
        taskKeys.list({ spaceId: newTask.spaceId, listId: newTask.listId }),
        (old) => old ? [...old, optimisticTask] : [optimisticTask]
      );

      return { previousTasks, optimisticTask };
    },

    // On success, replace temp task with real one
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData<Task[]>(
        taskKeys.list({ spaceId: variables.spaceId, listId: variables.listId }),
        (old) => old ? old.map(task => 
          task._id === context?.optimisticTask._id ? data : task
        ) : [data]
      );
      toast.success('Task created successfully');
    },

    // On error, roll back
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          taskKeys.list({ spaceId: variables.spaceId, listId: variables.listId }),
          context.previousTasks
        );
      }
      toast.error('Failed to create task');
    },

    // Always refetch after error or success
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: taskKeys.list({ spaceId: variables.spaceId, listId: variables.listId }) 
      });
    },
  });
}

/**
 * Update task with optimistic update
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTaskInput) => {
      const { taskId, ...updates } = input;
      const response = await api.patch<{ data: Task }>(`/tasks/${taskId}`, updates);
      return response.data.data;
    },

    onMutate: async (updatedTask) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(updatedTask.taskId) });

      // Snapshot previous value
      const previousTask = queryClient.getQueryData<Task>(
        taskKeys.detail(updatedTask.taskId)
      );

      // Optimistically update
      if (previousTask) {
        queryClient.setQueryData<Task>(
          taskKeys.detail(updatedTask.taskId),
          { ...previousTask, ...updatedTask, updatedAt: new Date().toISOString() }
        );
      }

      return { previousTask };
    },

    onSuccess: (data) => {
      queryClient.setQueryData(taskKeys.detail(data._id), data);
      toast.success('Task updated');
    },

    onError: (err, variables, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(
          taskKeys.detail(variables.taskId),
          context.previousTask
        );
      }
      toast.error('Failed to update task');
    },

    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(data._id) });
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      }
    },
  });
}

/**
 * Toggle task status with instant feedback
 * Most common action - needs to feel instant
 */
export function useToggleTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const response = await api.patch<{ data: Task }>(`/tasks/${taskId}`, { status });
      return response.data.data;
    },

    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId) });

      const previousTask = queryClient.getQueryData<Task>(taskKeys.detail(taskId));

      if (previousTask) {
        queryClient.setQueryData<Task>(
          taskKeys.detail(taskId),
          { ...previousTask, status, updatedAt: new Date().toISOString() }
        );
      }

      return { previousTask };
    },

    onError: (err, variables, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(
          taskKeys.detail(variables.taskId),
          context.previousTask
        );
      }
      toast.error('Failed to update status');
    },

    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      }
    },
  });
}

/**
 * Delete task with optimistic update
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`/tasks/${taskId}`);
      return taskId;
    },

    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Remove from all lists
      const queryCache = queryClient.getQueryCache();
      const queries = queryCache.findAll({ queryKey: taskKeys.lists() });

      const previousData: any[] = [];

      queries.forEach((query) => {
        const data = query.state.data as Task[] | undefined;
        if (data) {
          previousData.push({ queryKey: query.queryKey, data });
          queryClient.setQueryData<Task[]>(
            query.queryKey,
            data.filter(task => task._id !== taskId)
          );
        }
      });

      return { previousData };
    },

    onSuccess: () => {
      toast.success('Task deleted');
    },

    onError: (err, taskId, context) => {
      if (context?.previousData) {
        context.previousData.forEach(({ queryKey, data }) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Failed to delete task');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
