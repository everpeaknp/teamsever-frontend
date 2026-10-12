'use client';

import { useRef, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Input = { targetListId?: string; existingBugId?: string; idempotencyKey: string; severity?: string; assigneeId?: string; dueDate?: string };
type Props = { lists: Array<{ id: string; label: string }>; bugs?: Array<{ id: string; title: string; status: string; listLabel: string }>; members?: Array<{ id: string; label: string }>; bugSearch?: string; onBugSearchChange?: (value: string) => void; bugsLoading?: boolean; bugsError?: boolean; onRetryBugs?: () => void; allowNew?: boolean; defaultListId?: string | null; onCreate: (input: Input) => Promise<unknown> };

export function FailureBugDialog({ lists, bugs = [], members = [], bugSearch = '', onBugSearchChange, bugsLoading = false, bugsError = false, onRetryBugs, allowNew = true, defaultListId, onCreate }: Props) {
  const [mode, setMode] = useState<'new' | 'existing'>(allowNew ? 'new' : 'existing');
  const [targetListId, setTargetListId] = useState(defaultListId || '');
  const [existingBugId, setExistingBugId] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const key = useRef(`qa-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'new' && !targetListId) return setError('Choose the developer list where this bug belongs.');
    if (mode === 'existing' && !existingBugId) return setError('Choose the existing bug to link.');
    setSaving(true);
    setError('');
    try {
      await onCreate(mode === 'new'
        ? { targetListId, severity, idempotencyKey: key.current, ...(assigneeId && { assigneeId }), ...(dueDate && { dueDate }) }
        : { existingBugId, idempotencyKey: key.current });
    } catch (caught: any) {
      setError(caught?.response?.data?.message || caught?.message || 'Could not link this bug. Retry is safe.');
    } finally {
      setSaving(false);
    }
  };

  return <form onSubmit={submit} className="space-y-4">
    <p className="text-sm text-muted-foreground">{allowNew ? 'The failed case, expected outcome, actual result, build and environment will be linked to the developer bug.' : 'Link this passing retest to the existing developer bug so QA can verify the fix.'}</p>
    {allowNew && <div className="flex gap-2"><Button type="button" size="sm" variant={mode === 'new' ? 'default' : 'outline'} onClick={() => setMode('new')}>New bug</Button><Button type="button" size="sm" variant={mode === 'existing' ? 'default' : 'outline'} onClick={() => setMode('existing')}>Link existing</Button></div>}
    {mode === 'new' ? <><div className="space-y-1"><Label htmlFor="failure-target-list">Target list</Label><select id="failure-target-list" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={targetListId} onChange={event => setTargetListId(event.target.value)}><option value="">Choose a list</option>{lists.map(list => <option key={list.id} value={list.id}>{list.label}</option>)}</select><p className="text-xs text-muted-foreground">This is the developer list where the bug will appear.</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1"><Label htmlFor="failure-severity">Severity</Label><select id="failure-severity" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={severity} onChange={event => setSeverity(event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div><div className="space-y-1"><Label htmlFor="failure-assignee">Assignee (optional)</Label><select id="failure-assignee" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={assigneeId} onChange={event => setAssigneeId(event.target.value)}><option value="">Unassigned · team triage</option>{members.map(member => <option key={member.id} value={member.id}>{member.label}</option>)}</select></div></div><div className="space-y-1"><Label htmlFor="failure-due-date">Target fix date (optional)</Label><Input id="failure-due-date" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} /><p className="text-xs text-muted-foreground">Saved as the bug task’s due date. Leave blank if the developer team will set it during triage.</p></div></> : <section className="min-w-0 space-y-3" aria-label="Choose an existing developer bug"><div className="space-y-1"><h3 className="text-sm font-semibold">Choose an existing bug</h3><p className="text-xs text-muted-foreground">Search by title. Results are limited to bugs in this QA project.</p></div><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="existing-bug-search" aria-label="Search bugs" className="pl-9" value={bugSearch} onChange={event => onBugSearchChange?.(event.target.value)} placeholder="Search bugs…" /></div><div role="radiogroup" aria-label="Existing bugs" className="max-h-64 min-w-0 space-y-2 overflow-y-auto pr-1">{bugs.map(bug => { const selectedBug = existingBugId === bug.id; return <button type="button" role="radio" aria-checked={selectedBug} key={bug.id} onClick={() => { setExistingBugId(bug.id); setError(''); }} className={`flex w-full min-w-0 items-start gap-3 rounded-lg border p-3 text-left transition-colors ${selectedBug ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'hover:bg-muted/40'}`}><span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selectedBug ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50'}`}>{selectedBug && <Check aria-hidden="true" className="h-3 w-3" />}</span><span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium">{bug.title}</span><span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"><span className="capitalize">{bug.status.replace('inprogress', 'in progress')}</span><span aria-hidden="true">·</span><span className="break-all">{bug.listLabel}</span></span></span></button>; })}{bugsLoading && <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Searching project bugs…</p>}{bugsError && <div role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">Could not load bugs. <Button type="button" variant="link" size="sm" onClick={onRetryBugs}>Retry</Button></div>}{!bugsLoading && !bugsError && bugs.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No bugs found. Try another title search.</p>}</div></section>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={saving}>{saving ? 'Linking…' : mode === 'new' ? 'Create linked bug' : 'Link bug'}</Button>
  </form>;
}
