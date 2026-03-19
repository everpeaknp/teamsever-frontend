import { ReactNode } from 'react';

// Core Types
export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Workspace {
  _id: string;
  name: string;
  owner: string | User;
  members: Array<{
    user: string | User;
    role: 'owner' | 'admin' | 'member';
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Space {
  _id: string;
  name: string;
  workspace: string | Workspace;
  owner: string | User;
  members: Array<{
    user: string | User;
    role: 'admin' | 'member';
  }>;
  status?: 'active' | 'inactive';
  description?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  _id: string;
  name: string;
  space: string | Space;
  workspace: string | Workspace;
  order: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
  completedCount?: number;
  members?: string[];
  folderId?: string | null;
}

export interface Task {
  name: ReactNode;
  _id: string;
  title: string;
  description?: string;
  status: 'todo' | 'inprogress' | 'review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  list: string | List;
  space: string | Space;
  workspace: string | Workspace;
  assignee?: string | User;
  assigneeId?: string | null;
  dueDate?: string;
  deadline?: string;
  completedAt?: string;
  completedBy?: string | User;
  tags?: string[];
  order: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// Socket Event Types
export interface SpaceEventPayload {
  type: 'list_created' | 'list_updated' | 'list_deleted' | 'task_created' | 'task_updated' | 'task_deleted';
  data: any;
  spaceId: string;
}

export interface WorkspaceEventPayload {
  type: 'space_created' | 'space_updated' | 'space_deleted';
  data: any;
  workspaceId: string;
}

// Grouped Tasks Type
export interface GroupedTasks {
  [status: string]: Task[];
}

// Status Configuration
export interface StatusConfig {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}
