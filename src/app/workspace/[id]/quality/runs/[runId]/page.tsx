'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ExecutionPlayer } from '@/components/quality/ExecutionPlayer';
import { FailureBugDialog } from '@/components/quality/FailureBugDialog';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/axios';
import { QualityExecution, useQualityCapabilities, useQualityExecutions, useQualitySettings } from '@/hooks/queries/useQuality';
import { useRecordQualityExecution } from '@/hooks/mutations/useQualityMutations';

const resultLabel: Record<QualityExecution['result'], string> = { not_run: 'Not run', pass: 'Pass', fail: 'Fail', blocked: 'Blocked', skipped: 'Skipped' };

export default function QualityRunPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const runId = params.runId as string;
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<QualityExecution | null>(null);
  const [showBugLink, setShowBugLink] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const currentUserId = useAuthStore(state => state.user?._id);
  const hierarchy = useWorkspaceStore(state => state.hierarchy);
  const fetchHierarchy = useWorkspaceStore(state => state.fetchHierarchy);
  const caps = useQualityCapabilities(workspaceId);
  const enabled = Boolean(caps.data?.canViewQuality);
  const projectSettings = useQualitySettings(workspaceId, enabled);
  const executions = useQualityExecutions(workspaceId, runId, page, enabled);
  const record = useRecordQualityExecution(workspaceId, runId);
  const members = useQuery({
    queryKey: ['workspace', workspaceId, 'members', 'quality-assignment'],
    enabled,
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}/members`)).data.data as Array<{ _id: string; name: string; email: string }>,
  });
  const memberNames = new Map(members.data?.map(member => [member._id, member.name || member.email]) || []);

  useEffect(() => { if (workspaceId) void fetchHierarchy(workspaceId).catch(() => {}); }, [workspaceId, fetchHierarchy]);
  const folderValue = projectSettings.data?.project.folder;
  const selectedFolderId = typeof folderValue === 'string' ? folderValue : folderValue?._id;
  const listOptions = hierarchy?.workspaceId === workspaceId ? hierarchy.spaces.flatMap(space => [
    ...space.lists.map(list => ({ id: list._id, label: `${space.name} / ${list.name}` })),
    ...space.folders.filter(folder => !selectedFolderId || folder._id === selectedFolderId).flatMap(folder => folder.lists.map(list => ({ id: list._id, label: `${space.name} / ${folder.name} / ${list.name}` }))),
  ]) : [];

  if (caps.isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading Quality…</div>;
  if (caps.isError || !enabled) return <div className="p-8 text-sm">Quality is unavailable in this workspace.</div>;
  const run = executions.data?.run;
  const closeRun = async () => {
    setClosing(true);
    try {
      await api.post(`/workspaces/${workspaceId}/quality/runs/${runId}/close`);
      await executions.refetch();
      setConfirmClose(false);
      toast.success('Run closed');
    } catch (caught: any) {
      toast.error(caught?.response?.data?.message || 'Could not close this run');
    } finally { setClosing(false); }
  };

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8">
    <div><Link href={`/workspace/${workspaceId}/quality/plans`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Plans & runs</Link><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">{run ? `Build ${run.build}` : 'Test run'}</h1><p className="mt-1 text-sm text-muted-foreground">{run ? `${run.environment} · ${run.status}` : 'Loading run…'}</p></div><div className="flex items-center gap-3"><div className="text-sm text-muted-foreground">{executions.data?.pagination.total ?? '…'} cases</div>{caps.data?.canManagePlan && run?.status === 'open' && (confirmClose ? <div className="flex gap-1"><Button size="sm" variant="destructive" disabled={closing} onClick={closeRun}>Confirm close</Button><Button size="sm" variant="ghost" onClick={() => setConfirmClose(false)}>Cancel</Button></div> : <Button size="sm" variant="outline" onClick={() => setConfirmClose(true)}>Close run</Button>)}</div></div></div>
    {executions.isError ? <div role="alert" className="rounded-lg border p-5 text-sm">Could not load this run. <Button variant="link" onClick={() => executions.refetch()}>Retry</Button></div> : executions.isLoading ? <div className="rounded-lg border p-6 text-sm text-muted-foreground">Loading executions…</div> : <div className="overflow-hidden rounded-xl border bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Case</th><th className="px-4 py-3">Revision</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Tester</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3">Bugs</th></tr></thead><tbody>{executions.data?.data.map(execution => <tr key={execution._id} className="border-b last:border-b-0 hover:bg-muted/30"><td className="px-4 py-3"><button type="button" className="text-left font-medium hover:underline" onClick={() => setSelected(execution)}><span className="mr-2 font-mono text-xs text-muted-foreground">{execution.caseKey}</span>{execution.snapshot.title}</button></td><td className="px-4 py-3">v{execution.revision}</td><td className="px-4 py-3">{resultLabel[execution.result]}</td><td className="px-4 py-3 text-xs text-muted-foreground">{execution.assignedTo ? memberNames.get(execution.assignedTo) || 'Workspace member' : 'Unassigned'}</td><td className="px-4 py-3 text-xs text-muted-foreground">{execution.updatedAt ? new Date(execution.updatedAt).toLocaleString() : '—'}</td><td className="px-4 py-3 text-xs text-muted-foreground">{execution.bugIds?.length || '—'}</td></tr>)}</tbody></table></div>{!executions.data?.data.length && <p className="p-8 text-center text-sm text-muted-foreground">No executions found.</p>}<div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground"><span>{executions.data?.pagination.total || 0} total</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={page * 30 >= (executions.data?.pagination.total || 0)} onClick={() => setPage(page + 1)}>Next</Button></div></div></div>}
    <Sheet open={Boolean(selected)} onOpenChange={open => { if (!open) { setSelected(null); setShowBugLink(false); } }}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl"><SheetHeader className="mb-5"><SheetTitle>{selected?.caseKey || 'Execution'}</SheetTitle><SheetDescription>The case steps are frozen to this run's revision.</SheetDescription></SheetHeader>{selected && <div className="space-y-6">{caps.data?.canExecuteCase && (caps.data?.canManagePlan || selected.assignedTo === currentUserId) && run?.status === 'open' ? <ExecutionPlayer key={selected._id} workspaceId={workspaceId} execution={selected} onSave={async input => { const updated = await record.mutateAsync(input); setSelected(updated); toast.success('Result saved'); }} /> : <div className="space-y-4"><div className="text-sm font-medium">{selected.snapshot.title} · {resultLabel[selected.result]}</div>{selected.snapshot.steps.map((step, index) => <div key={index} className="rounded-lg border p-3 text-sm"><div className="text-xs text-muted-foreground">Step {index + 1}</div><p>{step.action}</p><p className="mt-2 text-muted-foreground">Expected: {step.expectedResult}</p></div>)}</div>}{selected.bugIds?.length ? <p className="text-xs text-muted-foreground">Linked bugs: {selected.bugIds.length}</p> : null}{caps.data?.canExecuteCase && (caps.data?.canManagePlan || selected.assignedTo === currentUserId) && ['fail', 'blocked', 'pass'].includes(selected.result) && <div className="space-y-3 rounded-lg border p-4"><Button size="sm" variant="outline" onClick={() => setShowBugLink(!showBugLink)}>{showBugLink ? 'Hide bug form' : selected.result === 'pass' ? 'Link passing retest to bug' : 'Create or link developer bug'}</Button>{showBugLink && <FailureBugDialog key={selected._id} lists={listOptions} allowNew={selected.result !== 'pass'} defaultListId={projectSettings.data?.settings.bugHandoff.defaultListId} onCreate={async input => { const response = await api.post(`/workspaces/${workspaceId}/quality/executions/${selected._id}/bugs`, input); setSelected(previous => previous ? { ...previous, bugIds: Array.from(new Set([...(previous.bugIds || []), response.data.data._id])) } : previous); setShowBugLink(false); void executions.refetch(); toast.success('Bug linked to execution'); }} />}</div>}</div>}</SheetContent></Sheet>
  </div>;
}
