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
import { useTaskSidebarStore } from '@/store/useTaskSidebarStore';
import { api } from '@/lib/axios';
import { QualityExecution, useQualityBugs, useQualityCapabilities, useQualityExecutions, useQualitySettings } from '@/hooks/queries/useQuality';
import { useRecordQualityExecution } from '@/hooks/mutations/useQualityMutations';
import { useQualityProject } from '@/components/quality/QualityProjectContext';

const resultLabel: Record<QualityExecution['result'], string> = { not_run: 'Not run', pass: 'Pass', fail: 'Fail', blocked: 'Blocked', skipped: 'Skipped' };

export default function QualityRunPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const runId = params.runId as string;
  const { projectId } = useQualityProject();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<QualityExecution | null>(null);
  const [showBugLink, setShowBugLink] = useState(false);
  const [bugSearch, setBugSearch] = useState('');
  const [debouncedBugSearch, setDebouncedBugSearch] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const currentUserId = useAuthStore(state => state.user?._id);
  const openTask = useTaskSidebarStore(state => state.openTask);
  const hierarchy = useWorkspaceStore(state => state.hierarchy);
  const fetchHierarchy = useWorkspaceStore(state => state.fetchHierarchy);
  const caps = useQualityCapabilities(workspaceId);
  const enabled = Boolean(caps.data?.canViewQuality);
  const projectSettings = useQualitySettings(workspaceId, enabled);
  const executions = useQualityExecutions(workspaceId, runId, page, enabled);
  const existingBugs = useQualityBugs(workspaceId, { page: 1, search: debouncedBugSearch || undefined }, enabled && showBugLink);
  const record = useRecordQualityExecution(workspaceId, runId);
  const members = useQuery({
    queryKey: ['workspace', workspaceId, 'members', 'quality-assignment'],
    enabled,
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}/members`)).data.data as Array<{ _id: string; name: string; email: string }>,
  });
  const memberNames = new Map(members.data?.map(member => [member._id, member.name || member.email]) || []);
  const memberOptions = members.data?.map(member => ({ id: member._id, label: `${member.name || 'Workspace member'} · ${member.email}` })) || [];

  useEffect(() => { if (workspaceId) void fetchHierarchy(workspaceId).catch(() => {}); }, [workspaceId, fetchHierarchy]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedBugSearch(bugSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [bugSearch]);
  const folderValue = projectSettings.data?.project.folder;
  const selectedFolderId = typeof folderValue === 'string' ? folderValue : folderValue?._id;
  const listOptions = hierarchy?.workspaceId === workspaceId ? hierarchy.spaces.flatMap(space => selectedFolderId
    ? space.folders.filter(folder => folder._id === selectedFolderId).flatMap(folder => folder.lists.map(list => ({ id: list._id, label: `${space.name} / ${folder.name} / ${list.name}` })))
    : [
      ...space.lists.map(list => ({ id: list._id, label: `${space.name} / ${list.name}` })),
      ...space.folders.flatMap(folder => folder.lists.map(list => ({ id: list._id, label: `${space.name} / ${folder.name} / ${list.name}` }))),
    ]) : [];
  const bugOptions = existingBugs.data?.data.map(bug => ({ id: bug._id, title: bug.title, status: bug.status, listLabel: listOptions.find(list => list.id === bug.list)?.label || 'Developer list' })) || [];

  if (caps.isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading Quality…</div>;
  if (caps.isError || !enabled) return <div className="p-8 text-sm">Quality is unavailable in this workspace.</div>;
  const run = executions.data?.run;
  const closeRun = async () => {
    if (!projectId) return toast.error('Wait for the QA project to load, then try again.');
    setClosing(true);
    try {
      await api.post(`/workspaces/${workspaceId}/quality/runs/${runId}/close`, {}, { params: { projectId } });
      await executions.refetch();
      setConfirmClose(false);
      toast.success('Run closed');
    } catch (caught: any) {
      toast.error(caught?.response?.data?.message || 'Could not close this run');
    } finally { setClosing(false); }
  };

  return <main className="mx-auto min-w-0 max-w-7xl space-y-6 px-4 py-6 sm:px-8">
    <div><Link href={`/workspace/${workspaceId}/quality/plans?projectId=${encodeURIComponent(projectId || "")}`} className="inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Plans & runs</Link><div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><h1 className="break-words text-2xl font-semibold tracking-tight">{run ? `Build ${run.build}` : 'Test run'}</h1><p className="mt-1 break-words text-sm text-muted-foreground">{run ? `${run.environment} · ${run.status}` : 'Loading run…'}</p></div><div className="flex flex-wrap items-center justify-between gap-3"><div className="text-sm text-muted-foreground">{executions.data?.pagination.total ?? '…'} cases</div>{caps.data?.canManagePlan && run?.status === 'open' && (confirmClose ? <div className="grid grid-cols-2 gap-2"><Button className="min-h-11" size="sm" variant="destructive" disabled={closing} onClick={closeRun}>Confirm close</Button><Button className="min-h-11" size="sm" variant="ghost" onClick={() => setConfirmClose(false)}>Cancel</Button></div> : <Button className="min-h-11" size="sm" variant="outline" onClick={() => setConfirmClose(true)}>Close run</Button>)}</div></div></div>
    {executions.isError ? <div role="alert" className="rounded-lg border p-5 text-sm">Could not load this run. <Button variant="link" onClick={() => executions.refetch()}>Retry</Button></div> : executions.isLoading ? <div className="rounded-lg border p-6 text-sm text-muted-foreground">Loading executions…</div> : <div className="overflow-hidden rounded-xl border bg-card">
      <div data-testid="run-execution-cards" className="divide-y lg:hidden">{executions.data?.data.map(execution => <button key={execution._id} type="button" onClick={() => setSelected(execution)} className="block min-h-11 w-full min-w-0 p-3 text-left hover:bg-muted/30"><div className="flex flex-wrap items-start justify-between gap-2"><span className="font-mono text-xs text-muted-foreground">{execution.caseKey} · v{execution.revision}</span><span className="rounded-md border px-2 py-1 text-xs">{resultLabel[execution.result]}</span></div><span className="mt-2 block break-words font-medium">{execution.snapshot.title}</span><span className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>Tester: {execution.assignedTo ? memberNames.get(execution.assignedTo) || 'Workspace member' : 'Unassigned'}</span><span>Bugs: {execution.bugIds?.length || '—'}</span><span className="col-span-2">Updated: {execution.updatedAt ? new Date(execution.updatedAt).toLocaleString() : '—'}</span></span></button>)}</div>
      <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Case</th><th className="px-4 py-3">Revision</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Tester</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3">Bugs</th></tr></thead><tbody>{executions.data?.data.map(execution => <tr key={execution._id} className="border-b last:border-b-0 hover:bg-muted/30"><td className="px-4 py-3"><button type="button" className="text-left font-medium hover:underline" onClick={() => setSelected(execution)}><span className="mr-2 font-mono text-xs text-muted-foreground">{execution.caseKey}</span>{execution.snapshot.title}</button></td><td className="px-4 py-3">v{execution.revision}</td><td className="px-4 py-3">{resultLabel[execution.result]}</td><td className="px-4 py-3 text-xs text-muted-foreground">{execution.assignedTo ? memberNames.get(execution.assignedTo) || 'Workspace member' : 'Unassigned'}</td><td className="px-4 py-3 text-xs text-muted-foreground">{execution.updatedAt ? new Date(execution.updatedAt).toLocaleString() : '—'}</td><td className="px-4 py-3 text-xs text-muted-foreground">{execution.bugIds?.length || '—'}</td></tr>)}</tbody></table></div>
      {!executions.data?.data.length && <p className="p-4 text-center text-sm text-muted-foreground">No executions found.</p>}<div className="flex flex-col items-start justify-between gap-3 border-t px-3 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-4"><span>{executions.data?.pagination.total || 0} total</span><div className="grid w-full grid-cols-2 gap-2 sm:w-auto"><Button className="min-h-11" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button className="min-h-11" size="sm" variant="outline" disabled={page * 30 >= (executions.data?.pagination.total || 0)} onClick={() => setPage(page + 1)}>Next</Button></div></div></div>}
    <Sheet open={Boolean(selected)} onOpenChange={open => { if (!open) { setSelected(null); setShowBugLink(false); setBugSearch(''); } }}><SheetContent side="right" className="w-full max-w-full overflow-y-auto sm:max-w-2xl"><SheetHeader className="mb-5"><SheetTitle>{selected?.caseKey || 'Execution'}</SheetTitle><SheetDescription>{projectSettings.data?.project.name || 'QA project'} · case steps frozen to this run&apos;s revision.</SheetDescription></SheetHeader>{selected && <div className="min-w-0 space-y-6">{caps.data?.canExecuteCase && (caps.data?.canManagePlan || selected.assignedTo === currentUserId) && run?.status === 'open' ? <ExecutionPlayer key={selected._id} workspaceId={workspaceId} execution={selected} onSave={async input => { const updated = await record.mutateAsync(input); setSelected(updated); toast.success('Result saved'); }} /> : <div className="space-y-4"><div className="break-words text-sm font-medium">{selected.snapshot.title} · {resultLabel[selected.result]}</div>{selected.snapshot.steps.map((step, index) => <div key={index} className="rounded-lg border p-3 text-sm"><div className="text-xs text-muted-foreground">Step {index + 1}</div><p className="break-words">{step.action}</p><p className="mt-2 break-words text-muted-foreground">Expected: {step.expectedResult}</p></div>)}</div>}{selected.linkedBugs?.length ? <section className="space-y-2 rounded-lg border p-4" aria-label="Linked developer bugs"><div><h3 className="text-sm font-semibold">Linked developer bugs</h3><p className="mt-1 text-xs text-muted-foreground">Open a bug to edit its assignee or due date. New bug assignment and target fix date are set in the form below.</p></div>{selected.linkedBugs.map(bug => <button type="button" key={bug._id} onClick={() => openTask(bug._id)} className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-left hover:bg-muted/40"><span className="min-w-0 break-words"><span className="block break-words text-sm font-medium">{bug.title}</span><span className="mt-1 block break-words text-xs font-medium text-muted-foreground">QA project: {projectSettings.data?.project.name || 'QA project'}</span><span className="mt-1 block break-words text-xs text-muted-foreground">Developer list: {bug.list?.space?.name || 'Space'} / {bug.list?.name || 'Developer list'}</span><span className="mt-1 block break-words text-xs text-muted-foreground">Assignee: {bug.assignee?.name || 'Unassigned'} · Due date: {bug.dueDate ? bug.dueDate.slice(0, 10) : 'not set'}</span></span><span className="break-words text-xs capitalize text-muted-foreground">{bug.status.replace('inprogress', 'in progress')} · {bug.bugDetails?.severity || bug.priority} <span className="ml-2 font-medium text-primary">Open bug →</span></span></button>)}</section> : selected.bugIds?.length ? <p className="text-xs text-muted-foreground">{selected.bugIds.length} linked bug(s) are not visible to your account.</p> : null}{caps.data?.canExecuteCase && (caps.data?.canManagePlan || selected.assignedTo === currentUserId) && ['fail', 'blocked', 'pass'].includes(selected.result) && <div className="space-y-3 rounded-lg border p-4"><Button className="min-h-11" size="sm" variant="outline" onClick={() => { setShowBugLink(!showBugLink); setBugSearch(''); }}>{showBugLink ? 'Hide bug form' : selected.result === 'pass' ? 'Link passing retest to bug' : 'Create or link developer bug'}</Button>{showBugLink && <FailureBugDialog key={selected._id} lists={listOptions} bugs={bugOptions} members={memberOptions} bugSearch={bugSearch} onBugSearchChange={setBugSearch} bugsLoading={existingBugs.isLoading} bugsError={existingBugs.isError} onRetryBugs={() => void existingBugs.refetch()} allowNew={selected.result !== 'pass'} defaultListId={projectSettings.data?.settings.bugHandoff.defaultListId} onCreate={async input => { await api.post(`/workspaces/${workspaceId}/quality/executions/${selected._id}/bugs`, input, { params: { projectId } }); const refreshed = await executions.refetch(); setSelected(refreshed.data?.data.find(item => item._id === selected._id) || selected); setShowBugLink(false); toast.success('Bug linked to execution'); }} />}</div>}</div>}</SheetContent></Sheet>
  </main>;
}
