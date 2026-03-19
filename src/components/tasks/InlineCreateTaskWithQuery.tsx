'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Loader2, Check, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Task } from '@/types';

interface InlineCreateTaskProps {
  status: string;
  listId: string;
  spaceId: string;
  workspaceId: string;
  queryKey?: string[];
  className?: string;
}

interface CreateTaskPayload {
  title: string;
  status: string;
  list: string;
  space: string;
  workspace: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export default function InlineCreateTaskWithQuery({
  status,
  listId,
  spaceId,
  workspaceId,
  queryKey = ['tasks', listId],
  className = '',
}: InlineCreateTaskProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Auto-focus input when it appears
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  // Mutation for creating task with optimistic updates
  const createTaskMutation = useMutation({
    mutationFn: async (payload: CreateTaskPayload) => {
      const response = await api.post('/tasks', payload);
      return response.data.data as Task;
    },
    onMutate: async (newTask) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(queryKey);

      // Optimistically update to the new value
      const tempTask: Task = {
        _id: `temp-${Date.now()}`,
        name: newTask.title, // Add name property
        title: newTask.title,
        status: newTask.status as any,
        priority: newTask.priority,
        list: newTask.list,
        space: newTask.space,
        workspace: newTask.workspace,
        order: 0,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Task[]>(queryKey, (old = []) => [...old, tempTask]);

      // Return context with previous tasks for rollback
      return { previousTasks };
    },
    onError: (err: any, newTask, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKey, context.previousTasks);
      }
      console.error('Failed to create task:', err);
      
      // Show user-friendly error message
      if (err.response?.data?.code === 'TASK_LIMIT_REACHED') {
        alert(err.response?.data?.message || 'Task limit reached. Please upgrade your plan to create more tasks.');
      } else {
        alert(err.response?.data?.message || 'Failed to create task. Please try again.');
      }
    },
    onSuccess: (data) => {
      // Replace temp task with real task from server
      queryClient.setQueryData<Task[]>(queryKey, (old = []) => {
        return old.map((task) =>
          task._id.startsWith('temp-') ? data : task
        );
      });
    },
    onSettled: () => {
      // Refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleCancel = () => {
    setTitle('');
    setIsCreating(false);
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || createTaskMutation.isPending) return;

    try {
      await createTaskMutation.mutateAsync({
        title: trimmedTitle,
        status,
        list: listId,
        space: spaceId,
        workspace: workspaceId,
        priority: 'medium',
      });

      // Reset form on success
      setTitle('');
      // Keep input open for quick consecutive additions
      // setIsCreating(false);
    } catch (error) {
      // Error is handled in onError callback
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!isCreating) {
    return (
      <button
        onClick={() => setIsCreating(true)}
        className={`group flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all w-full text-left ${className}`}
      >
        <div className="w-5 h-5 flex items-center justify-center rounded border-2 border-gray-300 group-hover:border-purple-500 transition-colors">
          <Plus className="w-3 h-3" />
        </div>
        <span className="font-medium">New Task</span>
        <span className="ml-auto text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
          Click or press N
        </span>
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-300 shadow-sm ${className}`}>
      <div className="flex-1 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            // Don't cancel if clicking on buttons
            const relatedTarget = e.relatedTarget as HTMLElement;
            if (relatedTarget?.tagName === 'BUTTON') return;
            
            // Only cancel if not submitting and no value
            if (!createTaskMutation.isPending && !title.trim()) {
              setTimeout(handleCancel, 100);
            }
          }}
          placeholder="What needs to be done?"
          disabled={createTaskMutation.isPending}
          className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        />
      </div>
      
      <div className="flex items-center gap-1">
        {createTaskMutation.isPending ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
            <span className="text-xs text-gray-600">Creating...</span>
          </div>
        ) : (
          <>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow"
              title="Press Enter to submit"
            >
              <Check className="w-3 h-3" />
              Add
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              title="Press Escape to cancel"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
