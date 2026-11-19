export interface GanttTask {
  _id: string;
  name: string;
  phase: string;
  assignee: string;
  assigneeId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  duration: number;
  progress: number;
  dependsOn: string[];
  color?: string;
  parentId?: string;
  wbs?: string;
  order?: number;
  status?: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  isMilestone?: boolean;
  isCollapsed?: boolean;
}

export interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  user?: {
    _id: string;
    name: string;
    email: string;
  };
}

export type ZoomLevel = 'days' | 'weeks' | 'months';

export type ColorByMode = 'task' | 'status' | 'assignee';

export interface TaskContextMenu {
  taskId: string;
  x: number;
  y: number;
}
