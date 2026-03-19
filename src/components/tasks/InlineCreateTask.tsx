'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { Task } from '@/types';

interface InlineCreateTaskProps {
  status: string;
  listId: string;
  spaceId: string;
  workspaceId: string;
  onTaskCreated?: (task: Task) => void;
  onOptimisticAdd?: (tempTask: Partial<Task>) => void;
  className?: string;
}

export default function InlineCreateTask({
  status,
  listId,
  spaceId,
  workspaceId,
  onTaskCreated,
  onOptimisticAdd,
  className = '',
}: InlineCreateTaskProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when it appears
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCancel = () => {
    setTitle('');
    setIsCreating(false);
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSubmitting) return;

    setIsSubmitting(true);

    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempTask: Partial<Task> = {
      _id: tempId,
      title: trimmedTitle,
      status: status as any,
      priority: 'medium',
      list: listId,
      space: spaceId,
      workspace: workspaceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistic UI update
    if (onOptimisticAdd) {
      onOptimisticAdd(tempTask);
    }

    try {
      const response = await api.post('/tasks', {
        title: trimmedTitle,
        status,
        list: listId,
        space: spaceId,
        workspace: workspaceId,
        priority: 'medium',
      });

      // Notify parent with real task data
      if (onTaskCreated) {
        onTaskCreated(response.data.data);
      }

      // Reset form
      setTitle('');
      setIsCreating(false);
    } catch (error: any) {
      console.error('Failed to create task:', error);
      
      // Check for task limit error
      if (error.response?.data?.code === 'TASK_LIMIT_REACHED') {
        alert(error.response?.data?.message || 'Task limit reached. Please upgrade your plan to create more tasks.');
      } else {
        alert(error.response?.data?.message || 'Failed to create task. Please try again.');
      }
      // TODO: Remove optimistic task on error
      // You might want to pass an onError callback to handle this
    } finally {
      setIsSubmitting(false);
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
        className={`flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors w-full text-left ${className}`}
      >
        <Plus className="w-4 h-4" />
        <span>New Task</span>
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200 ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Only cancel if not submitting and no value
          if (!isSubmitting && !title.trim()) {
            handleCancel();
          }
        }}
        placeholder="Task name..."
        disabled={isSubmitting}
        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      />
      
      {isSubmitting && (
        <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
      )}
      
      <div className="flex items-center gap-1">
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || isSubmitting}
          className="px-3 py-2 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Press Enter to submit"
        >
          Add
        </button>
        <button
          onClick={handleCancel}
          disabled={isSubmitting}
          className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Press Escape to cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
