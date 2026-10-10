import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { QualityCase } from '@/components/quality/CaseEditor';

export type QualityCapabilities = {
  qualityEnabled: boolean;
  canViewQuality: boolean;
  canAuthorCase: boolean;
  canExecuteCase: boolean;
  canManagePlan: boolean;
  canCreateBug: boolean;
  canTriageBug: boolean;
  canVerifyBug: boolean;
  canViewReport: boolean;
  canSignOff: boolean;
};
export type QualityFilters = { page: number; limit: number; search?: string; state?: string; moduleId?: string; suiteId?: string };
export type Paginated<T> = { data: T[]; pagination: { page: number; limit: number; total: number } };
export type QualityOption = { _id: string; name: string };
export type QualityPlan = { _id: string; name: string; description?: string; caseIds: string[]; status: 'draft' | 'active' | 'archived'; updatedAt: string };
export type QualityRun = { _id: string; plan: string; build: string; environment: string; status: 'open' | 'closed'; createdAt: string };
export type QualityExecution = { _id: string; run: string; testCase: string; caseKey: string; revision: number; snapshot: { title: string; preconditions?: string; steps: Array<{ action: string; testData?: string; expectedResult: string }> }; assignedTo?: string; result: 'not_run' | 'pass' | 'fail' | 'blocked' | 'skipped'; reason?: string; stepResults?: Array<{ result: string; actualResult?: string; evidenceIds?: string[] }>; evidenceIds?: string[]; version: number; bugIds?: string[]; updatedAt?: string };
export type QualityReport = { plan: { id: string; name: string }; latestRun: { id: string; build: string; environment: string; status: 'open' | 'closed' } | null; runIds: string[]; counts: { selected: number; pass: number; fail: number; blocked: number; skipped: number; notRun: number }; completion: { numerator: number; denominator: number; percent: number | null }; passRate: { numerator: number; denominator: number; percent: number | null }; gate: { ready: boolean; unresolvedHighBugs: number; blockers: number }; generatedAt: string };
export type QualitySnapshot = { _id: string; plan: string; signedBy: string; signedAt: string; exceptionReason?: string; report: QualityReport };
export type QualityBug = { _id: string; title: string; status: string; priority: string; bugDetails: { severity: string; environment: string }; list: string; updatedAt: string };

const root = (workspaceId: string) => `/workspaces/${workspaceId}/quality`;

export function useQualityCapabilities(workspaceId: string, listId?: string) {
  return useQuery({
    queryKey: ['quality', workspaceId, 'capabilities', listId || 'workspace'],
    enabled: Boolean(workspaceId),
    queryFn: async () => (await api.get(`${root(workspaceId)}/capabilities`, { params: listId ? { listId } : {} })).data.data as QualityCapabilities,
  });
}

export function useQualityCases(workspaceId: string, filters: QualityFilters, enabled = true) {
  return useQuery({
    queryKey: ['quality', workspaceId, 'cases', filters],
    enabled: Boolean(workspaceId) && enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => (await api.get(`${root(workspaceId)}/cases`, { params: filters })).data as Paginated<QualityCase>,
  });
}

export function useQualityBugs(workspaceId: string, filters: { page: number; status?: string; severity?: string; search?: string }, enabled = true) {
  return useQuery({
    queryKey: ['quality', workspaceId, 'bugs', filters],
    enabled: Boolean(workspaceId) && enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => (await api.get(`${root(workspaceId)}/bugs`, { params: { ...filters, limit: 30 } })).data as Paginated<QualityBug>,
  });
}

export function useQualityModules(workspaceId: string, enabled = true) {
  return useQuery({
    queryKey: ['quality', workspaceId, 'modules'], enabled: Boolean(workspaceId) && enabled,
    queryFn: async () => (await api.get(`${root(workspaceId)}/modules`, { params: { limit: 100 } })).data as Paginated<QualityOption>,
  });
}

export function useQualitySuites(workspaceId: string, enabled = true) {
  return useQuery({
    queryKey: ['quality', workspaceId, 'suites'], enabled: Boolean(workspaceId) && enabled,
    queryFn: async () => (await api.get(`${root(workspaceId)}/suites`, { params: { limit: 100 } })).data as Paginated<QualityOption>,
  });
}

export function useQualityPlans(workspaceId: string, page: number, enabled = true) {
  return useQuery({
    queryKey: ['quality', workspaceId, 'plans', page], enabled: Boolean(workspaceId) && enabled, placeholderData: keepPreviousData,
    queryFn: async () => (await api.get(`${root(workspaceId)}/plans`, { params: { page, limit: 30 } })).data as Paginated<QualityPlan>,
  });
}

export function useQualityPlan(workspaceId: string, planId: string, enabled = true) {
  return useQuery({
    queryKey: ['quality', workspaceId, 'plan', planId], enabled: Boolean(workspaceId && planId) && enabled,
    queryFn: async () => (await api.get(`${root(workspaceId)}/plans/${planId}`)).data.data as QualityPlan,
  });
}

export function useQualityRuns(workspaceId: string, page: number, planId?: string, enabled = true) {
  return useQuery({
    queryKey: ['quality', workspaceId, 'runs', page, planId || 'all'], enabled: Boolean(workspaceId) && enabled, placeholderData: keepPreviousData,
    queryFn: async () => (await api.get(`${root(workspaceId)}/runs`, { params: { page, limit: 30, ...(planId && { planId }) } })).data as Paginated<QualityRun>,
  });
}

export function useQualityExecutions(workspaceId: string, runId: string, page: number, enabled = true) {
  return useQuery({
    queryKey: ['quality', workspaceId, 'runs', runId, 'executions', page], enabled: Boolean(workspaceId && runId) && enabled, placeholderData: keepPreviousData,
    queryFn: async () => (await api.get(`${root(workspaceId)}/runs/${runId}/executions`, { params: { page, limit: 30 } })).data as Paginated<QualityExecution> & { run: QualityRun },
  });
}

export function useQualityLiveReport(workspaceId: string, planId: string, enabled = true) {
  return useQuery({
    queryKey: ['quality', workspaceId, 'reports', 'live', planId], enabled: Boolean(workspaceId && planId) && enabled,
    queryFn: async () => (await api.get(`${root(workspaceId)}/reports/live`, { params: { planId } })).data.data as QualityReport,
  });
}

export function useQualitySnapshots(workspaceId: string, planId: string, page: number, enabled = true) {
  return useQuery({
    queryKey: ['quality', workspaceId, 'reports', 'snapshots', planId, page], enabled: Boolean(workspaceId && planId) && enabled, placeholderData: keepPreviousData,
    queryFn: async () => (await api.get(`${root(workspaceId)}/reports/snapshots`, { params: { planId, page, limit: 30 } })).data as Paginated<QualitySnapshot>,
  });
}
