'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { uploadTaskEvidence } from './uploadTaskEvidence';

export type BugDraft = {
  workItemType: 'bug';
  title: string;
  description?: string;
  status: 'todo';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  qaReviewer?: string;
  moduleId?: string;
  bugDetails: {
    reproductionSteps: string;
    expectedResult: string;
    actualResult: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    environment: string;
    build?: string;
  };
};

type Props = {
  onSubmit: (draft: BugDraft) => Promise<string | undefined>;
  onCancel: () => void;
  onComplete?: () => void;
  members?: Array<{ id: string; name: string }>;
};

export function BugForm({ onSubmit, onCancel, onComplete, members = [] }: Props) {
  const [title, setTitle] = useState('');
  const [reproductionSteps, setReproductionSteps] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [environment, setEnvironment] = useState('');
  const [build, setBuild] = useState('');
  const [severity, setSeverity] = useState<BugDraft['bugDetails']['severity']>('medium');
  const [priority, setPriority] = useState<BugDraft['priority']>('medium');
  const [assignee, setAssignee] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [evidence, setEvidence] = useState<File | null>(null);
  const [createdId, setCreatedId] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError('Add a short summary.');
    if (!reproductionSteps.trim()) return setError('Describe how to reproduce the issue.');
    if (!expectedResult.trim()) return setError('Describe the expected result.');
    if (!actualResult.trim()) return setError('Describe the actual result.');
    if (!environment.trim()) return setError('Describe the environment where this happened.');
    setSaving(true);
    setError('');
    let reportedId = createdId;
    try {
      const taskId = createdId || await onSubmit({
        workItemType: 'bug', title: title.trim(), status: 'todo', priority,
        ...(assignee && { assignee }),
        bugDetails: { reproductionSteps: reproductionSteps.trim(), expectedResult: expectedResult.trim(), actualResult: actualResult.trim(), severity, environment: environment.trim(), ...(build.trim() && { build: build.trim() }) },
      });
      reportedId = taskId || '';
      if (taskId) setCreatedId(taskId);
      if (evidence && taskId) await uploadTaskEvidence(taskId, evidence);
      if (evidence && !taskId) throw new Error('Bug created, but the task ID was not returned. Open the bug to attach evidence.');
      onComplete?.();
    } catch (caught: any) {
      setError(reportedId ? `Bug created, but evidence upload failed: ${caught?.response?.data?.message || caught?.message || 'please retry'}. Retry here without creating another bug.` : caught?.response?.data?.message || caught?.message || 'Could not report this bug. Your input is still here.');
    } finally {
      setSaving(false);
    }
  };

  return <form onSubmit={submit} className="space-y-4">
    <div className="space-y-1.5"><Label htmlFor="bug-summary">Summary</Label><Input id="bug-summary" value={title} onChange={event => setTitle(event.target.value)} maxLength={200} placeholder="What went wrong?" /></div>
    <div className="space-y-1.5"><Label htmlFor="bug-steps">Steps to reproduce</Label><Textarea id="bug-steps" value={reproductionSteps} onChange={event => setReproductionSteps(event.target.value)} maxLength={5000} rows={4} placeholder="1. Open…\n2. Select…" /></div>
    <div className="space-y-1.5"><Label htmlFor="bug-expected">Expected result</Label><Textarea id="bug-expected" value={expectedResult} onChange={event => setExpectedResult(event.target.value)} maxLength={3000} rows={2} /></div>
    <div className="space-y-1.5"><Label htmlFor="bug-actual">Actual result</Label><Textarea id="bug-actual" value={actualResult} onChange={event => setActualResult(event.target.value)} maxLength={3000} rows={2} /></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="bug-severity">Severity</Label><select id="bug-severity" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={severity} onChange={event => setSeverity(event.target.value as BugDraft['bugDetails']['severity'])}><option value="low">Low impact</option><option value="medium">Medium impact</option><option value="high">High impact</option><option value="critical">Critical impact</option></select></div>
      <div className="space-y-1.5"><Label htmlFor="bug-priority">Priority</Label><select id="bug-priority" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={priority} onChange={event => setPriority(event.target.value as BugDraft['priority'])}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="bug-environment">Environment</Label><Input id="bug-environment" value={environment} onChange={event => setEnvironment(event.target.value)} maxLength={500} placeholder="Browser / device / OS" /></div>
      <div className="space-y-1.5"><Label htmlFor="bug-build">Build (optional)</Label><Input id="bug-build" value={build} onChange={event => setBuild(event.target.value)} maxLength={100} placeholder="Version or commit" /></div>
    </div>
    {members.length > 0 && <div className="space-y-1.5"><Label htmlFor="bug-assignee">Developer (optional)</Label><select id="bug-assignee" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={assignee} onChange={event => setAssignee(event.target.value)}><option value="">Unassigned</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>}
    <div className="space-y-1.5"><Label htmlFor="bug-evidence">Evidence (optional)</Label><Input id="bug-evidence" type="file" accept="image/*,.pdf,.txt,.doc,.docx" onChange={event => setEvidence(event.target.files?.[0] || null)} /><p className="text-xs text-muted-foreground">A screenshot or file helps the developer verify the issue.</p></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : createdId ? 'Retry evidence upload' : 'Report bug'}</Button></div>
  </form>;
}
