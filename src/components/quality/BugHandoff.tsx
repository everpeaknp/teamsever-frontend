'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type BugAction = 'start' | 'ready_for_qa' | 'verify' | 'reopen' | 'close_without_fix';

type Props = {
  taskId: string;
  workspaceId: string;
  listId: string;
  status: 'todo' | 'inprogress' | 'review' | 'done' | 'cancelled';
  assigneeId?: string;
  currentUserId?: string;
  onChanged: () => Promise<unknown> | void;
};

const labels: Record<BugAction, string> = {
  start: 'Start work', ready_for_qa: 'Ready for QA', verify: 'Verify fix', reopen: 'Reopen bug', close_without_fix: 'Close without fix',
};

export function BugHandoff({ taskId, workspaceId, listId, status, assigneeId, currentUserId, onChanged }: Props) {
  const [capabilities, setCapabilities] = useState<{ canTriageBug?: boolean; canVerifyBug?: boolean } | null>(null);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState<BugAction | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get(`/workspaces/${workspaceId}/quality/capabilities`, { params: { listId } })
      .then(response => { if (active) setCapabilities(response.data?.data || null); })
      .catch(() => { if (active) setCapabilities(null); });
    return () => { active = false; };
  }, [workspaceId, listId]);

  const canMoveAsDeveloper = Boolean(assigneeId && assigneeId === currentUserId) || Boolean(capabilities?.canTriageBug);
  const actions: BugAction[] = status === 'todo'
    ? [...(canMoveAsDeveloper ? ['start' as const] : []), ...(capabilities?.canTriageBug ? ['close_without_fix' as const] : [])]
    : status === 'inprogress'
      ? [...(canMoveAsDeveloper ? ['ready_for_qa' as const] : []), ...(capabilities?.canTriageBug ? ['close_without_fix' as const] : [])]
      : status === 'review'
        ? [...(capabilities?.canVerifyBug ? ['verify' as const, 'reopen' as const] : []), ...(capabilities?.canTriageBug ? ['close_without_fix' as const] : [])]
        : status === 'done' && capabilities?.canVerifyBug ? ['reopen'] : [];

  const act = async (action: BugAction) => {
    if (['verify', 'reopen', 'close_without_fix'].includes(action) && !reason.trim()) {
      setError('Add a retest or closure note first.');
      return;
    }
    setPending(action);
    setError('');
    try {
      await api.post(`/tasks/${taskId}/quality-transition`, {
        action, reason: reason.trim() || undefined,
        idempotencyKey: crypto.randomUUID(),
      });
      setReason('');
      await onChanged();
    } catch (caught: any) {
      setError(caught?.response?.data?.message || 'Could not update the bug. Your note is still here.');
    } finally {
      setPending(null);
    }
  };

  if (!actions.length) return null;
  return <section className="space-y-3 rounded-lg border p-4" aria-label="Bug handoff">
    <div><h3 className="text-sm font-semibold">Handoff</h3><p className="text-xs text-muted-foreground">Record the fix or retest result so the next person has context.</p></div>
    {actions.some(action => ['verify', 'reopen', 'close_without_fix'].includes(action)) && <div className="space-y-1"><Label htmlFor="bug-handoff-note">Retest or closure note</Label><Textarea id="bug-handoff-note" rows={2} value={reason} onChange={event => setReason(event.target.value)} maxLength={2000} /></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2">{actions.map(action => <Button key={action} size="sm" variant={action === 'verify' ? 'default' : 'outline'} disabled={pending !== null} onClick={() => act(action)}>{pending === action ? 'Saving…' : labels[action]}</Button>)}</div>
  </section>;
}
