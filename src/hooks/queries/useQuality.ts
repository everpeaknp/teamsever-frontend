import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { QualityCase } from '@/components/quality/CaseEditor';
import { useQualityProject } from '@/components/quality/QualityProjectContext';

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
export type QualityProjectSettings = {
  project: { _id: string; name: string; scopeType: 'workspace' | 'folder'; folder?: string | { _id: string; name: string } | null };
  settings: {
    caseTypes: Array<{ key: string; label: string; enabled: boolean }>;
    caseStatuses: Array<{ key: string; label: string; terminal: boolean }>;
    caseTransitions: Record<string, string[]>;
    caseFields: Array<{ key: string; label: string; type: string; required: boolean; enabled: boolean; options: string[] }>;
    run: { environments: string[]; platforms: string[]; requireFailureReason: boolean; requireFailureEvidence: boolean };
    bugHandoff: { defaultListId: string | null; copyRunContext: boolean };
    notifications: { runAssigned: boolean; failureRecorded: boolean; runClosed: boolean };
    inherited?: boolean;
  };
};
export type QualityFilters = { page: number; limit: number; search?: string; state?: string; moduleId?: string; suiteId?: string };
export type Paginated<T> = { data: T[]; pagination: { page: number; limit: number; total: number } };
export type QualityOption = { _id: string; name: string };
export type QualityPlan = { _id: string; name: string; description?: string; caseIds: string[]; cases?: Array<{ _id: string; key: string; title: string; owner?: string; state: string }>; status: 'draft' | 'active' | 'archived'; updatedAt: string };
export type QualityRun = { _id: string; plan: string; build: string; environment: string; platform?: string; status: 'open' | 'closed'; createdAt: string };
export type QualityLinkedBug = { _id: string; title: string; status: string; priority: string; bugDetails?: { severity: string; environment: string }; list?: { _id: string; name: string; space?: { _id: string; name: string } }; assignee?: { _id: string; name: string; email: string }; dueDate?: string };
export type QualityExecution = { _id: string; run: string; testCase: string; caseKey: string; revision: number; snapshot: { title: string; preconditions?: string; steps: Array<{ action: string; testData?: string; expectedResult: string }> }; assignedTo?: string; result: 'not_run' | 'pass' | 'fail' | 'blocked' | 'skipped'; reason?: string; stepResults?: Array<{ result: string; actualResult?: string; evidenceIds?: string[] }>; evidenceIds?: string[]; version: number; bugIds?: string[]; linkedBugs?: QualityLinkedBug[]; updatedAt?: string };
export type QualityReportCase = {
  id: string; key: string; title: string; revision: number | null;
  result: QualityExecution['result']; tester: string | null; assignee: string | null; updatedAt: string | null; reason: string;
  steps: Array<{ number: number; action: string; testData?: string; expectedResult: string; actualResult: string; result: string }>;
  evidence: Array<{ name: string; mimeType: string; size: number }>;
  linkedBugs: Array<{ id: string; title: string; status: string; priority: string; assignee: string | null; verification: { status: 'verified' | 'not_verified'; note?: string; verifiedAt?: string | null; verifiedBy?: string | null } }>;
  hiddenLinkedBugCount?: number;
};
export type QualityReport = { plan: { id: string; name: string; description?: string }; latestRun: { id: string; build: string; environment: string; platform?: string; status: 'open' | 'closed'; startedAt?: string } | null; runIds: string[]; cases?: QualityReportCase[]; counts: { selected: number; pass: number; fail: number; blocked: number; skipped: number; notRun: number }; completion: { numerator: number; denominator: number; percent: number | null }; passRate: { numerator: number; denominator: number; percent: number | null }; gate: { ready: boolean; unresolvedHighBugs: number; blockers: number }; generatedAt: string };
export type QualitySnapshot = { _id: string; plan: string; signedBy: string; signedByName?: string | null; signedAt: string; exceptionReason?: string; report: QualityReport };
export type QualityBug = { _id: string; title: string; status: string; priority: string; bugDetails: { severity: string; environment: string }; list: string; updatedAt: string };

const root = (workspaceId: string) => `/workspaces/${workspaceId}/quality`;

export function useQualityCapabilities(workspaceId: string, listId?: string) {
  return useQuery({
    queryKey: ['quality', workspaceId, 'capabilities', listId || 'workspace'],
    enabled: Boolean(workspaceId),
    queryFn: async () => (await api.get(`${root(workspaceId)}/capabilities`, { params: listId ? { listId } : {} })).data.data as QualityCapabilities,
  });
}

export function useQualitySettings(workspaceId: string, enabled = true) {
  const { projectId, ready } = useQualityProject();
  return useQuery({
    queryKey: ['quality', workspaceId, projectId, 'project-settings'], enabled: Boolean(workspaceId && projectId) && ready && enabled,
    queryFn: async () => (await api.get(`${root(workspaceId)}/project-settings`, { params: { projectId } })).data.data as QualityProjectSettings,
  });
}

