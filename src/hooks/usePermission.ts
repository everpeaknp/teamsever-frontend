/**
 * Permission Hook
 * Frontend permission checking aligned with backend RBAC system
 * Supports hierarchical permission overrides: List > Folder > Space > Workspace
 */

import { useAuthStore } from '@/store/useAuthStore';
import { useMemo } from 'react';

/**
 * Space Permission Levels (for overrides)
 */
export type SpacePermissionLevel = "FULL" | "EDIT" | "COMMENT" | "VIEW";

/**
 * Folder Permission Levels (for overrides)
 */
export type FolderPermissionLevel = "FULL" | "EDIT" | "COMMENT" | "VIEW";

/**
 * List Permission Levels (for overrides)
 */
export type ListPermissionLevel = "FULL" | "EDIT" | "COMMENT" | "VIEW";

/**
 * All possible permission actions (must match backend)
 */
export type PermissionAction =
  // Workspace actions
  | "DELETE_WORKSPACE"
  | "UPDATE_WORKSPACE"
  | "INVITE_MEMBER"
  | "REMOVE_MEMBER"
  | "CHANGE_MEMBER_ROLE"
  | "VIEW_WORKSPACE"
  | "LEAVE_WORKSPACE"
  
  // Space actions
  | "CREATE_SPACE"
  | "DELETE_SPACE"
  | "UPDATE_SPACE"
  | "VIEW_SPACE"
  | "ADD_SPACE_MEMBER"
  | "REMOVE_SPACE_MEMBER"
  | "MANAGE_SPACE_PERMISSIONS"
  
  // Folder actions
  | "CREATE_FOLDER"
  | "DELETE_FOLDER"
  | "UPDATE_FOLDER"
  | "VIEW_FOLDER"
  
  // List actions
  | "CREATE_LIST"
  | "DELETE_LIST"
  | "UPDATE_LIST"
  | "VIEW_LIST"
  
  // Task actions
  | "CREATE_TASK"
  | "DELETE_TASK"
  | "EDIT_TASK"
  | "VIEW_TASK"
  | "ASSIGN_TASK"
  | "CHANGE_STATUS"
  | "COMMENT_TASK"
  
  // Settings and analytics
  | "MANAGE_SETTINGS"
  | "VIEW_ANALYTICS"
  | "VIEW_ACTIVITY_LOG";

/**
 * Space Permission Level Actions Matrix
 */
const SPACE_PERMISSION_ACTIONS: Record<SpacePermissionLevel, PermissionAction[]> = {
  FULL: [
    "UPDATE_SPACE",
    "VIEW_SPACE",
    "CREATE_FOLDER",
    "DELETE_FOLDER",
    "UPDATE_FOLDER",
    "VIEW_FOLDER",
    "CREATE_LIST",
    "DELETE_LIST",
    "UPDATE_LIST",
    "VIEW_LIST",
    "CREATE_TASK",
    "DELETE_TASK",
    "EDIT_TASK",
    "VIEW_TASK",
    "ASSIGN_TASK",
    "CHANGE_STATUS",
    "COMMENT_TASK",
    "VIEW_ACTIVITY_LOG",
  ],
  EDIT: [
    "VIEW_SPACE",
    "VIEW_FOLDER",
    "VIEW_LIST",
    "CREATE_TASK",
    "EDIT_TASK",
    "VIEW_TASK",
    "CHANGE_STATUS",
    "COMMENT_TASK",
    "VIEW_ACTIVITY_LOG",
  ],
  COMMENT: [
    "VIEW_SPACE",
    "VIEW_FOLDER",
    "VIEW_LIST",
    "VIEW_TASK",
    "COMMENT_TASK",
  ],
  VIEW: [
    "VIEW_SPACE",
    "VIEW_FOLDER",
    "VIEW_LIST",
    "VIEW_TASK",
  ],
};

/**
 * Folder Permission Level Actions Matrix
 */
const FOLDER_PERMISSION_ACTIONS: Record<FolderPermissionLevel, PermissionAction[]> = {
  FULL: [
    "UPDATE_FOLDER",
    "VIEW_FOLDER",
    "CREATE_LIST",
    "DELETE_LIST",
    "UPDATE_LIST",
    "VIEW_LIST",
    "CREATE_TASK",
    "DELETE_TASK",
    "EDIT_TASK",
    "VIEW_TASK",
    "ASSIGN_TASK",
    "CHANGE_STATUS",
    "COMMENT_TASK",
    "VIEW_ACTIVITY_LOG",
  ],
  EDIT: [
    "VIEW_FOLDER",
    "VIEW_LIST",
    "CREATE_TASK",
    "EDIT_TASK",
    "VIEW_TASK",
    "CHANGE_STATUS",
    "COMMENT_TASK",
    "VIEW_ACTIVITY_LOG",
  ],
  COMMENT: [
    "VIEW_FOLDER",
    "VIEW_LIST",
    "VIEW_TASK",
    "COMMENT_TASK",
  ],
  VIEW: [
    "VIEW_FOLDER",
    "VIEW_LIST",
    "VIEW_TASK",
  ],
};

