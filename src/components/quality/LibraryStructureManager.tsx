'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { QualityOption } from '@/hooks/queries/useQuality';

export function LibraryStructureManager({ workspaceId, modules, suites }: { workspaceId: string; modules: QualityOption[]; suites: QualityOption[] }) {
  const queryClient = useQueryClient();
  const [moduleName, setModuleName] = useState('');
  const [suiteName, setSuiteName] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (kind: 'modules' | 'suites') => {
    const name = (kind === 'modules' ? moduleName : suiteName).trim();
    if (!name) return setError('Enter a name.');
    setBusy(true); setError('');
    try {
      await api.post(`/workspaces/${workspaceId}/quality/${kind}`, { name, ...(kind === 'suites' && moduleId ? { moduleId } : {}) });
      if (kind === 'modules') setModuleName(''); else setSuiteName('');
      await queryClient.invalidateQueries({ queryKey: ['quality', workspaceId, kind] });
    } catch (caught: any) { setError(caught?.response?.data?.message || `Could not create ${kind === 'modules' ? 'module' : 'suite'}.`); }
    finally { setBusy(false); }
  };

  return <details className="rounded-xl border bg-card"><summary className="cursor-pointer px-4 py-3 text-sm font-medium">Organize modules and suites</summary><div className="space-y-5 border-t px-4 py-4 text-sm"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><label htmlFor="qa-module-name" className="font-medium">New module</label><div className="flex gap-2"><Input id="qa-module-name" value={moduleName} onChange={event => setModuleName(event.target.value)} placeholder="Authentication" /><Button type="button" variant="outline" disabled={busy} onClick={() => save('modules')}>Add</Button></div><p className="text-xs text-muted-foreground">{modules.length} modules available</p></div><div className="space-y-2"><label htmlFor="qa-suite-name" className="font-medium">New suite</label><select aria-label="Suite module" className="h-10 w-full rounded-md border bg-background px-3" value={moduleId} onChange={event => setModuleId(event.target.value)}><option value="">No module</option>{modules.map(module => <option key={module._id} value={module._id}>{module.name}</option>)}</select><div className="flex gap-2"><Input id="qa-suite-name" value={suiteName} onChange={event => setSuiteName(event.target.value)} placeholder="Sign-in flows" /><Button type="button" variant="outline" disabled={busy} onClick={() => save('suites')}>Add</Button></div><p className="text-xs text-muted-foreground">{suites.length} suites available</p></div></div>{error && <p role="alert" className="text-destructive">{error}</p>}</div></details>;
}
