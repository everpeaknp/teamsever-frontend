'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { QualityCase } from './CaseEditor';

type QuickChange = Pick<QualityCase, 'title' | 'priority' | 'state'>;
type Props = {
  cases: QualityCase[];
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onOpen: (testCase: QualityCase) => void;
  onQuickSave?: (testCase: QualityCase, change: QuickChange) => Promise<unknown>;
  caseStatuses?: Array<{ key: string; label: string }>;
  caseTransitions?: Record<string, string[]>;
  caseFields?: Array<{ key: string; label: string; enabled: boolean }>;
};

export function CaseGrid({ cases, page, limit, total, onPageChange, onOpen, onQuickSave, caseStatuses = [], caseTransitions = {}, caseFields = [] }: Props) {
  const [editing, setEditing] = useState<QualityCase | null>(null);
  const [draft, setDraft] = useState<QuickChange | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const start = total ? (page - 1) * limit + 1 : 0;
  const end = Math.min(page * limit, total);
  const beginEdit = (testCase: QualityCase) => {
    setEditing(testCase);
    setDraft({ title: testCase.title, priority: testCase.priority, state: testCase.state });
    setError('');
  };
  const cancelEdit = () => { setEditing(null); setDraft(null); setError(''); };
  const save = async () => {
    if (!editing || !draft || !onQuickSave || saving) return;
    if (!draft.title.trim()) return setError('A case title is required.');
    setSaving(true);
    setError('');
    try {
      await onQuickSave(editing, { ...draft, title: draft.title.trim() });
      cancelEdit();
    } catch (caught: any) {
      setError(caught?.response?.status === 409
        ? 'This case changed while you were editing. Your input is preserved; open the case to compare revisions.'
        : caught?.response?.data?.message || 'Could not save this row. Your input is preserved.');
    } finally { setSaving(false); }
  };

  return <div className="overflow-hidden rounded-xl border bg-card">
    <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm">
      <thead className="border-b bg-muted/40 text-xs font-medium text-muted-foreground"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Case</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Revision</th><th className="px-4 py-3">Actions</th></tr></thead>
      <tbody>{cases.map(testCase => {
        const active = editing?._id === testCase._id && draft;
        return <tr key={testCase._id} className="border-b last:border-b-0 hover:bg-muted/30">
          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{testCase.key}</td>
          <td className="px-4 py-3">{active ? <Input aria-label="Case title" value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void save(); } if (event.key === 'Escape') cancelEdit(); }} maxLength={240} /> : <><button type="button" className="text-left font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => onOpen(testCase)}>{testCase.title}</button>{Object.entries(testCase.customFields || {}).filter(([, value]) => value !== undefined && value !== null && value !== '').slice(0, 3).map(([key, value]) => <span key={key} className="ml-2 inline-block text-xs text-muted-foreground">{caseFields.find(field => field.key === key)?.label || key}: {Array.isArray(value) ? value.join(', ') : String(value)}</span>)}</>}</td>
          <td className="px-4 py-3 capitalize">{active ? <select aria-label="Case priority" className="h-9 rounded-md border bg-background px-2" value={draft.priority} onChange={event => setDraft({ ...draft, priority: event.target.value as QuickChange['priority'] })}>{['low', 'medium', 'high', 'urgent'].map(value => <option key={value} value={value}>{value}</option>)}</select> : testCase.priority}</td>
          <td className="px-4 py-3">{active ? <select aria-label="Case state" className="h-9 rounded-md border bg-background px-2" value={draft.state} onChange={event => setDraft({ ...draft, state: event.target.value })}>{caseStatuses.filter(status => status.key === testCase.state || (caseTransitions[testCase.state] || []).includes(status.key)).map(status => <option key={status.key} value={status.key}>{status.label}</option>)}</select> : <Badge variant="outline" className="capitalize">{caseStatuses.find(status => status.key === testCase.state)?.label || testCase.state}</Badge>}</td>
          <td className="px-4 py-3 text-muted-foreground">v{testCase.currentRevision}</td>
          <td className="px-4 py-3">{active ? <div className="flex gap-1"><Button size="sm" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save'}</Button><Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button></div> : onQuickSave ? <Button size="sm" variant="ghost" onClick={() => beginEdit(testCase)}>Edit row</Button> : null}</td>
        </tr>;
      })}</tbody>
    </table></div>
    {error && <div role="alert" className="border-t px-4 py-3 text-sm text-destructive">{error}</div>}
    {!cases.length && <div className="px-5 py-12 text-center text-sm text-muted-foreground">No cases match these filters.</div>}
    <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground"><span>{start}–{end} of {total}</span><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">Previous</Button><Button type="button" size="sm" variant="outline" disabled={page * limit >= total} onClick={() => onPageChange(page + 1)} aria-label="Next page">Next</Button></div></div>
  </div>;
}
