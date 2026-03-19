'use client';

import { Task, StatusConfig } from '@/types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import TaskRow from './TaskRow';
import InlineTaskAdd from './InlineTaskAdd';

interface StatusHeaderProps {
  statusConfig: StatusConfig;
  taskCount: number;
  isExpanded: boolean;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  onToggle: () => void;
  onSelectAll: (selected: boolean) => void;
  tasks: Task[];
  selectedTasks: Set<string>;
  onSelectTask: (taskId: string, selected: boolean) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskCreate: (status: string, title: string) => Promise<void>;
}

export default function StatusHeader({
  statusConfig,
  taskCount,
  isExpanded,
  isAllSelected,
  isSomeSelected,
  onToggle,
  onSelectAll,
  tasks,
  selectedTasks,
  onSelectTask,
  onTaskUpdate,
  onTaskCreate,
}: StatusHeaderProps) {
  const Icon = statusConfig.icon;

  return (
    <>
      {/* Status Header Row */}
      <tr className={`border-b-2 ${statusConfig.color.replace('bg-', 'border-').split(' ')[0]}`}>
        <td colSpan={6} className={`${statusConfig.color} px-4 py-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Expand/Collapse Button */}
              <button
                onClick={onToggle}
                className="p-1 hover:bg-white/50 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Select All Checkbox */}
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = isSomeSelected;
                  }
                }}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />

              {/* Status Icon and Label */}
              <Icon className="w-5 h-5" />
              <span className="font-semibold text-sm uppercase tracking-wide">
                {statusConfig.label}
              </span>

              {/* Task Count Badge */}
              <Badge variant="secondary" className="ml-2">
                {taskCount}
              </Badge>
            </div>
          </div>
        </td>
      </tr>

      {/* Task Rows */}
      {isExpanded && (
        <>
          {tasks.map((task) => (
            <TaskRow
              key={task._id}
              task={task}
              isSelected={selectedTasks.has(task._id)}
              onSelect={(selected) => onSelectTask(task._id, selected)}
              onUpdate={(updates) => onTaskUpdate(task._id, updates)}
            />
          ))}

          {/* Inline Add Task Row */}
          <InlineTaskAdd
            status={statusConfig.value}
            onAdd={(title) => onTaskCreate(statusConfig.value, title)}
          />
        </>
      )}
    </>
  );
}
