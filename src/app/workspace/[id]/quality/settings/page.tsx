'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { usePermissions } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { uniqueBugLists } from '@/lib/quality/bugLists';

type QualitySettings = {
  caseTypes: Array<{ key: string; label: string; enabled: boolean }>;
  caseStatuses: Array<{ key: string; label: string; terminal: boolean }>;
  caseTransitions: Record<string, string[]>;
  caseFields: Array<{ key: string; label: string; type: string; required: boolean; enabled: boolean; options: string[] }>;
  run: { environments: string[]; platforms: string[]; requireFailureReason: boolean; requireFailureEvidence: boolean };
  bugHandoff: { defaultListId: string | null; copyRunContext: boolean };
  notifications: { runAssigned: boolean; failureRecorded: boolean; runClosed: boolean };
  inherited?: boolean;
};

const splitLines = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);

export default function QualitySettingsPage() {
  const workspaceId = useParams().id as string;
  const search = useSearchParams();
  const projectId = search.get('projectId') || 'workspace';
  const { can } = usePermissions();
  const [settings, setSettings] = useState<QualitySettings | null>(null);
  const [projectName, setProjectName] = useState('');
  const [scopeType, setScopeType] = useState<'workspace' | 'folder'>('workspace');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [bugLists, setBugLists] = useState<Array<{ _id: string; name: string; spaceName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/workspaces/${workspaceId}/quality/project-settings`, { params: { projectId } });
      setProjectName(response.data.data.project.name);
      setScopeType(response.data.data.project.scopeType);
      setFolderId(typeof response.data.data.project.folder === 'object' ? response.data.data.project.folder?._id || null : response.data.data.project.folder || null);
      setSettings(response.data.data.settings);
    } catch (caught: any) {
      setError(caught?.response?.data?.message || 'Could not load Quality settings.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [workspaceId, projectId]);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const spaces = (await api.get(`/workspaces/${workspaceId}/spaces`)).data.data as Array<{ _id: string; name: string }>;
        const groups = await Promise.all(spaces.map(async space => {
          const [spaceListsResponse, foldersResponse] = await Promise.all([api.get(`/spaces/${space._id}/lists`), api.get(`/spaces/${space._id}/folders`)]);
          const spaceLists = spaceListsResponse.data.data as Array<{ _id: string; name: string }>;
          const folders = foldersResponse.data.data as Array<{ _id: string; name: string }>;
          const folderGroups = await Promise.all(folders.map(async folder => {
            try {
              const details = (await api.get(`/folders/${folder._id}`)).data.data as { lists?: Array<{ _id: string; name: string }> };
              return (details.lists || []).map(list => ({ ...list, folderId: folder._id }));
            } catch { return []; }
          }));
          const lists: Array<{ _id: string; name: string; folderId?: string }> = [...spaceLists, ...folderGroups.flat()];
          return { space, lists };
        }));
        if (active) {
          const availableLists = groups.flatMap(({ space, lists }) => lists
            .filter(list => !folderId || list.folderId === folderId)
            .map(list => ({ _id: list._id, name: list.name, spaceName: space.name })));
          setBugLists(uniqueBugLists(availableLists));
        }
      } catch { if (active) setBugLists([]); }
    })();
    return () => { active = false; };
  }, [workspaceId, folderId]);

  const update = (patch: Partial<QualitySettings>) => setSettings(current => current ? { ...current, ...patch } : current);
  const save = async () => {
    if (!settings) return;
    setSaving(true); setError('');
    try {
      const path = `/workspaces/${workspaceId}/quality/${scopeType === 'workspace' ? 'settings/defaults' : 'project-settings'}`;
      await api.patch(path, settings, { params: scopeType === 'workspace' ? {} : { projectId } });
      toast.success(scopeType === 'workspace' ? 'Workspace Quality defaults saved' : 'Project Quality settings saved');
      await load();
    } catch (caught: any) {
      const message = caught?.response?.data?.message || 'Could not save Quality settings.';
      setError(message); toast.error(message);
    } finally { setSaving(false); }
  };
  const reset = async () => {
    setSaving(true); setError('');
    try {
      await api.patch(`/workspaces/${workspaceId}/quality/project-settings`, { resetToWorkspaceDefaults: true }, { params: { projectId } });
      toast.success('Project now uses workspace defaults');
      await load();
    } catch (caught: any) { setError(caught?.response?.data?.message || 'Could not reset project settings.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="mx-auto max-w-4xl p-8 text-sm text-muted-foreground">Loading Quality settings…</div>;
  if (!can('MANAGE_SETTINGS')) return <div className="mx-auto max-w-3xl p-8"><h1 className="text-xl font-semibold">Quality settings</h1><p className="mt-2 text-sm text-muted-foreground">You need Manage Settings permission to change Quality configuration.</p></div>;
  if (!settings) return <div className="mx-auto max-w-4xl p-8"><p role="alert" className="text-sm text-destructive">{error || 'Quality settings are unavailable.'}</p><Button className="mt-3" variant="outline" onClick={() => void load()}>Retry</Button></div>;

  const toggleNotification = (key: keyof QualitySettings['notifications']) => update({ notifications: { ...settings.notifications, [key]: !settings.notifications[key] } });
  const setTransitions = (from: string, to: string, checked: boolean) => {
    const current = settings.caseTransitions[from] || [];
    update({ caseTransitions: { ...settings.caseTransitions, [from]: checked ? Array.from(new Set([...current, to])) : current.filter(value => value !== to) } });
  };

  return <main className="mx-auto min-w-0 max-w-4xl space-y-6 px-4 py-6 sm:px-8">
    <header className="flex min-w-0 flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
      <div className="min-w-0"><p className="break-words text-sm text-muted-foreground">Quality project · {scopeType === 'workspace' ? 'Workspace-wide project' : projectName}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Project configuration</h1><p className="mt-1 text-sm text-muted-foreground">Set how cases are written, reviewed, run, and handed off as bugs.</p></div>
      <div className="grid grid-cols-1 gap-2 sm:flex">{scopeType === 'folder' && !settings.inherited && <Button className="min-h-11 w-full sm:min-h-10 sm:w-auto" variant="outline" onClick={reset} disabled={saving}>Use workspace defaults</Button>}<Button className="min-h-11 w-full sm:min-h-10 sm:w-auto" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button></div>
    </header>

    {scopeType === 'folder' && <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">{settings.inherited ? 'This project inherits workspace defaults. Saving changes here creates project-specific overrides.' : 'This project has its own settings. You can restore workspace defaults at any time.'}</div>}
    {error && <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}

    <section className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <div><h2 className="font-semibold">Case types</h2><p className="text-sm text-muted-foreground">Choose the formats your team can create.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">{settings.caseTypes.map((type, index) => <label key={type.key} className="flex items-center gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={type.enabled} onChange={event => update({ caseTypes: settings.caseTypes.map((item, i) => i === index ? { ...item, enabled: event.target.checked } : item) })} /><span className="flex-1">{type.label}</span><span className="text-xs text-muted-foreground">{type.key}</span></label>)}</div>
      <NewNamedItem label="case type" onAdd={item => update({ caseTypes: [...settings.caseTypes, { ...item, enabled: true }] })} disabled={settings.caseTypes.length >= 12} />
    </section>

    <section className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <div><h2 className="font-semibold">Case review workflow</h2><p className="text-sm text-muted-foreground">Case status is separate from the Pass or Fail result recorded during a run.</p></div>
      <div className="space-y-3">{settings.caseStatuses.map((status, index) => <div key={status.key} className="space-y-3 rounded-lg border p-3"><div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><div className="space-y-1"><Label>Status name</Label><Input value={status.label} maxLength={80} onChange={event => update({ caseStatuses: settings.caseStatuses.map((item, i) => i === index ? { ...item, label: event.target.value } : item) })} /></div><div className="space-y-1"><Label>Status key</Label><Input value={status.key} disabled /></div><label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={status.terminal} onChange={event => update({ caseStatuses: settings.caseStatuses.map((item, i) => i === index ? { ...item, terminal: event.target.checked } : item) })} />Terminal</label></div><div className="flex flex-wrap gap-x-4 gap-y-2">{settings.caseStatuses.filter(next => next.key !== status.key).map(next => <label key={next.key} className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={(settings.caseTransitions[status.key] || []).includes(next.key)} onChange={event => setTransitions(status.key, next.key, event.target.checked)} />Can move to {next.label}</label>)}</div></div>)}</div>
      <NewNamedItem label="case status" onAdd={item => { update({ caseStatuses: [...settings.caseStatuses, { ...item, terminal: false }], caseTransitions: { ...settings.caseTransitions, [item.key]: [] } }); }} disabled={settings.caseStatuses.length >= 12} />
    </section>

    <section className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <div><h2 className="font-semibold">Case fields</h2><p className="text-sm text-muted-foreground">Add project-specific information. Required fields are checked when a case is saved.</p></div>
      <div className="space-y-3">{settings.caseFields.map((field, index) => <div key={field.key} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_150px_1fr_auto_auto]"><div className="space-y-1"><Label>Field label</Label><Input value={field.label} maxLength={80} disabled={field.key === 'priority'} onChange={event => update({ caseFields: settings.caseFields.map((item, i) => i === index ? { ...item, label: event.target.value } : item) })} /></div><div className="space-y-1"><Label>Type</Label><select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={field.type} disabled={field.key === 'priority'} onChange={event => update({ caseFields: settings.caseFields.map((item, i) => i === index ? { ...item, type: event.target.value } : item) })}><option value="text">Text</option><option value="number">Number</option><option value="select">Select</option><option value="multiselect">Multi-select</option><option value="checkbox">Checkbox</option><option value="date">Date</option></select></div><div className="space-y-1"><Label>Options (comma-separated)</Label><Input value={(field.options || []).join(', ')} disabled={field.key === 'priority' || !['select', 'multiselect'].includes(field.type)} onChange={event => update({ caseFields: settings.caseFields.map((item, i) => i === index ? { ...item, options: splitLines(event.target.value) } : item) })} /></div><label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={field.required} disabled={field.key === 'priority'} onChange={event => update({ caseFields: settings.caseFields.map((item, i) => i === index ? { ...item, required: event.target.checked } : item) })} />Required</label><label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={field.enabled} onChange={event => update({ caseFields: settings.caseFields.map((item, i) => i === index ? { ...item, enabled: event.target.checked } : item) })} />Enabled</label><p className="text-xs text-muted-foreground sm:col-span-5">Key: {field.key}{field.key === 'priority' ? ' · Built-in field; its type and choices are fixed.' : ''}</p></div>)}</div>
      <NewNamedItem label="case field" onAdd={item => update({ caseFields: [...settings.caseFields, { ...item, type: 'text', required: false, enabled: true, options: [] }] })} disabled={settings.caseFields.length >= 30} />
    </section>

    <section className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <div><h2 className="font-semibold">Test runs</h2><p className="text-sm text-muted-foreground">Give testers consistent environment choices and evidence rules.</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><TextList label="Environments" value={settings.run.environments} onChange={value => update({ run: { ...settings.run, environments: value } })} placeholder="Staging, Production" /><TextList label="Platforms" value={settings.run.platforms} onChange={value => update({ run: { ...settings.run, platforms: value } })} placeholder="Web, Android, iOS" /></div>
      <div className="flex flex-wrap gap-5"><Check label="Require a reason for failed or blocked results" value={settings.run.requireFailureReason} onChange={value => update({ run: { ...settings.run, requireFailureReason: value } })} /><Check label="Require evidence for failed or blocked results" value={settings.run.requireFailureEvidence} onChange={value => update({ run: { ...settings.run, requireFailureEvidence: value } })} /></div>
    </section>

    <section className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <div><h2 className="font-semibold">Bug handoff and notifications</h2><p className="text-sm text-muted-foreground">Keep the failing run context with the developer handoff.</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1"><Label htmlFor="qa-bug-list">Default bug destination (optional)</Label><select id="qa-bug-list" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={settings.bugHandoff.defaultListId || ''} onChange={event => update({ bugHandoff: { ...settings.bugHandoff, defaultListId: event.target.value || null } })}><option value="">Choose when reporting a bug</option>{bugLists.map(list => <option key={list._id} value={list._id}>{list.spaceName} / {list.name}</option>)}</select><p className="text-xs text-muted-foreground">{scopeType === 'folder' ? 'Only lists inside this project folder are available.' : 'Choose a list for the workspace-wide project.'}</p></div><label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={settings.bugHandoff.copyRunContext} onChange={event => update({ bugHandoff: { ...settings.bugHandoff, copyRunContext: event.target.checked } })} />Include build and environment in bug reports</label></div>
      <div className="flex flex-wrap gap-5"><Check label="Notify assigned testers when a run starts" value={settings.notifications.runAssigned} onChange={() => toggleNotification('runAssigned')} /><Check label="Notify the run creator when a failure is recorded" value={settings.notifications.failureRecorded} onChange={() => toggleNotification('failureRecorded')} /><Check label="Notify the run creator when a run closes" value={settings.notifications.runClosed} onChange={() => toggleNotification('runClosed')} /></div>
    </section>
    <div className="flex justify-end"><Button className="min-h-11 w-full sm:w-auto" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button></div>
  </main>;
}

function NewNamedItem({ label, onAdd, disabled }: { label: string; onAdd: (item: { key: string; label: string }) => void; disabled: boolean }) {
  const [value, setValue] = useState('');
  const add = () => {
    const text = value.trim();
    if (!text || disabled) return;
    const key = text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
    if (!key) return;
    onAdd({ key, label: text.slice(0, 80) }); setValue('');
  };
  return <div className="flex min-w-0 gap-2"><Input className="min-w-0" aria-label={`New ${label}`} value={value} onChange={event => setValue(event.target.value)} placeholder={`Add ${label}`} maxLength={80} /><Button className="min-h-11 shrink-0 sm:min-h-10" type="button" variant="outline" onClick={add} disabled={disabled || !value.trim()}>Add</Button></div>;
}

function TextList({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (value: string[]) => void; placeholder: string }) {
  return <div className="space-y-1"><Label>{label}</Label><Textarea value={value.join(', ')} onChange={event => onChange(splitLines(event.target.value))} placeholder={placeholder} rows={2} /></div>;
}

function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-w-0 items-start gap-2 text-sm"><input className="mt-0.5 shrink-0" type="checkbox" checked={value} onChange={event => onChange(event.target.checked)} /><span className="min-w-0">{label}</span></label>;
}
