import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { CaseDraft } from '@/components/quality/CaseEditor';
import { useQualityProject } from '@/components/quality/QualityProjectContext';

export function useSaveQualityCase(workspaceId: string) {
  const queryClient = useQueryClient();
  const { projectId } = useQualityProject();
  return useMutation({
    mutationFn: async ({ draft, caseId, expectedRevision }: { draft: CaseDraft; caseId?: string; expectedRevision?: number }) => {
      if (!projectId) throw new Error('Choose a QA project before saving a case.');
      const path = `/workspaces/${workspaceId}/quality/cases`;
      const response = caseId
        ? await api.patch(`${path}/${caseId}`, { ...draft, expectedRevision }, { params: { projectId } })
        : await api.post(path, draft, { params: { projectId } });
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quality', workspaceId, projectId, 'cases'] }),
  });
}

export function useCreateQualityPlan(workspaceId: string) {
  const queryClient = useQueryClient();
  const { projectId } = useQualityProject();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; caseIds: string[] }) =>
      projectId ? (await api.post(`/workspaces/${workspaceId}/quality/plans`, input, { params: { projectId } })).data.data : Promise.reject(new Error('Choose a QA project before creating a plan.')),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quality', workspaceId, projectId, 'plans'] }),
  });
}

export function useStartQualityRun(workspaceId: string) {
  const queryClient = useQueryClient();
  const { projectId } = useQualityProject();
  return useMutation({
    mutationFn: async (input: { planId: string; build: string; environment: string; platform?: string; assignments?: Record<string, string> }) =>
      projectId ? (await api.post(`/workspaces/${workspaceId}/quality/plans/${input.planId}/runs`, { build: input.build, environment: input.environment, platform: input.platform, assignments: input.assignments }, { params: { projectId } })).data.data : Promise.reject(new Error('Choose a QA project before starting a run.')),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quality', workspaceId, projectId, 'runs'] }),
  });
}

export function useRecordQualityExecution(workspaceId: string, runId: string) {
  const queryClient = useQueryClient();
  const { projectId } = useQualityProject();
  return useMutation({
    mutationFn: async (input: { executionId: string; expectedVersion: number; result: string; reason?: string; stepResults: Array<{ result: string; actualResult?: string; evidenceIds?: string[] }>; evidenceIds?: string[] }) => {
      if (!projectId) throw new Error('Choose a QA project before saving a result.');
      return (await api.patch(`/workspaces/${workspaceId}/quality/executions/${input.executionId}`, input, { params: { projectId } })).data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quality', workspaceId, projectId, 'runs', runId, 'executions'] }),
  });
}

export function useSignOffQualityPlan(workspaceId: string, planId: string) {
  const queryClient = useQueryClient();
  const { projectId } = useQualityProject();
  return useMutation({
    mutationFn: async (exceptionReason?: string) => {
      if (!projectId) throw new Error('Choose a QA project before signing a report.');
      return (await api.post(`/workspaces/${workspaceId}/quality/plans/${planId}/signoff`, { exceptionReason }, { params: { projectId } })).data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quality', workspaceId, projectId, 'reports', 'snapshots', planId] }),
  });
}
