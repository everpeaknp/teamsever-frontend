import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Role hierarchy for permission checking
 */
const ROLE_HIERARCHY = {
  guest: 0,
  member: 1,
  admin: 2,
  owner: 3,
} as const;

type Role = 'guest' | 'member' | 'admin' | 'owner';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  jobTitle?: string;
  department?: string;
  bio?: string;
  language?: string;
  timezone?: string;
  twoFactorEnabled?: boolean;
}

/**
 * Permission definitions for different actions (DEPRECATED - Use usePermission hook instead)
 * Kept for backward compatibility during migration
 */
const PERMISSIONS = {
  // Workspace permissions
  delete_workspace: ['owner'],
  update_workspace: ['owner', 'admin'],
  invite_member: ['owner', 'admin'],
  remove_member: ['owner', 'admin'],
  change_member_role: ['owner'],
  
  // Space permissions
  create_space: ['owner', 'admin'],
  delete_space: ['owner', 'admin'],
  update_space: ['owner', 'admin', 'member'],
  
  // List permissions
  create_list: ['owner', 'admin', 'member'],
  delete_list: ['owner', 'admin', 'member'],
  update_list: ['owner', 'admin', 'member'],
  
  // Task permissions
  create_task: ['owner', 'admin', 'member'],
  delete_task: ['owner', 'admin', 'member'],
  update_task: ['owner', 'admin', 'member'],
  assign_task: ['owner', 'admin', 'member'],
  
  // View permissions
  view_workspace: ['owner', 'admin', 'member', 'guest'],
  view_analytics: ['owner', 'admin'],
  view_settings: ['owner', 'admin'],
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
        set({ 
          user,
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
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
