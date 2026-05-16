import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Role hierarchy for permission checking
 */
const ROLE_HIERARCHY = {
  guest: 0,
  qa: 1,
  developer: 2,
  member: 3,
  project_manager: 4,
  operations_manager: 5,
  admin: 6,
  owner: 7,
} as const;

type Role = 'guest' | 'qa' | 'developer' | 'member' | 'project_manager' | 'operations_manager' | 'admin' | 'owner';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  profilePicture?: string;
  jobTitle?: string;
  department?: string;
  bio?: string;
  language?: string;
  timezone?: string;
  twoFactorEnabled?: boolean;
  githubUsername?: string;
  notificationPreferences?: {
    githubCommits?: boolean;
    taskAssigned?: boolean;
    taskStatusChange?: boolean;
    taskUpdates?: boolean;
    messages?: boolean;
    groupChats?: boolean;
    mentions?: boolean;
    comments?: boolean;
    notices?: boolean;
    mutedChannels?: string[];
    mutedUsers?: string[];
  };
}

/**
 * Permission definitions for different actions (DEPRECATED - Use usePermission hook instead)
 * Kept for backward compatibility during migration
 */
const PERMISSIONS = {
  // Workspace permissions
  delete_workspace: ['owner'],
  update_workspace: ['owner', 'admin', 'operations_manager'],
  invite_member: ['owner', 'admin', 'operations_manager'],
  remove_member: ['owner', 'admin', 'operations_manager'],
  change_member_role: ['owner', 'admin', 'operations_manager'],
  
  // Space permissions
  create_space: ['owner', 'admin', 'operations_manager', 'project_manager'],
  delete_space: ['owner', 'admin', 'operations_manager', 'project_manager'],
  update_space: ['owner', 'admin', 'operations_manager', 'project_manager', 'member'],
  
  // List permissions
  create_list: ['owner', 'admin', 'operations_manager', 'project_manager', 'member'],
  delete_list: ['owner', 'admin', 'operations_manager', 'project_manager'],
  update_list: ['owner', 'admin', 'operations_manager', 'project_manager', 'member'],
  
  // Task permissions
  create_task: ['owner', 'admin', 'operations_manager', 'project_manager', 'developer', 'qa', 'member'],
  delete_task: ['owner', 'admin', 'operations_manager', 'project_manager'],
  update_task: ['owner', 'admin', 'operations_manager', 'project_manager', 'developer', 'qa', 'member'],
  assign_task: ['owner', 'admin', 'operations_manager', 'project_manager', 'developer', 'member'],
  
  // View permissions
  view_workspace: ['owner', 'admin', 'operations_manager', 'project_manager', 'developer', 'qa', 'member', 'guest'],
  view_analytics: ['owner', 'admin', 'operations_manager'],
  view_settings: ['owner', 'admin', 'operations_manager'],
  view_activity_log: ['owner', 'admin', 'operations_manager', 'project_manager', 'developer', 'qa'],
  MANAGE_CUSTOM_ROLES: ['owner', 'admin', 'operations_manager'],
} as const;

type Permission = keyof typeof PERMISSIONS;

interface AuthState {
  // User info
  user: User | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  
  // Current workspace context
  currentWorkspaceId: string | null;
  currentWorkspaceRole: Role | null;
  
  // Actions
  setUser: (user: User) => void;
  setWorkspaceContext: (workspaceId: string, role: Role) => void;
  clearWorkspaceContext: () => void;
  clearUser: () => void;
  
  // Permission checks
  can: (permission: Permission) => boolean;
  hasRole: (role: Role) => boolean;
  hasMinRole: (minRole: Role) => boolean;
  isOwner: () => boolean;
  isAdmin: () => boolean;
  isMember: () => boolean;
  isGuest: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      userId: null,
      userName: null,
      userEmail: null,
      currentWorkspaceId: null,
      currentWorkspaceRole: null,

      // Set user info
      setUser: (user: User) => {
        set((state) => {
          const mergedUser = {
            ...(state.user || {}),
            ...user,
          };

          return {
            user: mergedUser,
            userId: mergedUser._id,
            userName: mergedUser.name,
            userEmail: mergedUser.email,
          };
        });
      },

      // Set current workspace context
      setWorkspaceContext: (workspaceId, role) => {
        set({ currentWorkspaceId: workspaceId, currentWorkspaceRole: role });
      },

      // Clear workspace context
      clearWorkspaceContext: () => {
        set({ currentWorkspaceId: null, currentWorkspaceRole: null });
      },

      // Clear all user data
      clearUser: () => {
        set({
          user: null,
          userId: null,
          userName: null,
          userEmail: null,
          currentWorkspaceId: null,
          currentWorkspaceRole: null,
        });
      },

      // Check if user has specific permission
      can: (permission: Permission) => {
        const { currentWorkspaceRole } = get();
        
        if (!currentWorkspaceRole) {
          return false;
        }

        const allowedRoles = PERMISSIONS[permission] as readonly Role[];
        return allowedRoles.includes(currentWorkspaceRole);
      },

      // Check if user has specific role
      hasRole: (role: Role) => {
        const { currentWorkspaceRole } = get();
        return currentWorkspaceRole === role;
      },

      // Check if user has minimum role level
      hasMinRole: (minRole: Role) => {
        const { currentWorkspaceRole } = get();
        
        if (!currentWorkspaceRole) {
          return false;
        }

        const minRoleLevel = ROLE_HIERARCHY[minRole];
        const userRoleLevel = ROLE_HIERARCHY[currentWorkspaceRole];
        
        return userRoleLevel >= minRoleLevel;
      },

      // Convenience methods
      isOwner: () => get().hasRole('owner'),
      isAdmin: () => get().hasMinRole('admin'), // Admin or Owner
      isMember: () => get().hasMinRole('member'), // Member, Admin, or Owner
      isGuest: () => get().hasRole('guest'),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        userId: state.userId,
        userName: state.userName,
        userEmail: state.userEmail,
        currentWorkspaceId: state.currentWorkspaceId,
        currentWorkspaceRole: state.currentWorkspaceRole,
      }),
    }
  )
);

/**
 * Hook to get user permissions for current workspace
 */
export const usePermissions = () => {
  const can = useAuthStore((state) => state.can);
  const hasRole = useAuthStore((state) => state.hasRole);
  const hasMinRole = useAuthStore((state) => state.hasMinRole);
  const isOwner = useAuthStore((state) => state.isOwner);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const isMember = useAuthStore((state) => state.isMember);
  const isGuest = useAuthStore((state) => state.isGuest);
  const currentWorkspaceRole = useAuthStore((state) => state.currentWorkspaceRole);

  return {
    can,
    hasRole,
    hasMinRole,
    isOwner,
    isAdmin,
    isMember,
    isGuest,
    currentWorkspaceRole,
  };
};

/**
 * Hook to get and set workspace context
 */
export const useWorkspaceContext = () => {
  const currentWorkspaceId = useAuthStore((state) => state.currentWorkspaceId);
  const currentWorkspaceRole = useAuthStore((state) => state.currentWorkspaceRole);
  const setWorkspaceContext = useAuthStore((state) => state.setWorkspaceContext);
  const clearWorkspaceContext = useAuthStore((state) => state.clearWorkspaceContext);

  return {
    currentWorkspaceId,
    currentWorkspaceRole,
    setWorkspaceContext,
    clearWorkspaceContext,
  };
};
