import { Task, GroupedTasks } from '@/types';

/**
 * Groups tasks by their status
 * Ensures all statuses are present even if they have no tasks
 */
export function groupTasksByStatus(tasks: Task[], allStatuses: string[]): GroupedTasks {
  // Initialize with empty arrays for all statuses
  const grouped: GroupedTasks = {};
  allStatuses.forEach(status => {
    grouped[status] = [];
  });

  // Group tasks by status
  tasks.forEach(task => {
    const status = task.status;
    if (grouped[status]) {
      grouped[status].push(task);
    } else {
      // Handle any status not in the predefined list
      grouped[status] = [task];
    }
  });

  // Sort tasks within each group by order or creation date
  Object.keys(grouped).forEach(status => {
    grouped[status].sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  });

  return grouped;
}

/**
 * Alternative grouping using lodash-style reduce
 */
export function groupTasksByStatusReduce(tasks: Task[], allStatuses: string[]): GroupedTasks {
  // Initialize with empty arrays
  const initial: GroupedTasks = allStatuses.reduce((acc, status) => {
    acc[status] = [];
    return acc;
  }, {} as GroupedTasks);

  // Group tasks
  return tasks.reduce((acc, task) => {
    const status = task.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(task);
    return acc;
  }, initial);
}