/**
 * List Permission Level Actions Matrix
 */
const LIST_PERMISSION_ACTIONS: Record<ListPermissionLevel, PermissionAction[]> = {
  FULL: [
    "UPDATE_LIST",
    "VIEW_LIST",
    "CREATE_TASK",
    "DELETE_TASK",
    "EDIT_TASK",
    "VIEW_TASK",
    "ASSIGN_TASK",
    "CHANGE_STATUS",
    "COMMENT_TASK",
    "VIEW_ACTIVITY_LOG",
  ],
  EDIT: [
    "VIEW_LIST",
    "CREATE_TASK",
    "EDIT_TASK",
    "VIEW_TASK",
    "CHANGE_STATUS",
    "COMMENT_TASK",
    "VIEW_ACTIVITY_LOG",
  ],
  COMMENT: [
    "VIEW_LIST",
    "VIEW_TASK",
    "COMMENT_TASK",
  ],
  VIEW: [
    "VIEW_LIST",
    "VIEW_TASK",
  ],
};

/**
 * Permission matrix matching backend
 */
const ROLE_PERMISSIONS: Record<string, PermissionAction[]> = {
  OWNER: [
    // Workspace
    "DELETE_WORKSPACE",
    "UPDATE_WORKSPACE",
    "INVITE_MEMBER",
    "REMOVE_MEMBER",
    "CHANGE_MEMBER_ROLE",
    "VIEW_WORKSPACE",
    "LEAVE_WORKSPACE",
    
    // Space
    "CREATE_SPACE",
    "DELETE_SPACE",
    "UPDATE_SPACE",
    "VIEW_SPACE",
    "ADD_SPACE_MEMBER",
    "REMOVE_SPACE_MEMBER",
    "MANAGE_SPACE_PERMISSIONS",
    
    // Folder
    "CREATE_FOLDER",
    "DELETE_FOLDER",
    "UPDATE_FOLDER",
    "VIEW_FOLDER",
    
    // List
    "CREATE_LIST",
    "DELETE_LIST",
    "UPDATE_LIST",
    "VIEW_LIST",
    
    // Task
    "CREATE_TASK",
    "DELETE_TASK",
    "EDIT_TASK",
    "VIEW_TASK",
    "ASSIGN_TASK",
    "CHANGE_STATUS",
    "COMMENT_TASK",
    
    // Settings
    "MANAGE_SETTINGS",
    "VIEW_ANALYTICS",
    "VIEW_ACTIVITY_LOG",
  ],

  ADMIN: [
    // Workspace
    "INVITE_MEMBER",
    "REMOVE_MEMBER",
    "VIEW_WORKSPACE",
    "LEAVE_WORKSPACE",
    
    // Space
    "CREATE_SPACE",
    "DELETE_SPACE",
    "UPDATE_SPACE",
    "VIEW_SPACE",
    "ADD_SPACE_MEMBER",
    "REMOVE_SPACE_MEMBER",
    "MANAGE_SPACE_PERMISSIONS",
    
    // Folder
    "CREATE_FOLDER",
    "DELETE_FOLDER",
    "UPDATE_FOLDER",
    "VIEW_FOLDER",
    
    // List
    "CREATE_LIST",
    "DELETE_LIST",
    "UPDATE_LIST",
    "VIEW_LIST",
    
    // Task
    "CREATE_TASK",
    "DELETE_TASK",
    "EDIT_TASK",
    "VIEW_TASK",
    "ASSIGN_TASK",
    "CHANGE_STATUS",
    "COMMENT_TASK",
    
    // Settings
    "VIEW_ANALYTICS",
    "VIEW_ACTIVITY_LOG",
  ],

  MEMBER: [
    // Workspace
    "VIEW_WORKSPACE",
    "LEAVE_WORKSPACE",
    
    // Space
    // Space - Members can only view spaces (must be added to space for more access)
    "VIEW_SPACE",
    
    // Folder - No access unless added to space
    "VIEW_FOLDER",
    
    // List - No access unless added to space
    "VIEW_LIST",
    
    // Task - No access unless added to space
    "VIEW_TASK",
    "COMMENT_TASK",
    
    // Settings
    "VIEW_ACTIVITY_LOG",
  ],

  GUEST: [
    // Workspace
    "VIEW_WORKSPACE",
    
    // Space
    "VIEW_SPACE",
    
    // Folder
    "VIEW_FOLDER",
    
    // List
    "VIEW_LIST",
    
    // Task
    "VIEW_TASK",
    "COMMENT_TASK",
  ],
};

