'use client';

import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';

interface InlineTaskAddProps {
  status: string;
  onAdd: (title: string) => Promise<void>;
}

export default function InlineTaskAdd({ status, onAdd }: InlineTaskAddProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAdd(title.trim());
      setTitle('');
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to add task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isAdding) {
    return (
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td colSpan={6} className="px-4 py-2">
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-purple-600 transition-colors w-full py-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 bg-purple-50">
      <td className="px-4 py-3"></td>
      <td colSpan={4} className="px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Task name..."
            autoFocus
            disabled={isSubmitting}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      </td>
      <td className="px-4 py-3"></td>
    </tr>
  );
}
