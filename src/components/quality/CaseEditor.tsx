'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type CaseStep = { action: string; testData?: string; expectedResult: string };
export type CaseDraft = {
  title: string;
  moduleId?: string;
  suiteId?: string;
  owner?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'manual' | 'automated';
  state: 'draft' | 'active' | 'retired';
  preconditions?: string;
  steps: CaseStep[];
  linkedTaskIds?: string[];
};
export type QualityCase = CaseDraft & { _id: string; key: string; currentRevision: number; updatedAt?: string };

type Props = {
  value?: QualityCase;
  modules?: Array<{ _id: string; name: string }>;
  suites?: Array<{ _id: string; name: string }>;
  onSave: (draft: CaseDraft, expectedRevision?: number) => Promise<unknown>;
  onCancel: () => void;
};

const blank: CaseDraft = { title: '', priority: 'medium', type: 'manual', state: 'draft', preconditions: '', steps: [{ action: '', testData: '', expectedResult: '' }] };

export function CaseEditor({ value, modules = [], suites = [], onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<CaseDraft>(() => value ? { ...value, steps: value.steps.map(step => ({ ...step })) } : blank);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value ? { ...value, steps: value.steps.map(step => ({ ...step })) } : { ...blank, steps: [{ ...blank.steps[0] }] });
    setError('');
  }, [value?._id, value?.currentRevision]);

  const setStep = (index: number, patch: Partial<CaseStep>) => {
    setDraft(previous => ({ ...previous, steps: previous.steps.map((step, position) => position === index ? { ...step, ...patch } : step) }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) return setError('Add a case title.');
    if (!draft.steps.length || draft.steps.some(step => !step.action.trim() || !step.expectedResult.trim())) {
      return setError('Each step needs an action and expected result.');
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ ...draft, title: draft.title.trim(), steps: draft.steps.map(step => ({ action: step.action.trim(), testData: step.testData?.trim() || '', expectedResult: step.expectedResult.trim() })) }, value?.currentRevision);
    } catch (caught: any) {
      setError(caught?.response?.status === 409
        ? 'This case changed while you were editing. Your input is preserved; compare it with the latest revision before retrying.'
        : caught?.response?.data?.message || 'Could not save this case. Your input is preserved.');
    } finally {
      setSaving(false);
    }
  };

  return <form onSubmit={save} className="space-y-5">
    <div className="space-y-1.5"><Label htmlFor="case-title">Case title</Label><Input id="case-title" value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} maxLength={240} placeholder="Existing user can sign in with Google" /></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="case-module">Module</Label><select id="case-module" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.moduleId || ''} onChange={event => setDraft({ ...draft, moduleId: event.target.value || undefined })}><option value="">No module</option>{modules.map(module => <option key={module._id} value={module._id}>{module.name}</option>)}</select></div>
      <div className="space-y-1.5"><Label htmlFor="case-suite">Suite</Label><select id="case-suite" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.suiteId || ''} onChange={event => setDraft({ ...draft, suiteId: event.target.value || undefined })}><option value="">No suite</option>{suites.map(suite => <option key={suite._id} value={suite._id}>{suite.name}</option>)}</select></div>
      <div className="space-y-1.5"><Label htmlFor="case-priority">Priority</Label><select id="case-priority" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.priority} onChange={event => setDraft({ ...draft, priority: event.target.value as CaseDraft['priority'] })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
      <div className="space-y-1.5"><Label htmlFor="case-state">State</Label><select id="case-state" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.state} onChange={event => setDraft({ ...draft, state: event.target.value as CaseDraft['state'] })}><option value="draft">Draft</option><option value="active">Active</option><option value="retired">Retired</option></select></div>
    </div>
    <div className="space-y-1.5"><Label htmlFor="case-preconditions">Preconditions</Label><Textarea id="case-preconditions" rows={2} value={draft.preconditions || ''} onChange={event => setDraft({ ...draft, preconditions: event.target.value })} maxLength={8000} placeholder="Use a named test account or fixture; do not paste credentials." /></div>
    <div className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">Steps</h3><p className="text-xs text-muted-foreground">The order here is retained in every saved revision.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setDraft({ ...draft, steps: [...draft.steps, { action: '', testData: '', expectedResult: '' }] })}>Add step</Button></div>
      {draft.steps.map((step, index) => <div key={index} className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted-foreground">Step {index + 1}</span><Button type="button" variant="ghost" size="sm" disabled={draft.steps.length === 1} onClick={() => setDraft({ ...draft, steps: draft.steps.filter((_, position) => position !== index) })}>Remove</Button></div>
        <div className="space-y-1"><Label htmlFor={`case-action-${index}`}>Step {index + 1} action</Label><Textarea id={`case-action-${index}`} rows={2} value={step.action} onChange={event => setStep(index, { action: event.target.value })} maxLength={4000} /></div>
        <div className="space-y-1"><Label htmlFor={`case-data-${index}`}>Test data (optional)</Label><Input id={`case-data-${index}`} value={step.testData || ''} onChange={event => setStep(index, { testData: event.target.value })} maxLength={4000} /></div>
        <div className="space-y-1"><Label htmlFor={`case-expected-${index}`}>Step {index + 1} expected result</Label><Textarea id={`case-expected-${index}`} rows={2} value={step.expectedResult} onChange={event => setStep(index, { expectedResult: event.target.value })} maxLength={4000} /></div>
      </div>)}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save case'}</Button></div>
  </form>;
}
