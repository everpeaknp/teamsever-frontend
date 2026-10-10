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
import { useQualityCapabilities, useQualityCases, useQualityPlans, useQualityRuns } from '@/hooks/queries/useQuality';
import { useCreateQualityPlan, useStartQualityRun } from '@/hooks/mutations/useQualityMutations';

export default function QualityPlansPage() {
  const workspaceId = useParams().id as string;
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [casePage, setCasePage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [runPlanId, setRunPlanId] = useState('');
  const [build, setBuild] = useState('');
  const [environment, setEnvironment] = useState('');
  const [testerId, setTesterId] = useState('');
  const [runError, setRunError] = useState('');
  const caps = useQualityCapabilities(workspaceId);
  const enabled = Boolean(caps.data?.canViewQuality);
  const plans = useQualityPlans(workspaceId, page, enabled);
  const cases = useQualityCases(workspaceId, { page: casePage, limit: 10, state: 'active' }, enabled && createOpen);
  const runs = useQualityRuns(workspaceId, 1, undefined, enabled);
  const createPlan = useCreateQualityPlan(workspaceId);
  const startRun = useStartQualityRun(workspaceId);
  const members = useQuery({
    queryKey: ['workspace', workspaceId, 'members', 'quality-assignment'],
    enabled: Boolean(runPlanId),
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}/members`)).data.data as Array<{ _id: string; name: string; email: string }>,
  });

  if (caps.isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading Quality…</div>;
  if (caps.isError || !enabled) return <div className="p-8 text-sm">Quality is unavailable in this workspace.</div>;

  const submitRun = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!build.trim() || !environment.trim()) return setRunError('Add both a build and environment.');
    setRunError('');
    try {
      const selectedPlan = plans.data?.data.find(plan => plan._id === runPlanId);
      const assignments = testerId && selectedPlan ? Object.fromEntries(selectedPlan.caseIds.map(caseId => [caseId, testerId])) : undefined;
      const run = await startRun.mutateAsync({ planId: runPlanId, build: build.trim(), environment: environment.trim(), assignments });
      setRunPlanId('');
      toast.success('Test run started');
      router.push(`/workspace/${workspaceId}/quality/runs/${run._id}`);
    } catch (caught: any) { setRunError(caught?.response?.data?.message || 'Could not start this run.'); }
  };

  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-8">
    <div><Link href={`/workspace/${workspaceId}/quality`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Quality</Link><div className="mt-3 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight">Plans & runs</h1><p className="mt-1 text-sm text-muted-foreground">Choose cases once, then test each build in its own run.</p></div>{caps.data?.canManagePlan && <Button onClick={() => setCreateOpen(true)}><Plus className="mr-1.5 h-4 w-4" />New plan</Button>}</div></div>
    <div className="space-y-3"><h2 className="text-sm font-semibold">Plans</h2>{plans.isError ? <p role="alert" className="text-sm text-destructive">Could not load plans.</p> : plans.isLoading ? <p className="text-sm text-muted-foreground">Loading plans…</p> : <div className="divide-y rounded-xl border bg-card">{plans.data?.data.map(plan => <div key={plan._id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><div className="font-medium">{plan.name}</div><p className="text-xs text-muted-foreground">{plan.caseIds.length} cases · {plan.status}</p></div>{caps.data?.canManagePlan && <Button size="sm" variant="outline" onClick={() => { setRunPlanId(plan._id); setRunError(''); }}>Start run</Button>}</div>)}{!plans.data?.data.length && <p className="p-5 text-sm text-muted-foreground">No plans yet. Start with a few active cases from the library.</p>}</div>}<div className="flex justify-end gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={page * 30 >= (plans.data?.pagination.total || 0)} onClick={() => setPage(page + 1)}>Next</Button></div></div>
    <div className="space-y-3"><h2 className="text-sm font-semibold">Recent runs</h2><div className="divide-y rounded-xl border bg-card">{runs.data?.data.map(run => <Link key={run._id} href={`/workspace/${workspaceId}/quality/runs/${run._id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/30"><div><div className="font-medium">Build {run.build}</div><p className="text-xs text-muted-foreground">{run.environment} · {new Date(run.createdAt).toLocaleDateString()}</p></div><span className="text-xs capitalize text-muted-foreground">{run.status}</span></Link>)}{!runs.data?.data.length && <p className="p-5 text-sm text-muted-foreground">No runs yet.</p>}</div></div>
    <Sheet open={createOpen} onOpenChange={setCreateOpen}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader className="mb-5"><SheetTitle>New test plan</SheetTitle><SheetDescription>Select active cases for one release or goal. Your selection persists across pages.</SheetDescription></SheetHeader><PlanEditor cases={cases.data?.data || []} page={casePage} limit={10} total={cases.data?.pagination.total || 0} onPageChange={setCasePage} onSave={async input => { await createPlan.mutateAsync(input); setCreateOpen(false); toast.success('Plan created'); }} /></SheetContent></Sheet>
    <Sheet open={Boolean(runPlanId)} onOpenChange={open => { if (!open) { setRunPlanId(''); setTesterId(''); } }}><SheetContent side="right" className="w-full sm:max-w-md"><SheetHeader className="mb-5"><SheetTitle>Start a run</SheetTitle><SheetDescription>Results are tied to this build and environment. Selected case revisions are frozen when the run starts.</SheetDescription></SheetHeader><form onSubmit={submitRun} className="space-y-4"><div className="space-y-1.5"><Label htmlFor="run-build">Build</Label><Input id="run-build" value={build} onChange={event => setBuild(event.target.value)} placeholder="1.8.5 or commit SHA" maxLength={120} /></div><div className="space-y-1.5"><Label htmlFor="run-environment">Environment</Label><Input id="run-environment" value={environment} onChange={event => setEnvironment(event.target.value)} placeholder="Android 16 · staging" maxLength={240} /></div><div className="space-y-1.5"><Label htmlFor="run-tester">Assign all cases to</Label><select id="run-tester" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={testerId} onChange={event => setTesterId(event.target.value)}><option value="">Each case owner</option>{members.data?.map(member => <option key={member._id} value={member._id}>{member.name} · {member.email}</option>)}</select><p className="text-xs text-muted-foreground">The selected tester will receive one run notification.</p></div>{runError && <p role="alert" className="text-sm text-destructive">{runError}</p>}<Button type="submit" disabled={startRun.isPending}>Start run</Button></form></SheetContent></Sheet>
  </div>;
}
