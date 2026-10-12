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
  type: string;
  state: string;
  customFields?: Record<string, unknown>;
  preconditions?: string;
  steps: CaseStep[];
  linkedTaskIds?: string[];
};
export type QualityCase = CaseDraft & { _id: string; key: string; currentRevision: number; updatedAt?: string };

type Props = {
  value?: QualityCase;
  modules?: Array<{ _id: string; name: string }>;
  suites?: Array<{ _id: string; name: string }>;
  settings?: { caseTypes: Array<{ key: string; label: string; enabled: boolean }>; caseStatuses: Array<{ key: string; label: string }>; caseFields: Array<{ key: string; label: string; type: string; required: boolean; enabled: boolean; options: string[] }> };
  onSave: (draft: CaseDraft, expectedRevision?: number) => Promise<unknown>;
  onCancel: () => void;
};

const defaultTypes = [{ key: 'manual', label: 'Manual', enabled: true }];
const defaultStatuses = [{ key: 'draft', label: 'Draft' }];

export function CaseEditor({ value, modules = [], suites = [], settings, onSave, onCancel }: Props) {
  const enabledTypes = settings?.caseTypes.filter(item => item.enabled) || defaultTypes;
  const caseTypes = value && !enabledTypes.some(item => item.key === value.type)
    ? [...enabledTypes, { key: value.type, label: `${value.type} (disabled)`, enabled: false }]
    : enabledTypes;
  const caseStatuses = settings?.caseStatuses || defaultStatuses;
  const makeBlank = (): CaseDraft => ({ title: '', priority: 'medium', type: caseTypes[0]?.key || 'manual', state: caseStatuses[0]?.key || 'draft', preconditions: '', steps: [{ action: '', testData: '', expectedResult: '' }], customFields: {} });
  const [draft, setDraft] = useState<CaseDraft>(() => value ? { ...value, steps: value.steps.map(step => ({ ...step })), customFields: { ...(value.customFields || {}) } } : makeBlank());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value ? { ...value, steps: value.steps.map(step => ({ ...step })), customFields: { ...(value.customFields || {}) } } : makeBlank());
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
    const requiredFields = settings?.caseFields.filter(field => field.enabled && field.required && field.key !== 'priority') || [];
    if (requiredFields.some(field => {
      const value = draft.customFields?.[field.key];
      return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    })) return setError(`Complete the required field: ${requiredFields.find(field => { const value = draft.customFields?.[field.key]; return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0); })?.label}`);
    setSaving(true);
    setError('');
    try {
      await onSave({ ...draft, title: draft.title.trim(), steps: draft.steps.map(step => ({ action: step.action.trim(), testData: step.testData?.trim() || '', expectedResult: step.expectedResult.trim() })), customFields: draft.customFields || {} }, value?.currentRevision);
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
      <div className="space-y-1.5"><Label htmlFor="case-type">Case type</Label><select id="case-type" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value })}>{caseTypes.map(type => <option key={type.key} value={type.key} disabled={!type.enabled}>{type.label}</option>)}</select></div>
      <div className="space-y-1.5"><Label htmlFor="case-state">Review status</Label><select id="case-state" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.state} onChange={event => setDraft({ ...draft, state: event.target.value })}>{caseStatuses.map(status => <option key={status.key} value={status.key}>{status.label}</option>)}</select></div>
    </div>
    {!!settings?.caseFields.filter(field => field.enabled && field.key !== 'priority').length && <div className="grid gap-3 sm:grid-cols-2">{settings.caseFields.filter(field => field.enabled && field.key !== 'priority').map(field => <div key={field.key} className="space-y-1.5"><Label htmlFor={`case-custom-${field.key}`}>{field.label}{field.required ? ' *' : ''}</Label>{field.type === 'select' ? <select id={`case-custom-${field.key}`} required={field.required} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={String(draft.customFields?.[field.key] ?? '')} onChange={event => setDraft({ ...draft, customFields: { ...draft.customFields, [field.key]: event.target.value } })}><option value="">Select…</option>{field.options.map(option => <option key={option} value={option}>{option}</option>)}</select> : field.type === 'multiselect' ? <select id={`case-custom-${field.key}`} multiple required={field.required} className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={Array.isArray(draft.customFields?.[field.key]) ? draft.customFields?.[field.key] as string[] : []} onChange={event => setDraft({ ...draft, customFields: { ...draft.customFields, [field.key]: Array.from(event.target.selectedOptions, option => option.value) } })}>{field.options.map(option => <option key={option} value={option}>{option}</option>)}</select> : field.type === 'checkbox' ? <label className="flex h-10 items-center gap-2 text-sm"><input id={`case-custom-${field.key}`} type="checkbox" checked={Boolean(draft.customFields?.[field.key])} onChange={event => setDraft({ ...draft, customFields: { ...draft.customFields, [field.key]: event.target.checked } })} />Yes</label> : <Input id={`case-custom-${field.key}`} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} required={field.required} value={draft.customFields?.[field.key] == null ? '' : String(draft.customFields[field.key])} onChange={event => setDraft({ ...draft, customFields: { ...draft.customFields, [field.key]: field.type === 'number' ? (event.target.value === '' ? '' : Number(event.target.value)) : event.target.value } })} />}</div>)}</div>}
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
