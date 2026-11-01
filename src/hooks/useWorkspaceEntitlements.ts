"use client";

import { useState, useEffect, useCallback } from "react";

export interface WorkspaceEntitlementsData {
  workspaceId: string;
  workspaceName: string;
  plan: {
    id: string;
    name: string;
    isTemplate: boolean;
  } | null;
  storage: {
    maxBytes: number;
    usedBytes: number;
    percentUsed: number;
    isUnlimited: boolean;
  };
  modules: {
    attendance: {
      enabled: boolean;
      mode: 'disabled' | 'software' | 'software_geofence' | 'biometric' | 'both';
      canUseRemoteAttendance: boolean;
      canUseGeoFencing: boolean;
      canUsePhysicalTerminals: boolean;
      maxPhysicalTerminals: number;
      canUseShiftsAndRostering: boolean;
    };
    tracking: {
      canUseFieldTracking: boolean;
      canUseDesktopTracking: boolean;
    };
    hr: {
      enabled: boolean;
      canUseLeaveManagement: boolean;
      canUseOnboardingOffboarding: boolean;
      canUseCompanyDocuments: boolean;
    };
    payroll: {
      enabled: boolean;
      canUseExpenseClaims: boolean;
    };
    projects: {
      canUseGanttChart: boolean;
      canCreateTables: boolean;
      canUseCustomRoles: boolean;
      canUseAdvancedAnalytics: boolean;
    };
    chat: {
      hasGroupChat: boolean;
      canCreatePrivateChannels: boolean;
      chatHistoryDays: number;
    };
    developer: {
      canUseGithubIntegration: boolean;
      maxGithubRepositories: number;
      canUseQaModule: boolean;
      maxQaSuites: number;
      canUseWebhooks: boolean;
    };
    compliance: {
      canExportReports: boolean;
      canViewAuditLogs: boolean;
      analyticsTier: 'basic' | 'full';
    };
  };
}

export function useWorkspaceEntitlements(workspaceId?: string) {
  const [data, setData] = useState<WorkspaceEntitlementsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlements = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = typeof window !== 'undefined' ? localStorage.getItem("authToken") : null;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/entitlements`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to load entitlements (${res.status})`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.message || "Unknown error loading entitlements");
      }
    } catch (err: any) {
      setError(err.message || "Error loading entitlements");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchEntitlements();
  }, [fetchEntitlements]);

  return {
    entitlements: data,
    loading,
    error,
    refresh: fetchEntitlements,
    canAccessAttendance: data ? data.modules.attendance.enabled : false,
    canAccessHr: data ? data.modules.hr.enabled : false,
    canAccessPayroll: data ? data.modules.payroll.enabled : false,
    canAccessGantt: data ? data.modules.projects.canUseGanttChart : false,
    canAccessTerminals: data ? (data.modules.attendance.enabled && data.modules.attendance.canUsePhysicalTerminals) : false,
    canAccessFieldTracking: data ? data.modules.tracking.canUseFieldTracking : false,
    canAccessQuality: data ? data.modules.developer.canUseQaModule : false,
    canAccessGithub: data ? data.modules.developer.canUseGithubIntegration : false,
    canCreatePrivateChannels: data ? data.modules.chat.canCreatePrivateChannels : false
  };
}
