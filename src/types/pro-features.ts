// Pro/Enterprise Features Types

export interface IWorkspaceMember {
  _id: string;
  user: string | {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  role: 'owner' | 'admin' | 'member' | 'guest';
  status?: 'active' | 'inactive';
  customRoleTitle?: string | null;
}

export interface IColumn {
  id: string;
  title: string;
  type: 'text' | 'link' | 'number';
}

export interface IRow {
  id: string;
  data: Map<string, any>;
  colors: Map<string, string>;
  textColors: Map<string, string>;
}

export interface ICustomTable {
  _id: string;
  spaceId: string;
  name: string;
  columns: IColumn[];
  rows: IRow[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlanFeatures {
  maxWorkspaces: number;
  maxMembers: number;
  maxAdmins: number;
  maxSpaces: number;
  maxLists: number;
  maxFolders: number;
  maxTasks: number;
  hasAccessControl: boolean;
  hasGroupChat: boolean;
  messageLimit: number;
  announcementCooldown: number;
  accessControlTier: 'none' | 'basic' | 'pro' | 'advanced';
  canUseCustomRoles: boolean;
  canCreateTables: boolean;
  maxTablesCount: number;
  maxRowsLimit: number;
}

export interface IPlan {
  _id: string;
  name: string;
  price: number;
  description: string;
  parentPlanId?: string;
  features: IPlanFeatures;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntitlementCheckResponse {
  success: boolean;
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
}

export interface UsageResponse {
  success: boolean;
  usage: {
    totalWorkspaces: number;
    totalSpaces: number;
    totalLists: number;
    totalFolders: number;
    totalTasks: number;
    totalTables: number;
    totalRows: number;
  };
  limits: {
    maxWorkspaces: number;
    maxSpaces: number;
    maxLists: number;
    maxFolders: number;
    maxTasks: number;
    maxTablesCount: number;
    maxRowsLimit: number;
    maxColumnsLimit: number;
  };
}
