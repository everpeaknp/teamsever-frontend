'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type CaseOption = { _id: string; key: string; title: string };
type Props = {
  cases: CaseOption[];
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onSave: (input: { name: string; description: string; caseIds: string[] }) => Promise<unknown>;
};

export function PlanEditor({ cases, page, limit, total, onPageChange, onSave }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toggle = (id: string) => setSelected(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError('Name this plan.');
    if (!selected.length) return setError('Select at least one case.');
    setSaving(true);
    setError('');
    try { await onSave({ name: name.trim(), description: description.trim(), caseIds: selected }); }
    catch (caught: any) { setError(caught?.response?.data?.message || 'Could not create this plan. Your selection is preserved.'); }
    finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="space-y-5">
    <div className="space-y-1.5"><Label htmlFor="plan-name">Plan name</Label><Input id="plan-name" value={name} onChange={event => setName(event.target.value)} maxLength={160} placeholder="October release regression" /></div>
    <div className="space-y-1.5"><Label htmlFor="plan-description">Description (optional)</Label><Textarea id="plan-description" value={description} onChange={event => setDescription(event.target.value)} maxLength={4000} rows={2} /></div>
    <div><div className="mb-2 flex items-center justify-between"><div><h3 className="text-sm font-semibold">Cases</h3><p className="text-xs text-muted-foreground">{selected.length} selected across pages</p></div></div>
      <div className="divide-y rounded-lg border">{cases.map(testCase => <label key={testCase._id} className="flex min-w-0 cursor-pointer items-start gap-3 px-3 py-3 text-sm hover:bg-muted/30"><input type="checkbox" aria-label={`${testCase.key} ${testCase.title}`} checked={selected.includes(testCase._id)} onChange={() => toggle(testCase._id)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" /><span className="shrink-0 font-mono text-xs text-muted-foreground">{testCase.key}</span><span className="min-w-0 break-words">{testCase.title}</span></label>)}{!cases.length && <p className="p-4 text-sm text-muted-foreground">No active cases on this page.</p>}</div>
      <div className="mt-2 grid grid-cols-2 justify-end gap-2 sm:flex"><Button type="button" className="min-h-11" size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button><Button type="button" className="min-h-11" size="sm" variant="outline" disabled={page * limit >= total} onClick={() => onPageChange(page + 1)}>Next</Button></div>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" className="min-h-11" disabled={saving}>{saving ? 'Creating…' : 'Create plan'}</Button>
  </form>;
}
