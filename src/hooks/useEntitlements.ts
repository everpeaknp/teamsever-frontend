import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/axios';
import { UsageResponse, EntitlementCheckResponse } from '@/types/pro-features';

interface UseEntitlementsReturn {
  usage: UsageResponse['usage'] | null;
  limits: UsageResponse['limits'] | null;
  loading: boolean;
  error: string | null;
  checkEntitlement: (action: string, context?: any) => Promise<EntitlementCheckResponse>;
  canCreateTable: () => Promise<boolean>;
  canAddRow: () => Promise<boolean>;
  canAddColumn: (tableId: string) => Promise<boolean>;
  canUseCustomRoles: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for managing plan entitlements and usage limits
 * Provides methods to check feature access and usage limits
 * 
 * @returns Object containing usage data, limits, and entitlement check functions
 */
export const useEntitlements = (): UseEntitlementsReturn => {
  const [usage, setUsage] = useState<UsageResponse['usage'] | null>(null);
  const [limits, setLimits] = useState<UsageResponse['limits'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load aggregated usage and limits across all owned workspaces
   */
  const loadUsageAndLimits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<UsageResponse>('/entitlements/usage');
      setUsage(response.data.usage);
      setLimits(response.data.limits);
    } catch (err: any) {
      console.error('Failed to load usage and limits:', err);
      setError(err.response?.data?.message || 'Failed to load entitlements');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if a specific action is allowed based on plan entitlements
   * 
   * @param action - The action to check (e.g., 'useCustomRoles', 'createTable', 'addRow')
   * @param context - Optional context data for the check
   * @returns Entitlement check response with allowed status and reason
   */
  const checkEntitlement = useCallback(async (
    action: string,
    context?: any
  ): Promise<EntitlementCheckResponse> => {
    try {
      const response = await api.get<EntitlementCheckResponse>('/entitlements/check', {
        params: { action, ...context }
      });
      return response.data;
    } catch (err: any) {
      console.error('Failed to check entitlement:', err);
      return {
        success: false,
        allowed: false,
        reason: err.response?.data?.message || 'Failed to check entitlement'
      };
    }
  }, []);

  /**
   * Check if the user can create a new table
   * 
   * @returns True if table creation is allowed, false otherwise
   */
  const canCreateTable = useCallback(async (): Promise<boolean> => {
    const result = await checkEntitlement('createTable');
    return result.allowed;
  }, [checkEntitlement]);

  /**
   * Check if the user can add a new row
   * 
   * @returns True if row addition is allowed, false otherwise
   */
  const canAddRow = useCallback(async (): Promise<boolean> => {
    const result = await checkEntitlement('addRow');
    return result.allowed;
  }, [checkEntitlement]);

  /**
   * Check if the user can add a new column to a table
   * 
   * @param tableId - The ID of the table to check
   * @returns True if column addition is allowed, false otherwise
   */
  const canAddColumn = useCallback(async (tableId: string): Promise<boolean> => {
    const result = await checkEntitlement('addColumn', { tableId });
    return result.allowed;
  }, [checkEntitlement]);

  /**
   * Check if the user can use custom roles feature
   * 
   * @returns True if custom roles are allowed, false otherwise
   */
  const canUseCustomRoles = useCallback(async (): Promise<boolean> => {
    const result = await checkEntitlement('useCustomRoles');
    return result.allowed;
  }, [checkEntitlement]);

  /**
   * Refresh usage and limits data (invalidate cache)
   */
  const refresh = useCallback(async () => {
    await loadUsageAndLimits();
  }, [loadUsageAndLimits]);

  // Load usage and limits on mount
  useEffect(() => {
    loadUsageAndLimits();
  }, [loadUsageAndLimits]);

  return {
    usage,
    limits,
    loading,
    error,
    checkEntitlement,
    canCreateTable,
    canAddRow,
    canAddColumn,
    canUseCustomRoles,
    refresh
  };
};
