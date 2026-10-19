'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PlanEditor } from '@/components/quality/PlanEditor';
import { useQualityCapabilities, useQualityCases, useQualityPlan, useQualityPlans, useQualityRuns, useQualitySettings } from '@/hooks/queries/useQuality';
import { useCreateQualityPlan, useStartQualityRun } from '@/hooks/mutations/useQualityMutations';
import { useQualityProject } from '@/components/quality/QualityProjectContext';

export default function QualityPlansPage() {
  const workspaceId = useParams().id as string;
  const { projectId } = useQualityProject();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [casePage, setCasePage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [runPlanId, setRunPlanId] = useState('');
  const [build, setBuild] = useState('');
  const [environment, setEnvironment] = useState('');
  const [platform, setPlatform] = useState('');
  const [testerId, setTesterId] = useState('');
  const [caseAssignments, setCaseAssignments] = useState<Record<string, string>>({});
  const [runError, setRunError] = useState('');
  const caps = useQualityCapabilities(workspaceId);
  const projectSettings = useQualitySettings(workspaceId, Boolean(caps.data?.canViewQuality));
  const enabled = Boolean(caps.data?.canViewQuality);
  const plans = useQualityPlans(workspaceId, page, enabled);
  const runPlan = useQualityPlan(workspaceId, runPlanId, Boolean(runPlanId));
  const cases = useQualityCases(workspaceId, { page: casePage, limit: 10 }, enabled && createOpen);
  const runs = useQualityRuns(workspaceId, 1, undefined, enabled);
  const createPlan = useCreateQualityPlan(workspaceId);
  const startRun = useStartQualityRun(workspaceId);
  const members = useQuery({
    queryKey: ['quality', workspaceId, 'eligible-testers'],
    enabled: Boolean(runPlanId),
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}/quality/testers`)).data.data as Array<{ _id: string; name: string; email: string }>,
  });

  if (caps.isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading Quality…</div>;
  if (caps.isError || !enabled) return <div className="p-8 text-sm">Quality is unavailable in this workspace.</div>;

  const submitRun = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!build.trim() || !environment.trim()) return setRunError('Add both a build and environment.');
    setRunError('');
    try {
      const selectedPlan = runPlan.data;
      if (!selectedPlan?.cases || selectedPlan.cases.length !== selectedPlan.caseIds.length) {
        return setRunError('Could not load every case in this plan. Retry before starting the run.');
      }
      const assignments = Object.fromEntries(selectedPlan.cases.flatMap(testCase => {
        const selected = caseAssignments[testCase._id] || testerId;
        return selected ? [[testCase._id, selected]] : [];
      }));
      const run = await startRun.mutateAsync({ planId: runPlanId, build: build.trim(), environment: environment.trim(), platform: platform || undefined, assignments });
      setRunPlanId('');
      setTesterId('');
      setCaseAssignments({});
      toast.success('Test run started');
      router.push(`/workspace/${workspaceId}/quality/runs/${run._id}?projectId=${encodeURIComponent(projectId || "")}`);
    } catch (caught: any) { setRunError(caught?.response?.data?.message || 'Could not start this run.'); }
  };

  return <main className="mx-auto min-w-0 max-w-6xl space-y-6 px-4 py-6 sm:px-8">
    <div><Link href={`/workspace/${workspaceId}/quality`} className="inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Quality</Link><div className="mt-3 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-start"><div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight">Plans & runs</h1><p className="mt-1 text-sm text-muted-foreground">Choose cases once, then test each build in its own run.</p></div>{caps.data?.canManagePlan && <Button className="min-h-11 w-full sm:w-auto" onClick={() => setCreateOpen(true)}><Plus className="mr-1.5 h-4 w-4" />New plan</Button>}</div></div>
    <div className="space-y-3"><h2 className="text-sm font-semibold">Plans</h2>{plans.isError ? <p role="alert" className="text-sm text-destructive">Could not load plans.</p> : plans.isLoading ? <p className="text-sm text-muted-foreground">Loading plans…</p> : <div className="divide-y rounded-xl border bg-card">{plans.data?.data.map(plan => <div key={plan._id} className="flex min-w-0 flex-col items-stretch gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"><div className="min-w-0"><div className="break-words font-medium">{plan.name}</div><p className="text-xs text-muted-foreground">{plan.caseIds.length} cases · {plan.status}</p></div>{caps.data?.canManagePlan && <Button className="min-h-11 w-full sm:w-auto" size="sm" variant="outline" onClick={() => { setRunPlanId(plan._id); setRunError(''); }}>Start run</Button>}</div>)}{!plans.data?.data.length && <p className="p-5 text-sm text-muted-foreground">No plans yet. Start with a few active cases from the library.</p>}</div>}<div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end"><Button className="min-h-11" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button className="min-h-11" size="sm" variant="outline" disabled={page * 30 >= (plans.data?.pagination.total || 0)} onClick={() => setPage(page + 1)}>Next</Button></div></div>
    <div className="space-y-3"><h2 className="text-sm font-semibold">Recent runs</h2><div className="divide-y rounded-xl border bg-card">{runs.data?.data.map(run => <Link key={run._id} href={`/workspace/${workspaceId}/quality/runs/${run._id}?projectId=${encodeURIComponent(projectId || "")}`} className="flex min-w-0 items-start justify-between gap-3 p-3 hover:bg-muted/30 sm:items-center sm:gap-4 sm:p-4"><div className="min-w-0"><div className="break-words font-medium">Build {run.build}</div><p className="break-words text-xs text-muted-foreground">{run.environment} · {new Date(run.createdAt).toLocaleDateString()}</p></div><span className="shrink-0 text-xs capitalize text-muted-foreground">{run.status}</span></Link>)}{!runs.data?.data.length && <p className="p-5 text-sm text-muted-foreground">No runs yet.</p>}</div></div>
    <Sheet open={createOpen} onOpenChange={setCreateOpen}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader className="mb-5"><SheetTitle>New test plan</SheetTitle><SheetDescription>Select non-terminal cases for one release or goal. Your selection persists across pages.</SheetDescription></SheetHeader><PlanEditor cases={(cases.data?.data || []).filter(testCase => !projectSettings.data?.settings.caseStatuses.find(status => status.key === testCase.state)?.terminal)} page={casePage} limit={10} total={cases.data?.pagination.total || 0} onPageChange={setCasePage} onSave={async input => { await createPlan.mutateAsync(input); setCreateOpen(false); toast.success('Plan created'); }} /></SheetContent></Sheet>
    <Sheet open={Boolean(runPlanId)} onOpenChange={open => { if (!open) { setRunPlanId(''); setTesterId(''); setCaseAssignments({}); } }}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md"><SheetHeader className="mb-5"><SheetTitle>Start a run</SheetTitle><SheetDescription>Results are tied to this build and environment. Selected case revisions are frozen when the run starts.</SheetDescription></SheetHeader><form onSubmit={submitRun} className="space-y-4"><div className="space-y-1.5"><Label htmlFor="run-build">Build</Label><Input id="run-build" value={build} onChange={event => setBuild(event.target.value)} placeholder="1.8.5 or commit SHA" maxLength={120} /></div><div className="space-y-1.5"><Label htmlFor="run-environment">Environment</Label>{projectSettings.data?.settings.run.environments.length ? <select id="run-environment" required className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={environment} onChange={event => setEnvironment(event.target.value)}><option value="">Select environment</option>{projectSettings.data.settings.run.environments.map(value => <option key={value}>{value}</option>)}</select> : <Input id="run-environment" value={environment} onChange={event => setEnvironment(event.target.value)} placeholder="Android 16 · staging" maxLength={240} />}</div>{!!projectSettings.data?.settings.run.platforms.length && <div className="space-y-1.5"><Label htmlFor="run-platform">Platform</Label><select id="run-platform" required className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={platform} onChange={event => setPlatform(event.target.value)}><option value="">Select platform</option>{projectSettings.data.settings.run.platforms.map(value => <option key={value}>{value}</option>)}</select></div>}<div className="space-y-1.5"><Label htmlFor="run-tester">Default tester</Label><select id="run-tester" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={testerId} onChange={event => setTesterId(event.target.value)}><option value="">Each case owner</option>{members.data?.map(member => <option key={member._id} value={member._id}>{member.name} · {member.email}</option>)}</select><p className="text-xs text-muted-foreground">Override individual cases below. Each tester receives one run notification.</p></div><div className="space-y-2"><Label>Cases and testers</Label>{runPlan.isLoading ? <p className="text-sm text-muted-foreground">Loading plan cases…</p> : runPlan.isError ? <p role="alert" className="text-sm text-destructive">Could not load plan cases.</p> : <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border p-2">{runPlan.data?.cases?.map(testCase => <div key={testCase._id} className="space-y-1 rounded-md bg-muted/30 p-2"><div className="text-sm font-medium">{testCase.key} · {testCase.title}</div><select aria-label={`Tester for ${testCase.key}`} className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={caseAssignments[testCase._id] || ''} onChange={event => setCaseAssignments(current => ({ ...current, [testCase._id]: event.target.value }))}><option value="">{testerId ? 'Use default tester' : testCase.owner ? 'Case owner' : 'Unassigned — manager only'}</option>{members.data?.map(member => <option key={member._id} value={member._id}>{member.name} · {member.email}</option>)}</select></div>)}</div>}</div>{runError && <p role="alert" className="text-sm text-destructive">{runError}</p>}<Button type="submit" disabled={startRun.isPending || runPlan.isLoading || runPlan.isError}>Start run</Button></form></SheetContent></Sheet>
  </main>;
}
