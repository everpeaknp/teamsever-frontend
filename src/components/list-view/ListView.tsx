'use client';

import { useState, useMemo } from 'react';
import { Task, GroupedTasks, StatusConfig } from '@/types';
import { Circle, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import TaskRow from './TaskRow';
import StatusHeader from './StatusHeader';
import InlineTaskAdd from './InlineTaskAdd';
import { groupTasksByStatus } from '@/lib/taskUtils';

// Status configuration with colors and icons
const STATUS_CONFIG: StatusConfig[] = [
  {
    label: 'To Do',
    value: 'to do',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: Circle,
  },
  {
    label: 'In Progress',
    value: 'in progress',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Clock,
  },
  {
    label: 'Done',
    value: 'done',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle2,
  },
  {
    label: 'Blocked',
    value: 'blocked',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: AlertCircle,
  },
];

interface ListViewProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskCreate: (status: string, title: string) => Promise<void>;
  onTaskDelete: (taskIds: string[]) => Promise<void>;
}

export default function ListView({
  tasks,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
}: ListViewProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [expandedStatuses, setExpandedStatuses] = useState<Set<string>>(
    new Set(STATUS_CONFIG.map(s => s.value))
  );

  // Group tasks by status
  const groupedTasks: GroupedTasks = useMemo(() => {
    return groupTasksByStatus(tasks, STATUS_CONFIG.map(s => s.value));
  }, [tasks]);

  const handleSelectTask = (taskId: string, selected: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (selected) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = (status: string, selected: boolean) => {
    const statusTasks = groupedTasks[status] || [];
    const newSelected = new Set(selectedTasks);
    
    statusTasks.forEach(task => {
      if (selected) {
        newSelected.add(task._id);
      } else {
        newSelected.delete(task._id);
      }
    });
    
    setSelectedTasks(newSelected);
  };

  const handleToggleStatus = (status: string) => {
    const newExpanded = new Set(expandedStatuses);
    if (newExpanded.has(status)) {
      newExpanded.delete(status);
    } else {
      newExpanded.add(status);
    }
    setExpandedStatuses(newExpanded);
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;
    
    if (confirm(`Delete ${selectedTasks.size} task(s)?`)) {
      await onTaskDelete(Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  };

  const isAllSelected = (status: string) => {
    const statusTasks = groupedTasks[status] || [];
    if (statusTasks.length === 0) return false;
    return statusTasks.every(task => selectedTasks.has(task._id));
  };

  const isSomeSelected = (status: string) => {
    const statusTasks = groupedTasks[status] || [];
    if (statusTasks.length === 0) return false;
    return statusTasks.some(task => selectedTasks.has(task._id)) && !isAllSelected(status);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Bulk Actions Bar */}
      {selectedTasks.size > 0 && (
        <div className="bg-purple-50 border-b border-purple-200 px-6 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-purple-900">
            {selectedTasks.size} task(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedTasks(new Set())}
              className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Table Container with Sticky Headers */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <tr>
              <th className="w-12 px-4 py-3"></th>
              <th className="min-w-[300px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Task Name
              </th>
              <th className="min-w-[150px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Assignee
              </th>
              <th className="min-w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Due Date
              </th>
              <th className="min-w-[100px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Priority
              </th>
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {STATUS_CONFIG.map((statusConfig) => {
              const statusTasks = groupedTasks[statusConfig.value] || [];
              const isExpanded = expandedStatuses.has(statusConfig.value);

              return (
                <StatusHeader
                  key={statusConfig.value}
                  statusConfig={statusConfig}
                  taskCount={statusTasks.length}
                  isExpanded={isExpanded}
                  isAllSelected={isAllSelected(statusConfig.value)}
                  isSomeSelected={isSomeSelected(statusConfig.value)}
                  onToggle={() => handleToggleStatus(statusConfig.value)}
                  onSelectAll={(selected) => handleSelectAll(statusConfig.value, selected)}
                  tasks={statusTasks}
                  selectedTasks={selectedTasks}
                  onSelectTask={handleSelectTask}
                  onTaskUpdate={onTaskUpdate}
                  onTaskCreate={onTaskCreate}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {tasks.length === 0 && (
        <div className="text-center py-12">
          <Circle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
          <p className="text-gray-600">Create your first task to get started</p>
        </div>
      )}
    </div>
  );
}
