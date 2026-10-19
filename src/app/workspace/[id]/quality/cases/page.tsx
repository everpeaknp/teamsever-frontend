'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, Plus, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CaseEditor, QualityCase } from '@/components/quality/CaseEditor';
import { CaseGrid } from '@/components/quality/CaseGrid';
import { CaseImportWizard } from '@/components/quality/CaseImportWizard';
import { LibraryStructureManager } from '@/components/quality/LibraryStructureManager';
import { api } from '@/lib/axios';
import { useQualityCapabilities, useQualityCases, useQualityModules, useQualitySuites, useQualitySettings } from '@/hooks/queries/useQuality';
import { useSaveQualityCase } from '@/hooks/mutations/useQualityMutations';
import { useQualityProject } from '@/components/quality/QualityProjectContext';

export default function QualityCasesPage() {
  const workspaceId = useParams().id as string;
  const { projectId } = useQualityProject();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<QualityCase | undefined>();
  const capabilities = useQualityCapabilities(workspaceId);
  const enabled = Boolean(capabilities.data?.canViewQuality);
  const cases = useQualityCases(workspaceId, { page, limit: 30, ...(search && { search }), ...(state && { state }), ...(moduleId && { moduleId }) }, enabled);
  const modules = useQualityModules(workspaceId, enabled);
  const suites = useQualitySuites(workspaceId, enabled);
  const projectSettings = useQualitySettings(workspaceId, enabled);
  const saveCase = useSaveQualityCase(workspaceId);

  if (capabilities.isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading Quality…</div>;
  if (capabilities.isError || !enabled) return <div className="mx-auto max-w-xl p-8"><h1 className="text-xl font-semibold">Case library unavailable</h1><p className="mt-2 text-sm text-muted-foreground">Quality may not be enabled for this workspace, or you may not have access.</p></div>;

  const openEditor = (testCase?: QualityCase) => { setSelected(testCase); setEditorOpen(true); };
  const applySearch = (event: React.FormEvent) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); };
  const hasCaseFilters = Boolean(search || state || moduleId);
  const emptyMessage = cases.data?.pagination.total === 0 && !hasCaseFilters
    ? 'No test cases have been created in this project yet. Suites organize cases; create a case and assign it to a suite.'
    : 'No cases match these filters.';
  const exportFile = async () => {
    if (!projectId) return toast.error('Wait for the QA project to load, then try again.');
    try {
      const response = await api.get(`/workspaces/${workspaceId}/quality/cases/export`, { params: { projectId }, responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'quality-cases.xlsx'; anchor.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Could not export cases'); }
  };

  return <main className="mx-auto min-w-0 max-w-7xl space-y-6 px-4 py-6 sm:px-8">
    <div className="space-y-3"><Link href={`/workspace/${workspaceId}/quality`} className="inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Quality</Link><div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start"><div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight">Case library</h1><p className="mt-1 text-sm text-muted-foreground">Reusable test instructions with a revision history.</p></div><div className="grid grid-cols-1 gap-2 sm:flex"><Button className="min-h-11 w-full sm:min-h-10 sm:w-auto" variant="outline" onClick={exportFile}><Download className="mr-1.5 h-4 w-4" />Export</Button>{capabilities.data?.canAuthorCase && <><Button className="min-h-11 w-full sm:min-h-10 sm:w-auto" variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-1.5 h-4 w-4" />Import</Button><Button className="min-h-11 w-full sm:min-h-10 sm:w-auto" onClick={() => openEditor()}><Plus className="mr-1.5 h-4 w-4" />New case</Button></>}</div></div></div>
    <div className="grid min-w-0 grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-3"><form onSubmit={applySearch} className="flex min-w-0 gap-2 sm:min-w-[220px] sm:flex-1"><Input className="min-w-0" aria-label="Search cases" placeholder="Search case ID or title" value={searchInput} onChange={event => setSearchInput(event.target.value)} /><Button className="min-h-11 shrink-0" variant="outline" type="submit" aria-label="Apply search"><Search className="h-4 w-4" /></Button></form><select aria-label="Filter by state" className="h-11 min-w-0 w-full rounded-md border border-input bg-background px-3 text-sm sm:h-10 sm:w-auto" value={state} onChange={event => { setState(event.target.value); setPage(1); }}><option value="">All statuses</option>{projectSettings.data?.settings.caseStatuses.map(status => <option key={status.key} value={status.key}>{status.label}</option>)}</select><select aria-label="Filter by module" className="h-11 min-w-0 w-full rounded-md border border-input bg-background px-3 text-sm sm:h-10 sm:w-auto" value={moduleId} onChange={event => { setModuleId(event.target.value); setPage(1); }}><option value="">All modules</option>{modules.data?.data.map(module => <option key={module._id} value={module._id}>{module.name}</option>)}</select></div>
    {capabilities.data?.canAuthorCase && <LibraryStructureManager workspaceId={workspaceId} modules={modules.data?.data || []} suites={suites.data?.data || []} />}
    {cases.isError ? <div role="alert" className="rounded-lg border border-destructive/30 p-5 text-sm">Could not load cases. <Button variant="link" onClick={() => cases.refetch()}>Retry</Button></div> : cases.isLoading ? <div className="rounded-xl border p-8 text-sm text-muted-foreground">Loading cases…</div> : <CaseGrid cases={cases.data?.data || []} page={page} limit={30} total={cases.data?.pagination.total || 0} onPageChange={setPage} onOpen={openEditor} caseStatuses={projectSettings.data?.settings.caseStatuses || []} caseTransitions={projectSettings.data?.settings.caseTransitions || {}} caseFields={projectSettings.data?.settings.caseFields || []} emptyMessage={emptyMessage} onQuickSave={capabilities.data?.canAuthorCase ? async (testCase, change) => { await saveCase.mutateAsync({ caseId: testCase._id, expectedRevision: testCase.currentRevision, draft: { ...testCase, ...change } }); toast.success('Case revision saved'); } : undefined} />}
    <Sheet open={editorOpen} onOpenChange={setEditorOpen}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl"><SheetHeader className="mb-5"><SheetTitle>{selected ? `${selected.key} · ${selected.title}` : 'New test case'}</SheetTitle><SheetDescription>{selected ? `Revision ${selected.currentRevision}. Saving creates a new revision.` : 'Add clear steps and expected outcomes.'}</SheetDescription></SheetHeader>{(!selected || capabilities.data?.canAuthorCase) ? <CaseEditor key={`${selected?._id || 'new'}-${projectSettings.data?.settings.caseFields.length || 0}`} value={selected} modules={modules.data?.data || []} suites={suites.data?.data || []} settings={projectSettings.data?.settings} onCancel={() => setEditorOpen(false)} onSave={async (draft, expectedRevision) => { await saveCase.mutateAsync({ draft, caseId: selected?._id, expectedRevision }); setEditorOpen(false); toast.success(selected ? 'Case revision saved' : 'Case created'); }} /> : <div className="text-sm text-muted-foreground">You can view this case, but cannot edit it.</div>}</SheetContent></Sheet>
    <Sheet open={importOpen} onOpenChange={setImportOpen}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl"><SheetHeader className="mb-5"><SheetTitle>Import test cases</SheetTitle><SheetDescription>Preview every row before writing to the library.</SheetDescription></SheetHeader><CaseImportWizard workspaceId={workspaceId} onComplete={() => { void cases.refetch(); toast.success('Import completed'); }} /></SheetContent></Sheet>
  </main>;
}
