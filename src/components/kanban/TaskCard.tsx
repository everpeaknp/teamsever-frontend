'use client';

import { motion } from 'framer-motion';
import { Task } from '@/types';
import { DropIndicator } from './DropIndicator';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import { useTaskSidebarStore } from '@/store/useTaskSidebarStore';
import { Flag } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  canDrag: boolean;
  spaceMembers: any[];
}

// Status color mapping for whole card aesthetics
const getStatusStyles = (status: Task['status']) => {
  switch (status) {
    case 'todo':
      return {
        bg: 'bg-blue-100/60 dark:bg-blue-900/30',
        border: 'border-blue-200 dark:border-blue-800',
        dot: 'bg-blue-500'
      };
    case 'inprogress':
      return {
        bg: 'bg-amber-100/60 dark:bg-amber-900/30',
        border: 'border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500'
      };
    case 'review':
      return {
        bg: 'bg-purple-100/60 dark:bg-purple-900/30',
        border: 'border-purple-200 dark:border-purple-800',
        dot: 'bg-purple-500'
      };
    case 'done':
      return {
        bg: 'bg-green-100/60 dark:bg-green-900/30',
        border: 'border-green-200 dark:border-green-800',
        dot: 'bg-green-500'
      };
    default:
      return {
        bg: 'bg-slate-100/60 dark:bg-slate-900/30',
        border: 'border-slate-200 dark:border-slate-800',
        dot: 'bg-slate-500'
      };
  }
};

const getPriorityColor = (priority: Task['priority']) => {
  switch (priority) {
    case 'urgent': return 'text-red-600 bg-red-100 dark:bg-red-900/30 border-red-200';
    case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 border-orange-200';
    case 'medium': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 border-blue-200';
    case 'low': return 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 border-slate-200';
    default: return 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 border-slate-200';
  }
};

export function TaskCard({ task, handleDragStart, canDrag, spaceMembers }: TaskCardProps) {
  const { openTask } = useTaskSidebarStore();
  const statusStyles = getStatusStyles(task.status);

  return (
    <>
      <DropIndicator beforeId={task._id} column={task.status} />
      <motion.div
        layout
        layoutId={task._id}
        draggable={canDrag}
        onDragStart={(e: React.DragEvent<HTMLDivElement>) => handleDragStart(e, task)}
        onClick={() => openTask(task._id)}
        className={cn(
          "w-full rounded-md border p-2 mb-1.5 relative transition-all duration-200 group shadow-sm hover:shadow-md cursor-pointer active:scale-[0.98]",
          statusStyles.bg,
          statusStyles.border,
          !canDrag && 'opacity-60 cursor-not-allowed'
        )}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-1.5">
            <p className="text-[12px] font-semibold leading-tight text-foreground/90 flex-1 line-clamp-2">
              {task.title}
            </p>
            <UserAvatar 
              user={task.createdBy} 
              className="w-5 h-5 border border-background shadow-sm flex-shrink-0" 
              fallbackClassName="text-[7px]"
            />
          </div>
          
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={cn("px-1 py-0 text-[9px] h-4 font-bold uppercase tracking-tighter", getPriorityColor(task.priority))}>
              <Flag className="w-2 h-2 mr-1 fill-current" />
              {task.priority}
            </Badge>
            <div className={cn("w-1 h-1 rounded-full ml-auto", statusStyles.dot)} />
          </div>
        </div>
      </motion.div>
    </>
  );
}
