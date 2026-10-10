'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Input = { targetListId?: string; existingBugId?: string; idempotencyKey: string; severity?: string };
type Props = { lists: Array<{ id: string; label: string }>; allowNew?: boolean; onCreate: (input: Input) => Promise<unknown> };

export function FailureBugDialog({ lists, allowNew = true, onCreate }: Props) {
  const [mode, setMode] = useState<'new' | 'existing'>(allowNew ? 'new' : 'existing');
  const [targetListId, setTargetListId] = useState('');
  const [existingBugId, setExistingBugId] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const key = useRef(`qa-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'new' && !targetListId) return setError('Choose the developer list where this bug belongs.');
    if (mode === 'existing' && !existingBugId.trim()) return setError('Enter the existing bug ID.');
    setSaving(true);
    setError('');
    try {
      await onCreate(mode === 'new'
        ? { targetListId, severity, idempotencyKey: key.current }
        : { existingBugId: existingBugId.trim(), idempotencyKey: key.current });
    } catch (caught: any) {
      setError(caught?.response?.data?.message || caught?.message || 'Could not link this bug. Retry is safe.');
    } finally {
      setSaving(false);
    }
  };

  return <form onSubmit={submit} className="space-y-4">
    <p className="text-sm text-muted-foreground">{allowNew ? 'The failed case, expected outcome, actual result, build and environment will be linked to the developer bug.' : 'Link this passing retest to the existing developer bug so QA can verify the fix.'}</p>
    {allowNew && <div className="flex gap-2"><Button type="button" size="sm" variant={mode === 'new' ? 'default' : 'outline'} onClick={() => setMode('new')}>New bug</Button><Button type="button" size="sm" variant={mode === 'existing' ? 'default' : 'outline'} onClick={() => setMode('existing')}>Link existing</Button></div>}
    {mode === 'new' ? <><div className="space-y-1"><Label htmlFor="failure-target-list">Target list</Label><select id="failure-target-list" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={targetListId} onChange={event => setTargetListId(event.target.value)}><option value="">Choose a list</option>{lists.map(list => <option key={list.id} value={list.id}>{list.label}</option>)}</select></div><div className="space-y-1"><Label htmlFor="failure-severity">Severity</Label><select id="failure-severity" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={severity} onChange={event => setSeverity(event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div></> : <div className="space-y-1"><Label htmlFor="existing-bug-id">Existing bug ID</Label><Input id="existing-bug-id" value={existingBugId} onChange={event => setExistingBugId(event.target.value)} placeholder="Paste the bug record ID" /></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={saving}>{saving ? 'Linking…' : mode === 'new' ? 'Create linked bug' : 'Link bug'}</Button>
  </form>;
}
