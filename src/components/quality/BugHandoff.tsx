'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

type VerificationRetest = {
  _id: string;
  caseKey: string;
  snapshot?: { title?: string };
  run?: { build?: string; environment?: string; platform?: string } | string;
  updatedAt?: string;
};

const labels: Record<BugAction, string> = {
  start: 'Start work', ready_for_qa: 'Ready for QA', verify: 'Verify fix', reopen: 'Reopen bug', close_without_fix: 'Close without fix',
};

function RetestOption({ retest }: { retest: VerificationRetest }) {
  const run = typeof retest.run === 'object' ? retest.run : undefined;
  return <div className="min-w-0 w-full">
    <p className="truncate font-medium">{retest.caseKey} · {retest.snapshot?.title || 'Test case'}</p>
    <p className="truncate text-xs text-muted-foreground">Build {run?.build || '—'} · {run?.environment || 'Environment not set'}{run?.platform ? ` · ${run.platform}` : ''}</p>
  </div>;
}

export function BugHandoff({ taskId, workspaceId, listId, status, assigneeId, currentUserId, onChanged }: Props) {
  const [capabilities, setCapabilities] = useState<{ qualityEnabled?: boolean; canTriageBug?: boolean; canVerifyBug?: boolean } | null>(null);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState<BugAction | null>(null);
  const [error, setError] = useState('');
  const [retests, setRetests] = useState<VerificationRetest[]>([]);
  const [retestsLoading, setRetestsLoading] = useState(false);
  const [retestsError, setRetestsError] = useState('');
  const [canVerifyThisBug, setCanVerifyThisBug] = useState<boolean | null>(null);
  const [verificationBlockedReason, setVerificationBlockedReason] = useState('');
  const [executionId, setExecutionId] = useState('');
  const [availableRetests, setAvailableRetests] = useState<VerificationRetest[]>([]);
  const [availableExecutionId, setAvailableExecutionId] = useState('');
  const [linkingRetest, setLinkingRetest] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState('');
  const [retestsRefreshVersion, setRetestsRefreshVersion] = useState(0);

  useEffect(() => {
    let active = true;
    api.get(`/workspaces/${workspaceId}/quality/capabilities`, { params: { listId } })
      .then(response => { if (active) setCapabilities(response.data?.data || null); })
      .catch(() => { if (active) setCapabilities(null); });
    return () => { active = false; };
  }, [workspaceId, listId]);

  useEffect(() => {
    let active = true;
    setRetests([]);
    setAvailableRetests([]);
    setExecutionId('');
    setAvailableExecutionId('');
    setCanVerifyThisBug(null);
    setVerificationBlockedReason('');
    setRetestsError('');
    if (status !== 'review' || !capabilities?.canVerifyBug) return () => { active = false; };

    setRetestsLoading(true);
    api.get(`/tasks/${taskId}/quality-retests`)
      .then(response => {
        if (!active) return;
        const data = response.data?.data;
        setRetests(Array.isArray(data?.retests) ? data.retests : []);
        setAvailableRetests(Array.isArray(data?.availableRetests) ? data.availableRetests : []);
        setCanVerifyThisBug(Boolean(data?.canVerify));
        setVerificationBlockedReason(typeof data?.verificationBlockedReason === 'string' ? data.verificationBlockedReason : 'The person who handled the fix cannot verify it.');
      })
      .catch((caught: any) => {
        if (active) setRetestsError(caught?.response?.data?.message || 'Could not load passing retests for this bug.');
      })
      .finally(() => { if (active) setRetestsLoading(false); });
    return () => { active = false; };
  }, [taskId, status, capabilities?.canVerifyBug, retestsRefreshVersion]);

  useEffect(() => {
    setLinkSuccess('');
  }, [taskId, status]);

  if (capabilities && !capabilities.qualityEnabled) {
    return null;
  }

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
    if (action === 'verify' && !executionId) {
      setError('Select a linked passing retest before verifying this fix.');
      return;
    }
    setPending(action);
    setError('');
    try {
      await api.post(`/tasks/${taskId}/quality-transition`, {
        action, reason: reason.trim() || undefined,
        idempotencyKey: crypto.randomUUID(),
        ...(action === 'verify' ? { executionId } : {}),
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
  const selectedRetest = retests.find(retest => retest._id === executionId);
  const selectedAvailableRetest = availableRetests.find(retest => retest._id === availableExecutionId);
  const selectedRun = selectedRetest && typeof selectedRetest.run === 'object' ? selectedRetest.run : undefined;
  const linkRetest = async () => {
    if (!availableExecutionId) return;
    setLinkingRetest(true);
    setError('');
    setLinkSuccess('');
    try {
      await api.post(`/tasks/${taskId}/quality-retests/${availableExecutionId}`);
      setAvailableExecutionId('');
      setLinkSuccess('Passing retest linked. Select it above to verify the fix.');
      setRetestsRefreshVersion(version => version + 1);
      await onChanged();
    } catch (caught: any) {
      setError(caught?.response?.data?.message || 'Could not link this passing retest.');
    } finally {
      setLinkingRetest(false);
    }
  };
  return <section className="space-y-3 rounded-lg border p-4" aria-label="Bug handoff">
    <div><h3 className="text-sm font-semibold">Handoff</h3><p className="text-xs text-muted-foreground">Record the fix or retest result so the next person has context.</p></div>
    {actions.includes('verify') && <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-3"><Label htmlFor="bug-verification-retest">Passing retest</Label><Button type="button" size="sm" variant="outline" disabled={retestsLoading} onClick={() => setRetestsRefreshVersion(version => version + 1)}>Refresh</Button></div>
      {retestsLoading ? <p className="text-xs text-muted-foreground">Loading linked passing retests…</p> : <Select value={executionId} onValueChange={setExecutionId} disabled={Boolean(retestsError) || canVerifyThisBug === false || retests.length === 0}>
        <SelectTrigger id="bug-verification-retest" aria-label="Passing retest" className="w-full min-w-0"><SelectValue placeholder="Select a passing retest">{selectedRetest && <span className="block truncate">{selectedRetest.caseKey} · {selectedRetest.snapshot?.title || 'Test case'}</span>}</SelectValue></SelectTrigger>
        <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
          {retests.map(retest => <SelectItem key={retest._id} value={retest._id} className="py-2"><RetestOption retest={retest} /></SelectItem>)}
        </SelectContent>
      </Select>}
      {canVerifyThisBug === false && <p className="text-xs text-destructive">{verificationBlockedReason}. {verificationBlockedReason.startsWith('Record who') ? 'Assign the developer or record a Ready for QA handoff first.' : 'Ask another QA verifier.'}</p>}
      {!retestsLoading && !retestsError && canVerifyThisBug !== false && retests.length === 0 && availableRetests.length === 0 && <p className="text-xs text-muted-foreground">No passing result is available for this case yet. Record a passing result in a test run first.</p>}
      {selectedRetest && <p className="text-xs text-muted-foreground">Build {selectedRun?.build || '—'} · {selectedRun?.environment || 'Environment not set'}{selectedRun?.platform ? ` · ${selectedRun.platform}` : ''}</p>}
      {availableRetests.length > 0 && <div className="space-y-2 rounded-md border p-3">
        <div><Label htmlFor="bug-available-retest">Link a passing result</Label><p className="mt-1 text-xs text-muted-foreground">Choose the passing execution for this bug’s test case. It will then appear in the selector above.</p></div>
        <Select value={availableExecutionId} onValueChange={setAvailableExecutionId} disabled={canVerifyThisBug === false || linkingRetest}>
          <SelectTrigger id="bug-available-retest" aria-label="Link a passing result" className="w-full min-w-0"><SelectValue placeholder="Choose a passing result">{selectedAvailableRetest && <span className="block truncate">{selectedAvailableRetest.caseKey} · {selectedAvailableRetest.snapshot?.title || 'Test case'}</span>}</SelectValue></SelectTrigger>
          <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
            {availableRetests.map(retest => <SelectItem key={retest._id} value={retest._id} className="py-2"><RetestOption retest={retest} /></SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="button" size="sm" variant="outline" disabled={!availableExecutionId || linkingRetest || canVerifyThisBug === false} onClick={linkRetest}>{linkingRetest ? 'Linking…' : 'Link passing retest'}</Button>
      </div>}
      {linkSuccess && <p role="status" className="text-xs text-emerald-600">{linkSuccess}</p>}
      {retestsError && <p role="alert" className="text-xs text-destructive">{retestsError}</p>}
    </div>}
    {actions.some(action => ['verify', 'reopen', 'close_without_fix'].includes(action)) && <div className="space-y-1"><Label htmlFor="bug-handoff-note">{actions.includes('verify') ? 'Verification note' : 'Retest or closure note'}</Label><Textarea id="bug-handoff-note" rows={2} value={reason} onChange={event => setReason(event.target.value)} maxLength={2000} /></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2">{actions.map(action => <Button key={action} size="sm" variant={action === 'verify' ? 'default' : 'outline'} disabled={pending !== null || (action === 'verify' && (retestsLoading || canVerifyThisBug === false || !executionId))} onClick={() => act(action)}>{pending === action ? 'Saving…' : labels[action]}</Button>)}</div>
  </section>;
}
