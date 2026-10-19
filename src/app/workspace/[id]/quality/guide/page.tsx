'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Lightbulb, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useQualityProject } from '@/components/quality/QualityProjectContext';
import { filterGuidebookSections } from '@/components/quality/qualityGuidebook';

export default function QualityGuidebookPage() {
  const workspaceId = useParams().id as string;
  const { project, projectId } = useQualityProject();
  const [search, setSearch] = useState('');
  const sections = useMemo(() => filterGuidebookSections(search), [search]);
  const qualityPath = `/workspace/${workspaceId}/quality`;
  const scopeQuery = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';

  return <main className="mx-auto min-w-0 max-w-7xl space-y-6 px-4 py-6 sm:px-8">
    <div><Link href={`${qualityPath}${scopeQuery}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Quality overview</Link></div>
    <header className="rounded-2xl border bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"><BookOpen className="h-3.5 w-3.5" />QUALITY FIELD GUIDE</div>
          <h1 className="text-3xl font-semibold tracking-tight">Your QA workflow, from first case to release sign-off</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">A practical handbook for the Quality tools in this workspace. Learn what each part is for, how the pieces connect, what to write, and what to do when a test fails.</p>
        </div>
        <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current scope</p><p className="mt-1 font-semibold">{project?.name || 'Loading project…'}</p><p className="mt-1 max-w-xs text-xs text-muted-foreground">{project?.scopeType === 'folder' ? 'Folder project · QA records here stay with this project.' : 'Workspace project · includes older unscoped QA records.'}</p></div>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1"><span className="sr-only">Search the guidebook</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search cases, screenshots, scope, sign-off…" className="pl-9" /></label>
        <Link href={`${qualityPath}${scopeQuery}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-muted">Back to Quality <ArrowRight className="h-4 w-4" /></Link>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{search ? `${sections.length} matching topic${sections.length === 1 ? '' : 's'}` : `${sections.length} in-depth topics · Search the whole handbook or jump to a section`}</p>
    </header>

    {sections.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center"><h2 className="font-semibold">No matching guide topics</h2><p className="mt-1 text-sm text-muted-foreground">Try another phrase, such as “run”, “evidence”, “folder”, or “bug”.</p></div> : <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
      <nav aria-label="Guidebook contents" className="top-5 rounded-xl border bg-card p-3 lg:sticky">
        <h2 className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">In this guide</h2>
        <div className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">{sections.map((section, index) => <a key={section.id} href={`#${section.id}`} className="flex min-w-max items-start gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:min-w-0"><span className="mt-0.5 font-mono text-[10px] text-primary">{String(index + 1).padStart(2, '0')}</span><span className="leading-4">{section.title}</span></a>)}</div>
        <div className="mt-3 border-t px-2 pt-3"><p className="text-xs leading-5 text-muted-foreground">Recommended path: understand scope → organize → write cases → run tests → handle bugs → review the report.</p></div>
      </nav>

      <div className="space-y-5">{sections.map((section, index) => <article key={section.id} id={section.id} className="scroll-mt-6 rounded-2xl border bg-card p-5 sm:p-7">
        <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-semibold text-primary">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.eyebrow}</p><h2 className="mt-1 text-xl font-semibold tracking-tight">{section.title}</h2></div></div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{section.intro}</p>
        <ol className="mt-5 space-y-3">{section.steps.map((step, stepIndex) => <li key={step} className="flex gap-3 text-sm leading-6"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" /><span><span className="mr-1 font-medium text-foreground">{stepIndex + 1}.</span>{step}</span></li>)}</ol>
        {section.example && <div className="mt-5 rounded-xl border bg-muted/20 p-4 sm:p-5"><h3 className="text-sm font-semibold">{section.example.title}</h3><div className="mt-3 space-y-2">{section.example.lines.map(line => <p key={line} className="text-sm leading-6 text-muted-foreground">{line}</p>)}</div></div>}
        {section.callout && <div className="mt-5 flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-sm leading-6">{section.callout}</p></div>}
        {section.link && <Link href={`${qualityPath}/${section.link.path}${scopeQuery}`} className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{section.link.label}<ArrowRight className="h-4 w-4" /></Link>}
      </article>)}</div>
    </div>}

    <footer className="rounded-xl border bg-muted/20 p-5 text-sm"><h2 className="font-semibold">A good QA record answers three questions</h2><div className="mt-3 grid gap-3 text-muted-foreground sm:grid-cols-3"><p><strong className="text-foreground">What did we intend to check?</strong><br />The reusable case and its expected results.</p><p><strong className="text-foreground">What happened on this build?</strong><br />The run, execution result, notes, and evidence.</p><p><strong className="text-foreground">What did we decide?</strong><br />The report review, risk notes, and signed snapshot.</p></div></footer>
  </main>;
}
