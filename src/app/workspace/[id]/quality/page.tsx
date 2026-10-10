'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BookOpen, Bug, ClipboardCheck, ListChecks, BarChart3 } from 'lucide-react';
import { useQualityCapabilities, useQualityCases } from '@/hooks/queries/useQuality';

export default function QualityOverviewPage() {
  const workspaceId = useParams().id as string;
  const capabilities = useQualityCapabilities(workspaceId);
  const enabled = Boolean(capabilities.data?.canViewQuality);
  const cases = useQualityCases(workspaceId, { page: 1, limit: 1 }, enabled);
  if (capabilities.isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading Quality…</div>;
  if (capabilities.isError || !enabled) return <div className="p-8"><h1 className="text-xl font-semibold">Quality unavailable</h1><p className="mt-2 text-sm text-muted-foreground">This workspace may not have Quality enabled, or you may not have access.</p></div>;
  return <div className="mx-auto max-w-6xl space-y-7 px-4 py-6 sm:px-8">
    <div><div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><ClipboardCheck className="h-4 w-4" />Workspace quality</div><h1 className="text-2xl font-semibold tracking-tight">Quality</h1><p className="mt-1 text-sm text-muted-foreground">Reusable cases and developer bugs stay connected to the work they cover.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Link href={`/workspace/${workspaceId}/quality/cases`} className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><BookOpen className="mb-4 h-5 w-5 text-primary" /><h2 className="font-semibold">Case library</h2><p className="mt-1 text-sm text-muted-foreground">{cases.data ? `${cases.data.pagination.total} cases` : 'Loading cases…'} · versioned steps and expected results</p></Link><Link href={`/workspace/${workspaceId}/quality/plans`} className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><ListChecks className="mb-4 h-5 w-5 text-primary" /><h2 className="font-semibold">Plans & runs</h2><p className="mt-1 text-sm text-muted-foreground">Test selected cases against a named build and environment.</p></Link><Link href={`/workspace/${workspaceId}/quality/reports`} className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><BarChart3 className="mb-4 h-5 w-5 text-primary" /><h2 className="font-semibold">Reports</h2><p className="mt-1 text-sm text-muted-foreground">See release blockers and signed snapshots.</p></Link><Link href={`/workspace/${workspaceId}/quality/bugs`} className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><Bug className="mb-4 h-5 w-5 text-primary" /><h2 className="font-semibold">Developer bugs</h2><p className="mt-1 text-sm text-muted-foreground">Report a bug from its owning list, then hand it to a developer for a verified fix.</p></Link></div>
  </div>;
}
