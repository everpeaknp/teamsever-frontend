'use client';

import { Task, User } from '@/types';
import { Flag, MoreVertical, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTaskSidebarStore } from '@/store/useTaskSidebarStore';
import { format, isPast, isToday } from 'date-fns';

interface TaskRowProps {
  task: Task;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onUpdate: (updates: Partial<Task>) => Promise<void>;
}

const PRIORITY_COLORS = {
  low: 'text-gray-400',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

export default function TaskRow({ task, isSelected, onSelect, onUpdate }: TaskRowProps) {
  const { openTask } = useTaskSidebarStore();

  const getDueDateColor = () => {
    if (!task.dueDate) return 'text-gray-500';
    const dueDate = new Date(task.dueDate);
    if (isPast(dueDate) && !isToday(dueDate)) return 'text-red-600 font-semibold';
    if (isToday(dueDate)) return 'text-orange-600 font-semibold';
    return 'text-gray-700';
  };

  const formatDueDate = () => {
    if (!task.dueDate) return 'No due date';
    const dueDate = new Date(task.dueDate);
    if (isToday(dueDate)) return 'Today';
    if (isPast(dueDate)) return `Overdue (${format(dueDate, 'MMM d')})`;
    return format(dueDate, 'MMM d, yyyy');
  };

  const getAssigneeName = () => {
    if (!task.assignee) return null;
    if (typeof task.assignee === 'string') return null;
    return task.assignee.name;
  };

  const getAssigneeInitials = () => {
    const name = getAssigneeName();
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <tr
      className="border-b border-gray-100 hover:bg-gray-50 transition-colors group"
    >
      {/* Checkbox */}
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
        />
      </td>

      {/* Task Name */}
      <td className="px-4 py-3">
        <button
          onClick={() => openTask(task._id)}
          className="text-left hover:text-purple-600 transition-colors font-medium text-gray-900"
        >
          {task.title}
        </button>
        {task.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-1">{task.description}</p>
        )}
      </td>

      {/* Assignee */}
      <td className="px-4 py-3">
        {task.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={(task.assignee as User).avatar} />
              <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                {getAssigneeInitials()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-gray-700">{getAssigneeName()}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Unassigned</span>
        )}
      </td>

      {/* Due Date */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Calendar className={`w-4 h-4 ${getDueDateColor()}`} />
          <span className={`text-sm ${getDueDateColor()}`}>
            {formatDueDate()}
          </span>
        </div>
      </td>

      {/* Priority */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Flag className={`w-4 h-4 ${PRIORITY_COLORS[task.priority]}`} fill="currentColor" />
          <span className="text-sm text-gray-700 capitalize">{task.priority}</span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <button
          className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            // Add dropdown menu here
          }}
        >
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>
      </td>
    </tr>
  );
}
