'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/axios';
import type { QualityExecution } from '@/hooks/queries/useQuality';
import { useQualityProject } from '@/components/quality/QualityProjectContext';

type Outcome = QualityExecution['result'];
type StepOutcome = { result: Outcome; actualResult: string };
type Props = { workspaceId: string; execution: QualityExecution; onSave: (input: { executionId: string; expectedVersion: number; result: Outcome; reason: string; stepResults: StepOutcome[]; evidenceIds: string[] }) => Promise<unknown> };

export function ExecutionPlayer({ workspaceId, execution, onSave }: Props) {
  const { projectId } = useQualityProject();
  const [result, setResult] = useState<Outcome>(execution.result);
  const [reason, setReason] = useState(execution.reason || '');
  const [steps, setSteps] = useState<StepOutcome[]>(() => execution.snapshot.steps.map((_, index) => ({ result: execution.stepResults?.[index]?.result as Outcome || 'not_run', actualResult: execution.stepResults?.[index]?.actualResult || '' })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [evidenceIds, setEvidenceIds] = useState<string[]>(execution.evidenceIds || []);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ _id: string; originalName: string; url: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const linkedEvidence = useQuery({
    queryKey: ['quality', workspaceId, projectId, 'executions', execution._id, 'evidence', execution.version],
    enabled: Boolean(projectId),
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}/quality/executions/${execution._id}/evidence`, { params: { projectId } })).data.data as Array<{ _id: string; originalName: string; url: string }>,
  });

  useEffect(() => {
    setResult(execution.result);
    setReason(execution.reason || '');
    setSteps(execution.snapshot.steps.map((_, index) => ({ result: execution.stepResults?.[index]?.result as Outcome || 'not_run', actualResult: execution.stepResults?.[index]?.actualResult || '' })));
    setError('');
    setEvidenceIds(execution.evidenceIds || []);
  }, [execution._id, execution.version]);

  const updateStep = (index: number, patch: Partial<StepOutcome>) => setSteps(previous => previous.map((step, position) => position === index ? { ...step, ...patch } : step));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (['fail', 'blocked'].includes(result) && !reason.trim()) return setError('Add a reason for a failed or blocked result.');
    if (result === 'pass' && steps.some(step => step.result !== 'pass')) return setError('Mark every step Pass before passing the case.');
    setError('');
    setSaving(true);
    try { await onSave({ executionId: execution._id, expectedVersion: execution.version, result, reason: reason.trim(), stepResults: steps, evidenceIds }); }
    catch (caught: any) { setError(caught?.response?.status === 409 ? 'This result changed while you were editing. Your input is preserved; reload and compare before retrying.' : caught?.response?.data?.message || 'Could not save this result. Your input is preserved.'); }
    finally { setSaving(false); }
  };
  const uploadEvidence = async (file: File) => {
    if (!projectId) return setError('Wait for the QA project to load, then try again.');
    setUploading(true); setError('');
    try {
      const form = new FormData(); form.append('file', file);
      const response = await api.post(`/workspaces/${workspaceId}/quality/executions/${execution._id}/evidence`, form, { params: { projectId } });
      setEvidenceIds(previous => [...previous, response.data.data._id]);
      setUploadedFiles(previous => [...previous, response.data.data]);
    } catch (caught: any) { setError(caught?.response?.data?.message || 'Could not upload evidence. Your result is still here.'); }
    finally { setUploading(false); }
  };

  return <form onSubmit={submit} className="space-y-5">
    <div><div className="font-mono text-xs text-muted-foreground">{execution.caseKey} · revision {execution.revision}</div><h2 className="mt-1 text-lg font-semibold">{execution.snapshot.title}</h2>{execution.snapshot.preconditions && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">Preconditions: {execution.snapshot.preconditions}</p>}</div>
    <div className="space-y-3">{execution.snapshot.steps.map((step, index) => <div key={index} className="space-y-3 rounded-lg border p-3"><div className="text-xs font-semibold text-muted-foreground">Step {index + 1}</div><p className="whitespace-pre-wrap text-sm">{step.action}</p>{step.testData && <p className="text-xs text-muted-foreground">Data: {step.testData}</p>}<p className="text-sm"><span className="font-medium">Expected:</span> {step.expectedResult}</p><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label htmlFor={`step-result-${index}`}>Step {index + 1} result</Label><select id={`step-result-${index}`} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={steps[index]?.result || 'not_run'} onChange={event => updateStep(index, { result: event.target.value as Outcome })}><option value="not_run">Not run</option><option value="pass">Pass</option><option value="fail">Fail</option><option value="blocked">Blocked</option><option value="skipped">Skipped</option></select></div><div className="space-y-1"><Label htmlFor={`step-actual-${index}`}>Actual result</Label><Textarea id={`step-actual-${index}`} rows={2} value={steps[index]?.actualResult || ''} onChange={event => updateStep(index, { actualResult: event.target.value })} maxLength={4000} /></div></div></div>)}</div>
    <div className="space-y-1"><Label htmlFor="execution-result">Overall result</Label><select id="execution-result" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={result} onChange={event => setResult(event.target.value as Outcome)}><option value="not_run">Not run</option><option value="pass">Pass</option><option value="fail">Fail</option><option value="blocked">Blocked</option><option value="skipped">Skipped</option></select></div>
    <div className="space-y-1"><Label htmlFor="execution-reason">Reason</Label><Textarea id="execution-reason" rows={3} value={reason} onChange={event => setReason(event.target.value)} maxLength={4000} placeholder="Required for Fail or Blocked; useful for retests and corrections." /></div>
    <div className="space-y-2"><Label htmlFor="execution-evidence">Evidence</Label><input id="execution-evidence" type="file" className="block w-full text-sm" disabled={uploading} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadEvidence(file); event.target.value = ''; }} /><p className="text-xs text-muted-foreground">{uploading ? 'Uploading…' : `${evidenceIds.length} file${evidenceIds.length === 1 ? '' : 's'} selected`}</p>{linkedEvidence.isError && <p className="text-xs text-destructive">Saved evidence could not be loaded.</p>}{[...(linkedEvidence.data || []), ...uploadedFiles.filter(file => !(linkedEvidence.data || []).some(saved => saved._id === file._id))].map(file => <a key={file._id} href={file.url} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-primary underline underline-offset-2">{file.originalName}</a>)}</div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={saving || uploading}>{saving ? 'Saving…' : 'Save result'}</Button>
  </form>;
}
