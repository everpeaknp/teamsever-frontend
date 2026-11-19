import { GanttTask } from './types';

export function formatDate(dateStr: string): string {
  const parts = dateStr.split('-');
  const date = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function addDays(dateStr: string, days: number): string {
  if (!dateStr || typeof dateStr !== 'string') {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  const date = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
  if (isNaN(date.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function isValidDateString(dateStr: string | undefined | null): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const date = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
  return !isNaN(date.getTime());
}

export function dateDiffInDays(start: string, end: string): number {
  const startParts = start.split('-');
  const endParts = end.split('-');
  const startDate = new Date(Date.UTC(+startParts[0], +startParts[1] - 1, +startParts[2]));
  const endDate = new Date(Date.UTC(+endParts[0], +endParts[1] - 1, +endParts[2]));
  const diff = endDate.getTime() - startDate.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function isWeekend(dateStr: string): boolean {
  const parts = dateStr.split('-');
  const date = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export function getWeekdayLetter(dateStr: string): string {
  const parts = dateStr.split('-');
  const date = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return days[date.getUTCDay()];
}

export function getMonthYear(dateStr: string): string {
  const parts = dateStr.split('-');
  const date = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function calculateWBS(tasks: GanttTask[]): GanttTask[] {
  // Build hierarchy
  const taskMap = new Map<string, GanttTask>();
  tasks.forEach(t => taskMap.set(t._id, t));

  // Group by parent
  const roots: GanttTask[] = [];
  const childrenMap = new Map<string, GanttTask[]>();

  tasks.forEach(task => {
    if (!task.parentId) {
      roots.push(task);
    } else {
      const children = childrenMap.get(task.parentId) || [];
      children.push(task);
      childrenMap.set(task.parentId, children);
    }
  });

  // Sort by order
  roots.sort((a, b) => (a.order || 0) - (b.order || 0));
  childrenMap.forEach(children => children.sort((a, b) => (a.order || 0) - (b.order || 0)));

  // Assign WBS numbers
  const result: GanttTask[] = [];
  let rootIndex = 1;

  function processTask(task: GanttTask, wbs: string) {
    const updated = { ...task, wbs };
    result.push(updated);

    const children = childrenMap.get(task._id) || [];
    children.forEach((child, idx) => {
      processTask(child, `${wbs}.${idx + 1}`);
    });
  }

  roots.forEach(root => {
    processTask(root, `${rootIndex}`);
    rootIndex++;
  });

  return result;
}

export function getTaskChildren(allTasks: GanttTask[], taskId: string): GanttTask[] {
  return allTasks.filter(t => t.parentId === taskId);
}

export function getTaskDepth(task: GanttTask, allTasks: GanttTask[]): number {
  let depth = 0;
  let current = task;
  while (current.parentId) {
    depth++;
    const parent = allTasks.find(t => t._id === current.parentId);
    if (!parent) break;
    current = parent;
  }
  return depth;
}

export function calculateSummaryDates(task: GanttTask, allTasks: GanttTask[]): { start: string; end: string } {
  const children = getTaskChildren(allTasks, task._id);
  if (children.length === 0) {
    return { start: task.startDate, end: task.endDate };
  }

  let minStart = task.startDate;
  let maxEnd = task.endDate;

  children.forEach(child => {
    const childDates = calculateSummaryDates(child, allTasks);
    if (childDates.start < minStart) minStart = childDates.start;
    if (childDates.end > maxEnd) maxEnd = childDates.end;
  });

  return { start: minStart, end: maxEnd };
}

export function isSummaryTask(task: GanttTask, allTasks: GanttTask[]): boolean {
  return getTaskChildren(allTasks, task._id).length > 0;
}

export function getVisibleTasks(tasks: GanttTask[]): GanttTask[] {
  const result: GanttTask[] = [];
  const taskMap = new Map(tasks.map(t => [t._id, t]));

  function isVisible(task: GanttTask): boolean {
    if (!task.parentId) return true;
    const parent = taskMap.get(task.parentId);
    if (!parent) return true;
    if (parent.isCollapsed) return false;
    return isVisible(parent);
  }

  tasks.forEach(task => {
    if (isVisible(task)) {
      result.push(task);
    }
  });

  return result;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function filterTasksByStatus(
  tasks: any[],
  filter: "all" | "in-progress" | "completed"
): any[] {
  if (filter === "all") return tasks;

  const matchesFilter = (task: any): boolean => {
    if (filter === "in-progress") {
      return task.status === "in-progress";
    } else if (filter === "completed") {
      return task.status === "completed";
    }
    return false;
  };

  const hasMatchingChild = (taskId: string, visited = new Set<string>()): boolean => {
    if (visited.has(taskId)) return false;
    visited.add(taskId);
    return tasks.some(
      (t) => t.parentId === taskId && (matchesFilter(t) || hasMatchingChild(t._id, visited))
    );
  };

  return tasks.filter((task) => {
    // Include if task matches filter
    if (matchesFilter(task)) return true;
    // Include if task is a parent and has matching children
    if (hasMatchingChild(task._id)) return true;
    return false;
  });
}
