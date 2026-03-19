'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/types';

interface BoardColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  color: string;
  onAddTask?: () => void;
  handleDragStart: (e: React.DragEvent, task: Task) => void;
  canDrag: boolean;
  spaceMembers: any[];
}

const statusColors: Record<string, string> = {
  todo: 'border-slate-400',
  'in-progress': 'border-blue-500',
  done: 'border-green-500',
};

export function BoardColumn({ id, title, tasks, color, onAddTask, handleDragStart, canDrag, spaceMembers }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const taskIds = tasks.map((task) => task._id);

  return (
    <div className="flex flex-col w-80 flex-shrink-0">
      {/* Column Header */}
      <div
        className={cn(
          'flex items-center justify-between p-3 bg-slate-50 rounded-t-lg border-t-4',
          statusColors[id] || 'border-slate-400'
        )}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-slate-900 uppercase tracking-wide">
            {title}
          </h3>
          <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-slate-200 text-xs font-medium text-slate-700">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="p-1 hover:bg-slate-200 rounded transition-colors"
          title="Add task"
        >
          <Plus className="h-4 w-4 text-slate-600" />
        </button>
      </div>

      {/* Column Body - Droppable Area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-3 bg-slate-50 rounded-b-lg min-h-[200px] transition-colors',
          isOver && 'bg-slate-100 ring-2 ring-blue-400 ring-inset'
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-slate-400">
              Drop tasks here
            </div>
          ) : (
            tasks.map((task) => <TaskCard key={task._id} task={task} handleDragStart={handleDragStart} canDrag={canDrag} spaceMembers={spaceMembers} />)
          )}
        </SortableContext>
      </div>
    </div>
  );
}
