import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/axios';
import { IWorkspaceMember, EntitlementCheckResponse } from '@/types/pro-features';
import { toast } from 'sonner';

interface UseCustomRolesReturn {
  members: IWorkspaceMember[];
  canUseCustomRoles: boolean;
  loading: boolean;
  error: string | null;
  updateCustomRole: (memberId: string, customRoleTitle: string | null) => Promise<void>;
  loadMembers: () => Promise<void>;
  checkEntitlement: () => Promise<void>;
}

/**
 * Custom hook for managing custom roles in a workspace
 * Handles member data, entitlement checks, and optimistic updates
 * 
 * @param workspaceId - The ID of the workspace
 * @returns Object containing members, entitlement status, and management functions
 */
export const useCustomRoles = (workspaceId: string): UseCustomRolesReturn => {
  const [members, setMembers] = useState<IWorkspaceMember[]>([]);
  const [canUseCustomRoles, setCanUseCustomRoles] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load workspace members from the API
   */
  const loadMembers = useCallback(async () => {
    if (!workspaceId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/workspaces/${workspaceId}/members`);
      setMembers(response.data.members || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load members';
      console.error('Failed to load members:', {
        workspaceId,
        error: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  /**
   * Check if the current user can use custom roles feature
   */
  const checkEntitlement = useCallback(async () => {
    try {
      const response = await api.get<EntitlementCheckResponse>('/entitlements/check', {
        params: { action: 'useCustomRoles' }
      });
      setCanUseCustomRoles(response.data.allowed);
    } catch (err: any) {
      console.error('Failed to check entitlement:', {
        error: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setCanUseCustomRoles(false);
    }
  }, []);

  /**
   * Update a member's custom role title with optimistic update
   * Reverts on failure
   * 
   * @param memberId - The ID of the member to update
   * @param customRoleTitle - The new custom role title (null to remove)
   */
  const updateCustomRole = useCallback(async (
    memberId: string,
    customRoleTitle: string | null
  ) => {
    // Store previous state for rollback
    const previousMembers = [...members];

    // Optimistic update
    setMembers(prev => prev.map(m => {
      if (typeof m.user === 'object' && m.user._id === memberId) {
        return { ...m, customRoleTitle };
      } else if (typeof m.user === 'string' && m.user === memberId) {
        return { ...m, customRoleTitle };
      }
      return m;
    }));

    try {
      await api.patch(
        `/workspaces/${workspaceId}/members/${memberId}/custom-role`,
        { customRoleTitle }
      );
      toast.success(customRoleTitle ? 'Custom role assigned' : 'Custom role removed');
    } catch (err: any) {
      // Revert on error
      const errorMessage = err.response?.data?.message || 'Failed to update custom role';
      console.error('Failed to update custom role:', {
        workspaceId,
        memberId,
        customRoleTitle,
        error: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setMembers(previousMembers);
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [workspaceId, members]);

  // Load members and check entitlement on mount
  useEffect(() => {
    if (workspaceId) {
      loadMembers();
      checkEntitlement();
    }
  }, [workspaceId, loadMembers, checkEntitlement]);

  return {
    members,
    canUseCustomRoles,
    loading,
    error,
    updateCustomRole,
    loadMembers,
    checkEntitlement
  };
};
