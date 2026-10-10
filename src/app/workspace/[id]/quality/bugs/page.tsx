'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQualityBugs, useQualityCapabilities } from '@/hooks/queries/useQuality';
import { useTaskSidebarStore } from '@/store/useTaskSidebarStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
  return <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-8">
    <div><h1 className="text-2xl font-semibold tracking-tight">Developer bugs</h1><p className="mt-1 text-sm text-muted-foreground">Issues reported by QA across the lists you can access.</p></div>
    <div className="flex flex-wrap gap-2"><Input aria-label="Search bugs" className="min-w-48 flex-1" placeholder="Search bug summary" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /><select aria-label="Status" className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="todo">Open</option><option value="inprogress">Working</option><option value="review">Ready for QA</option><option value="done">Verified</option><option value="cancelled">Closed without fix</option></select><select aria-label="Severity" className="h-10 rounded-md border bg-background px-3 text-sm" value={severity} onChange={event => { setSeverity(event.target.value); setPage(1); }}><option value="">All severities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
    {bugs.isError ? <div role="alert" className="rounded-lg border p-5 text-sm">Could not load bugs. <Button variant="link" onClick={() => bugs.refetch()}>Retry</Button></div> : bugs.isLoading ? <div className="rounded-lg border p-6 text-sm text-muted-foreground">Loading bugs…</div> : <div className="overflow-hidden rounded-xl border bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Bug</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Updated</th></tr></thead><tbody>{bugs.data?.data.map(bug => <tr key={bug._id} className="border-b last:border-b-0 hover:bg-muted/30"><td className="px-4 py-3"><button type="button" className="font-medium hover:underline" onClick={() => openTask(bug._id)}>{bug.title}</button><p className="mt-1 text-xs text-muted-foreground">{bug.bugDetails?.environment}</p></td><td className="px-4 py-3 capitalize">{bug.status}</td><td className="px-4 py-3 capitalize">{bug.bugDetails?.severity}</td><td className="px-4 py-3 text-xs text-muted-foreground">{new Date(bug.updatedAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>{!bugs.data?.data.length && <p className="p-8 text-center text-sm text-muted-foreground">No bugs match these filters.</p>}<div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground"><span>{bugs.data?.pagination.total || 0} bugs</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={page * 30 >= (bugs.data?.pagination.total || 0)} onClick={() => setPage(page + 1)}>Next</Button></div></div></div>}
  </div>;
}
