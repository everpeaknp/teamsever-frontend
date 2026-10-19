'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BookOpen, Bug, ClipboardCheck, ListChecks, BarChart3, BookOpenCheck, ArrowRight } from 'lucide-react';
import { useQualityCapabilities, useQualityCases } from '@/hooks/queries/useQuality';
import { useQualityProject } from '@/components/quality/QualityProjectContext';

export default function QualityOverviewPage() {
  const workspaceId = useParams().id as string;
  const { projectId } = useQualityProject();
  const capabilities = useQualityCapabilities(workspaceId);
  const enabled = Boolean(capabilities.data?.canViewQuality);
  const cases = useQualityCases(workspaceId, { page: 1, limit: 1 }, enabled);
  if (capabilities.isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading Quality…</div>;
  if (capabilities.isError || !enabled) return <div className="p-8"><h1 className="text-xl font-semibold">Quality unavailable</h1><p className="mt-2 text-sm text-muted-foreground">This workspace may not have Quality enabled, or you may not have access.</p></div>;
  const caseSummary = cases.isLoading ? 'Loading cases…' : cases.isError ? 'Could not load cases' : `${cases.data?.pagination.total ?? 0} cases`;
  return <main className="mx-auto min-w-0 max-w-6xl space-y-7 px-4 py-6 sm:px-8">
    <div><div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><ClipboardCheck className="h-4 w-4" />Quality overview</div><h1 className="text-2xl font-semibold tracking-tight">Quality</h1><p className="mt-1 text-sm text-muted-foreground">Reusable cases and developer bugs stay connected to the work they cover.</p></div>
    <Link href={`/workspace/${workspaceId}/quality/guide${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`} className="group flex flex-col justify-between gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:px-5"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><BookOpenCheck className="h-4 w-4" /></span><div><h2 className="font-semibold">QA guidebook</h2><p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">Learn the workflow with practical examples: project scope, test cases, runs, evidence, bug handoff, and reports.</p></div></div><span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">Read the guide <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span></Link>
    {cases.isError && <div role="status" className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground">The case summary is unavailable right now. You can still open the library to retry.</div>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Link href={`/workspace/${workspaceId}/quality/cases`} className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><BookOpen className="mb-4 h-5 w-5 text-primary" /><h2 className="font-semibold">Case library</h2><p className="mt-1 text-sm text-muted-foreground">{caseSummary} · versioned steps and expected results</p></Link><Link href={`/workspace/${workspaceId}/quality/plans`} className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><ListChecks className="mb-4 h-5 w-5 text-primary" /><h2 className="font-semibold">Plans & runs</h2><p className="mt-1 text-sm text-muted-foreground">Test selected cases against a named build and environment.</p></Link><Link href={`/workspace/${workspaceId}/quality/reports`} className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><BarChart3 className="mb-4 h-5 w-5 text-primary" /><h2 className="font-semibold">Reports</h2><p className="mt-1 text-sm text-muted-foreground">See release blockers and signed snapshots.</p></Link><Link href={`/workspace/${workspaceId}/quality/bugs`} className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><Bug className="mb-4 h-5 w-5 text-primary" /><h2 className="font-semibold">Developer bugs</h2><p className="mt-1 text-sm text-muted-foreground">Report a bug from its owning list, then hand it to a developer for a verified fix.</p></Link></div>
  </main>;
}