/**
 * Permission hook for checking user permissions
 * Supports hierarchical permission overrides: List > Folder > Space > Workspace
 * 
 * @param spacePermissionLevel - Optional space permission level override
 * @param folderPermissionLevel - Optional folder permission level override
 * @param listPermissionLevel - Optional list permission level override
 * @returns Object with permission checking methods
 */
export function usePermission(
  spacePermissionLevel?: SpacePermissionLevel | null,
  folderPermissionLevel?: FolderPermissionLevel | null,
  listPermissionLevel?: ListPermissionLevel | null
) {
  const { currentWorkspaceRole, userId } = useAuthStore();

  /**
   * Check if user has permission to perform an action
   * 
   * Resolution Order:
   * 1. If user is OWNER → return true (bypass all checks)
   * 2. If listPermissionLevel provided → use list override (highest priority)
   * 3. If folderPermissionLevel provided → use folder override
   * 4. If spacePermissionLevel provided → use space override
   * 5. Otherwise → use workspace role
   * 
   * @param action - The permission action to check
   * @param context - Optional context (e.g., task assignee ID)
   * @returns boolean
   */
  const can = useMemo(() => {
    return (action: PermissionAction, context?: { assigneeId?: string }): boolean => {
      // Step 1: Owner bypass
      if (currentWorkspaceRole?.toUpperCase() === "OWNER") {
        return true;
      }

      // Step 2: Check list permission override (highest priority)
      if (listPermissionLevel) {
        const hasListPermission = LIST_PERMISSION_ACTIONS[listPermissionLevel]?.includes(action);
        
        if (!hasListPermission) {
          return false;
        }

        // Apply task assignee check even with list override
        if (action === "EDIT_TASK" || action === "CHANGE_STATUS") {
          if (context?.assigneeId) {
            return userId === context.assigneeId;
          }
        }

        return true;
      }

      // Step 3: Check folder permission override (second priority)
      if (folderPermissionLevel) {
        const hasFolderPermission = FOLDER_PERMISSION_ACTIONS[folderPermissionLevel]?.includes(action);
        
        if (!hasFolderPermission) {
          return false;
        }

        // Apply task assignee check even with folder override
        if (action === "EDIT_TASK" || action === "CHANGE_STATUS") {
          if (context?.assigneeId) {
            return userId === context.assigneeId;
          }
        }

        return true;
      }

      // Step 4: Check space permission override (third priority)
      if (spacePermissionLevel) {
        const hasSpacePermission = SPACE_PERMISSION_ACTIONS[spacePermissionLevel]?.includes(action);
        
        if (!hasSpacePermission) {
          return false;
        }

        // Apply task assignee check even with space override
        if (action === "EDIT_TASK" || action === "CHANGE_STATUS") {
          if (context?.assigneeId) {
            return userId === context.assigneeId;
          }
        }

        return true;
      }

      // Step 5: Use workspace role (fallback)
      if (!currentWorkspaceRole) {
        return false;
      }

      const roleUpper = currentWorkspaceRole.toUpperCase();
      const permissions = ROLE_PERMISSIONS[roleUpper];

      if (!permissions) {
        return false;
      }

      const hasPermission = permissions.includes(action);

      if (!hasPermission) {
        return false;
      }

      // Apply task assignee check
      if (action === "EDIT_TASK" || action === "CHANGE_STATUS") {
        if (roleUpper === "ADMIN" || roleUpper === "OWNER") {
          return true;
        }

        if (roleUpper === "MEMBER" && context?.assigneeId) {
          return userId === context.assigneeId;
        }
      }

      return hasPermission;
    };
  }, [currentWorkspaceRole, userId, spacePermissionLevel, folderPermissionLevel, listPermissionLevel]);

  /**
   * Check if user is owner
   */
  const isOwner = useMemo(() => {
    return currentWorkspaceRole?.toUpperCase() === "OWNER";
  }, [currentWorkspaceRole]);

  /**
   * Check if user is admin or owner
   */
  const isAdmin = useMemo(() => {
    const role = currentWorkspaceRole?.toUpperCase();
    return role === "ADMIN" || role === "OWNER";
  }, [currentWorkspaceRole]);

  /**
   * Check if user is member or higher
   */
  const isMember = useMemo(() => {
    const role = currentWorkspaceRole?.toUpperCase();
    return role === "MEMBER" || role === "ADMIN" || role === "OWNER";
  }, [currentWorkspaceRole]);

  /**
   * Check if user is guest
   */
  const isGuest = useMemo(() => {
    return currentWorkspaceRole?.toUpperCase() === "GUEST";
  }, [currentWorkspaceRole]);

  return {
    can,
    isOwner,
    isAdmin,
    isMember,
    isGuest,
    currentRole: currentWorkspaceRole,
    spacePermissionLevel,
    folderPermissionLevel,
    listPermissionLevel,
  };
}
