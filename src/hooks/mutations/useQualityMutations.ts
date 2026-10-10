import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { CaseDraft } from '@/components/quality/CaseEditor';

export function useSaveQualityCase(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ draft, caseId, expectedRevision }: { draft: CaseDraft; caseId?: string; expectedRevision?: number }) => {
      const path = `/workspaces/${workspaceId}/quality/cases`;
      const response = caseId
        ? await api.patch(`${path}/${caseId}`, { ...draft, expectedRevision })
        : await api.post(path, draft);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quality', workspaceId, 'cases'] }),
  });
}

export function useCreateQualityPlan(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; caseIds: string[] }) =>
      (await api.post(`/workspaces/${workspaceId}/quality/plans`, input)).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quality', workspaceId, 'plans'] }),
  });
}

export function useStartQualityRun(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { planId: string; build: string; environment: string; assignments?: Record<string, string> }) =>
      (await api.post(`/workspaces/${workspaceId}/quality/plans/${input.planId}/runs`, { build: input.build, environment: input.environment, assignments: input.assignments })).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quality', workspaceId, 'runs'] }),
  });
}

export function useRecordQualityExecution(workspaceId: string, runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { executionId: string; expectedVersion: number; result: string; reason?: string; stepResults: Array<{ result: string; actualResult?: string; evidenceIds?: string[] }>; evidenceIds?: string[] }) =>
      (await api.patch(`/workspaces/${workspaceId}/quality/executions/${input.executionId}`, input)).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quality', workspaceId, 'runs', runId, 'executions'] }),
  });
}

export function useSignOffQualityPlan(workspaceId: string, planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (exceptionReason?: string) =>
      (await api.post(`/workspaces/${workspaceId}/quality/plans/${planId}/signoff`, { exceptionReason })).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quality', workspaceId, 'reports', 'snapshots', planId] }),
  });
}
