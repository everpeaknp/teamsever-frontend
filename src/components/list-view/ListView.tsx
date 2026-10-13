'use client';

import { useState, useMemo } from 'react';
import { Task, GroupedTasks, StatusConfig } from '@/types';
import { Circle, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { ChevronDown, ChevronRight, Calendar, Flag, Plus, X, Check } from 'lucide-react';
import TaskRow from './TaskRow';
import StatusHeader from './StatusHeader';
import InlineTaskAdd from './InlineTaskAdd';
import { groupTasksByStatus } from '@/lib/taskUtils';
import { useTaskSidebarStore } from '@/store/useTaskSidebarStore';

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
  const [mobileAddStatus, setMobileAddStatus] = useState<string | null>(null);
  const [mobileTaskTitle, setMobileTaskTitle] = useState('');
  const [isMobileSubmitting, setIsMobileSubmitting] = useState(false);
  const { openTask } = useTaskSidebarStore();

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

  const handleMobileTaskCreate = async (status: string) => {
    const title = mobileTaskTitle.trim();
    if (!title || isMobileSubmitting) return;
    setIsMobileSubmitting(true);
    try {
      await onTaskCreate(status, title);
      setMobileTaskTitle('');
      setMobileAddStatus(null);
    } finally {
      setIsMobileSubmitting(false);
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
        <div className="bg-purple-50 border-b border-purple-200 px-3 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-2">
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
      <div className="hidden lg:block overflow-x-auto" role="region" aria-label="Task list table" tabIndex={0}>
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

      <div className="lg:hidden p-3 space-y-4">
        {STATUS_CONFIG.map((statusConfig) => {
          const statusTasks = groupedTasks[statusConfig.value] || [];
          const isExpanded = expandedStatuses.has(statusConfig.value);
          const StatusIcon = statusConfig.icon;
          return (
            <section key={statusConfig.value} className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className={`${statusConfig.color} flex min-w-0 items-center gap-2 px-3 py-2`}>
                <button
                  type="button"
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${statusConfig.label}`}
                  aria-expanded={isExpanded}
                  onClick={() => handleToggleStatus(statusConfig.value)}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-md hover:bg-white/50"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <input
                  type="checkbox"
                  aria-label={`Select all ${statusConfig.label} tasks`}
                  checked={isAllSelected(statusConfig.value)}
                  ref={(input) => { if (input) input.indeterminate = isSomeSelected(statusConfig.value); }}
                  onChange={(event) => handleSelectAll(statusConfig.value, event.target.checked)}
                  className="h-5 w-5 shrink-0 accent-purple-600"
                />
                <StatusIcon className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold uppercase tracking-wide">{statusConfig.label}</span>
                <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium">{statusTasks.length}</span>
              </div>
              {isExpanded && (
                <div className="space-y-2 p-2">
                  {statusTasks.map((task) => (
                    <article key={task._id} data-testid={`mobile-task-card-${task._id}`} className="min-w-0 rounded-lg border border-gray-200 p-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${task.title}`}
                          checked={selectedTasks.has(task._id)}
                          onChange={(event) => handleSelectTask(task._id, event.target.checked)}
                          className="mt-1 h-5 w-5 shrink-0 accent-purple-600"
                        />
                        <div className="min-w-0 flex-1">
                          <button type="button" aria-label={`Open task: ${task.title}`} onClick={() => openTask(task._id)} className="block min-h-11 w-full break-words text-left text-sm font-semibold text-gray-900 hover:text-purple-700">
                            {task.title}
                          </button>
                          {task.description && <p className="break-words text-xs leading-5 text-gray-500">{task.description}</p>}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-xs">
                        <div className="flex min-w-0 items-center gap-1.5 text-gray-600"><span className="shrink-0">Assignee</span><span className="truncate font-medium">{typeof task.assignee === 'object' && task.assignee ? task.assignee.name : task.assignee ? 'Assigned' : 'Unassigned'}</span></div>
                        <div className="flex min-w-0 items-center gap-1.5 text-gray-600"><Calendar className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span></div>
                        <div className="flex items-center gap-1.5 capitalize text-gray-600"><Flag className="h-3.5 w-3.5 shrink-0" />{task.priority}</div>
                      </div>
                    </article>
                  ))}
                  {mobileAddStatus === statusConfig.value ? (
                    <form onSubmit={(event) => { event.preventDefault(); void handleMobileTaskCreate(statusConfig.value); }} className="space-y-2 rounded-lg bg-purple-50 p-3">
                      <label className="sr-only" htmlFor={`mobile-add-task-${statusConfig.value}`}>New {statusConfig.label} task name</label>
                      <input id={`mobile-add-task-${statusConfig.value}`} autoFocus value={mobileTaskTitle} onChange={(event) => setMobileTaskTitle(event.target.value)} placeholder="Task name…" disabled={isMobileSubmitting} className="h-11 w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 text-sm" />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setMobileAddStatus(null); setMobileTaskTitle(''); }} disabled={isMobileSubmitting} className="inline-flex h-11 items-center gap-1 rounded-md border bg-white px-3 text-sm"><X className="h-4 w-4" />Cancel</button>
                        <button type="submit" disabled={!mobileTaskTitle.trim() || isMobileSubmitting} className="inline-flex h-11 items-center gap-1 rounded-md bg-purple-600 px-3 text-sm text-white disabled:opacity-50"><Check className="h-4 w-4" />Add task</button>
                      </div>
                    </form>
                  ) : (
                    <button type="button" onClick={() => setMobileAddStatus(statusConfig.value)} className="flex h-11 w-full items-center gap-2 rounded-md px-2 text-sm text-gray-600 hover:bg-gray-50"><Plus className="h-4 w-4" />Add task</button>
                  )}
                </div>
              )}
            </section>
          );
        })}
        {tasks.length === 0 && (
          <div className="py-8 text-center">
            <Circle className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <h3 className="mb-1 text-base font-medium text-gray-900">No tasks yet</h3>
            <p className="text-sm text-gray-600">Create your first task to get started</p>
          </div>
        )}
      </div>

      {/* Empty State */}
      {tasks.length === 0 && (
        <div className="hidden text-center py-12 lg:block">
          <Circle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
          <p className="text-gray-600">Create your first task to get started</p>
        </div>
      )}
    </div>
  );
}
