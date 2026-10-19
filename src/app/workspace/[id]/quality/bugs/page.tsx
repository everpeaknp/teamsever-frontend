'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQualityBugs, useQualityCapabilities } from '@/hooks/queries/useQuality';
import { useTaskSidebarStore } from '@/store/useTaskSidebarStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QualityBugList } from '@/components/quality/QualityBugList';

export default function QualityBugsPage() {
  const workspaceId = useParams().id as string;
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [search, setSearch] = useState('');
  const caps = useQualityCapabilities(workspaceId);
  const bugs = useQualityBugs(workspaceId, { page, status, severity, search: search.trim() }, Boolean(caps.data?.canViewQuality));
  const openTask = useTaskSidebarStore(state => state.openTask);

  if (caps.isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading Quality…</div>;
  if (caps.isError || !caps.data?.canViewQuality) return <div className="p-8 text-sm">Quality is unavailable in this workspace.</div>;
  return <main data-testid="quality-bugs-page" className="mx-auto min-w-0 max-w-6xl space-y-5 px-4 py-6 sm:px-8">
    <div><h1 className="text-2xl font-semibold tracking-tight">Developer bugs</h1><p className="mt-1 text-sm text-muted-foreground">Issues reported by QA across the lists you can access.</p></div>
    <div className="grid min-w-0 grid-cols-1 gap-2 sm:flex sm:flex-wrap"><Input aria-label="Search bugs" className="min-w-0 sm:min-w-48 sm:flex-1" placeholder="Search bug summary" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /><select aria-label="Status" className="h-11 min-w-0 w-full rounded-md border bg-background px-3 text-sm sm:h-10 sm:w-auto" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="todo">Open</option><option value="inprogress">Working</option><option value="review">Ready for QA</option><option value="done">Verified</option><option value="cancelled">Closed without fix</option></select><select aria-label="Severity" className="h-11 min-w-0 w-full rounded-md border bg-background px-3 text-sm sm:h-10 sm:w-auto" value={severity} onChange={event => { setSeverity(event.target.value); setPage(1); }}><option value="">All severities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
    {bugs.isError ? <div role="alert" className="rounded-lg border p-5 text-sm">Could not load bugs. <Button variant="link" onClick={() => bugs.refetch()}>Retry</Button></div> : bugs.isLoading ? <div className="rounded-lg border p-6 text-sm text-muted-foreground">Loading bugs…</div> : <QualityBugList bugs={bugs.data?.data || []} total={bugs.data?.pagination.total || 0} page={page} onPageChange={setPage} onOpen={openTask} />}
  </main>;
}