export function useQualityCases(workspaceId: string, filters: QualityFilters, enabled = true) {
  const { projectId, ready } = useQualityProject();
  return useQuery({
    queryKey: ['quality', workspaceId, projectId, 'cases', filters],
    enabled: Boolean(workspaceId && projectId) && ready && enabled,
    queryFn: async () => (await api.get(`${root(workspaceId)}/cases`, { params: { ...filters, projectId } })).data as Paginated<QualityCase>,
  });
}

export function useQualityBugs(workspaceId: string, filters: { page: number; status?: string; severity?: string; search?: string }, enabled = true) {
  const { projectId, ready } = useQualityProject();
  return useQuery({
    queryKey: ['quality', workspaceId, projectId, 'bugs', filters],
    enabled: Boolean(workspaceId && projectId) && ready && enabled,
    queryFn: async () => (await api.get(`${root(workspaceId)}/bugs`, { params: { ...filters, limit: 30, projectId } })).data as Paginated<QualityBug>,
  });
}

export function useQualityModules(workspaceId: string, enabled = true) {
  const { projectId, ready } = useQualityProject();
  return useQuery({
    queryKey: ['quality', workspaceId, projectId, 'modules'], enabled: Boolean(workspaceId && projectId) && ready && enabled,
    queryFn: async () => (await api.get(`${root(workspaceId)}/modules`, { params: { limit: 100, projectId } })).data as Paginated<QualityOption>,
  });
}

export function useQualitySuites(workspaceId: string, enabled = true) {
  const { projectId, ready } = useQualityProject();
  return useQuery({
    queryKey: ['quality', workspaceId, projectId, 'suites'], enabled: Boolean(workspaceId && projectId) && ready && enabled,
    queryFn: async () => (await api.get(`${root(workspaceId)}/suites`, { params: { limit: 100, projectId } })).data as Paginated<QualityOption>,
  });
}

export function useQualityPlans(workspaceId: string, page: number, enabled = true) {
  const { projectId, ready } = useQualityProject();
  return useQuery({
    queryKey: ['quality', workspaceId, projectId, 'plans', page], enabled: Boolean(workspaceId && projectId) && ready && enabled,
    queryFn: async () => (await api.get(`${root(workspaceId)}/plans`, { params: { page, limit: 30, projectId } })).data as Paginated<QualityPlan>,
  });
}

export function useQualityPlan(workspaceId: string, planId: string, enabled = true) {
  const { projectId, ready } = useQualityProject();
  return useQuery({
    queryKey: ['quality', workspaceId, projectId, 'plan', planId], enabled: Boolean(workspaceId && projectId && planId) && ready && enabled,
    queryFn: async () => (await api.get(`${root(workspaceId)}/plans/${planId}`, { params: { projectId } })).data.data as QualityPlan,
  });
}

export function useQualityRuns(workspaceId: string, page: number, planId?: string, enabled = true) {
  const { projectId, ready } = useQualityProject();
  return useQuery({
    queryKey: ['quality', workspaceId, projectId, 'runs', page, planId || 'all'], enabled: Boolean(workspaceId && projectId) && ready && enabled,
    queryFn: async () => (await api.get(`${root(workspaceId)}/runs`, { params: { page, limit: 30, projectId, ...(planId && { planId }) } })).data as Paginated<QualityRun>,
  });
}

export function useQualityExecutions(workspaceId: string, runId: string, page: number, enabled = true) {
  const { projectId, ready } = useQualityProject();
  return useQuery({
    queryKey: ['quality', workspaceId, projectId, 'runs', runId, 'executions', page], enabled: Boolean(workspaceId && projectId && runId) && ready && enabled,
    queryFn: async () => (await api.get(`${root(workspaceId)}/runs/${runId}/executions`, { params: { page, limit: 30, projectId } })).data as Paginated<QualityExecution> & { run: QualityRun },
  });
}

export function useQualityLiveReport(workspaceId: string, planId: string, enabled = true) {
  const { projectId, ready } = useQualityProject();
  return useQuery({
    queryKey: ['quality', workspaceId, projectId, 'reports', 'live', planId], enabled: Boolean(workspaceId && projectId && planId) && ready && enabled,
    queryFn: async () => (await api.get(`${root(workspaceId)}/reports/live`, { params: { planId, projectId } })).data.data as QualityReport,
  });
}

export function useQualitySnapshots(workspaceId: string, planId: string, page: number, enabled = true) {
  const { projectId, ready } = useQualityProject();
  return useQuery({
    queryKey: ['quality', workspaceId, projectId, 'reports', 'snapshots', planId, page], enabled: Boolean(workspaceId && projectId && planId) && ready && enabled,
    queryFn: async () => (await api.get(`${root(workspaceId)}/reports/snapshots`, { params: { planId, page, limit: 30, projectId } })).data as Paginated<QualitySnapshot>,
  });
}
