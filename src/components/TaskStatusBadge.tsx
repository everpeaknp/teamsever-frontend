'use client';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Circle, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface TaskStatusBadgeProps {
  status: 'todo' | 'inprogress' | 'done' | 'cancelled';
  onStatusChange?: (status: 'todo' | 'inprogress' | 'done' | 'cancelled') => void;
  disabled?: boolean;
  asSelect?: boolean;
}

const statusConfig = {
  todo: {
    label: 'To Do',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
    icon: Circle,
  },
  inprogress: {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    icon: Clock,
  },
  done: {
    label: 'Done',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    icon: XCircle,
  },
};

export function TaskStatusBadge({
  status,
  onStatusChange,
  disabled = false,
  asSelect = false,
}: TaskStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  if (asSelect && onStatusChange) {
    return (
      <Select value={status} onValueChange={onStatusChange} disabled={disabled}>
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue>
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5" />
              <span className="text-sm">{config.label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusConfig).map(([key, value]) => {
            const StatusIcon = value.icon;
            return (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <StatusIcon className="h-3.5 w-3.5" />
                  <span>{value.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Badge className={`${config.color} flex items-center gap-1.5 px-2.5 py-1`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{config.label}</span>
    </Badge>
  );
}
