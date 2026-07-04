export type HierarchyItemType = 'space' | 'folder' | 'list';

export interface HierarchyList {
  _id: string;
  name: string;
  type: 'list';
  space: string;
  workspace: string;
  folder?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HierarchyFolder {
  _id: string;
  name: string;
  type: 'folder';
  space: string;
  lists: HierarchyList[];
  color?: string;
  icon?: string;
  folderPermissionLevel?: string | null;
  githubRepoName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface HierarchySpace {
  _id: string;
  name: string;
  type: 'space';
  workspace: string;
  folders: HierarchyFolder[];
  lists: HierarchyList[]; // Changed from listsWithoutFolder to match backend
  color?: string;
  icon?: string;
  spacePermissionLevel?: string | null;
  githubRepoName?: string | null;
  members?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export type HierarchyItem = HierarchySpace | HierarchyFolder | HierarchyList;

export interface WorkspaceHierarchy {
  workspaceId: string;
  workspaceName: string;
  logo?: string;
}
