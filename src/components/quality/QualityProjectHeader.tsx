'use client';

import { useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderPlus, Settings2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/store/useAuthStore';
import { useQualityProject } from '@/components/quality/QualityProjectContext';

type Space = { _id: string; name: string };
type Folder = { _id: string; name: string; spaceId: string };

export function QualityProjectHeader() {
  const workspaceId = useParams().id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { projects: projectList, project, projectId, hydrated, loading: projectsLoading, error: projectsError, retry: retryProjects, selectProject } = useQualityProject();
  const [adding, setAdding] = useState(false);
  const [folderId, setFolderId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const spaces = useQuery({
    queryKey: ['quality', workspaceId, 'project-folder-options'],
    enabled: adding,
    queryFn: async () => {
      const rows = (await api.get(`/workspaces/${workspaceId}/spaces`)).data.data as Space[];
      const nested = await Promise.all(rows.map(async space => ({ space, folders: (await api.get(`/spaces/${space._id}/folders`)).data.data as Folder[] })));
      return nested.flatMap(group => group.folders.map(folder => ({ ...folder, spaceName: group.space.name })));
    },
  });

  const createProject = async () => {
    if (!folderId) return setError('Choose a folder.');
    setSaving(true); setError('');
    try {
      const response = await api.post(`/workspaces/${workspaceId}/quality/projects`, { folderId, name: projectName.trim() || undefined });
      const created = response.data.data as { _id: string };
      await queryClient.invalidateQueries({ queryKey: ['quality', workspaceId, 'projects'] });
      setAdding(false); setFolderId(''); setProjectName('');
      selectProject(created._id);
    } catch (caught: any) {
      setError(caught?.response?.data?.message || 'Could not create this project.');
    } finally { setSaving(false); }
  };

  return <div data-testid="quality-project-header" className="border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-8">
    <div className="mx-auto flex max-w-6xl flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-col gap-1.5 sm:flex-1">
        <label htmlFor="quality-project" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quality scope</label>
        <select id="quality-project" aria-label="Quality scope" className="h-11 w-full min-w-0 max-w-full rounded-md border border-input bg-background px-3 text-sm font-semibold sm:h-10 sm:max-w-[min(70vw,380px)]" value={project?._id || ''} disabled={!projectList.length} onChange={event => selectProject(event.target.value)}>
          {projectsLoading && <option value="">Loading QA projects…</option>}
          {projectsError && <option value="">Could not load QA projects</option>}
          {projectList.map(item => <option key={item._id} value={item._id}>{item.scopeType === 'workspace' ? `Entire workspace · ${item.name}` : item.name}</option>)}
        </select>
        <p className="max-w-full truncate text-xs text-muted-foreground sm:max-w-[min(70vw,420px)]">
          {project?.scopeType === 'folder' && project.folder
            ? `QA cases, plans, runs, and reports for ${project.folder.name}`
            : 'Workspace-level QA data, including older unscoped cases'}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:flex sm:shrink-0">
        {hydrated && can('MANAGE_SETTINGS') && <Button className="min-h-11 w-full sm:min-h-9 sm:w-auto" variant={adding ? 'secondary' : 'outline'} size="sm" onClick={() => { setAdding(value => !value); setError(''); }}><FolderPlus className="mr-1.5 h-4 w-4" />{adding ? 'Close project form' : 'Create folder project'}</Button>}
        {hydrated && can('MANAGE_SETTINGS') && <Button className="min-h-11 w-full sm:min-h-9 sm:w-auto" variant="ghost" size="sm" onClick={() => router.push(`/workspace/${workspaceId}/quality/settings?projectId=${encodeURIComponent(projectId || '')}`)}><Settings2 className="mr-1.5 h-4 w-4" />QA settings</Button>}
      </div>
    </div>
    {projectsError && <div className="mx-auto mt-2 flex max-w-6xl items-center gap-2 text-xs text-destructive"><span>Could not load QA projects.</span><Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={retryProjects}>Retry</Button></div>}
    {adding && <div className="mx-auto mt-3 max-w-6xl rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div><h2 className="text-sm font-semibold">Create a folder-scoped QA project</h2><p className="mt-1 text-xs text-muted-foreground">Choose a folder to keep its cases, plans, test runs, and reports scoped to that project.</p></div>
        <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setError(''); }}>Cancel</Button>
      </div>
      <div className="grid min-w-0 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select aria-label="Project folder" className="h-11 min-w-0 w-full rounded-md border bg-background px-3 text-sm sm:h-10" value={folderId} onChange={event => setFolderId(event.target.value)}><option value="">Select a folder in a space</option>{(spaces.data || []).map(folder => <option key={folder._id} value={folder._id}>{folder.spaceName} / {folder.name}</option>)}</select>
        <input aria-label="QA project name" className="h-11 min-w-0 w-full rounded-md border bg-background px-3 text-sm sm:h-10" value={projectName} onChange={event => setProjectName(event.target.value)} placeholder="Project name (defaults to folder name)" maxLength={120} />
        <Button className="min-h-11" onClick={createProject} disabled={saving || spaces.isLoading || spaces.isError}>{saving ? 'Creating…' : 'Create project'}</Button>
      </div>
      {(error || spaces.isError) && <p role="alert" className="mt-2 flex items-center gap-2 text-sm text-destructive">{error || 'Could not load folders.'}{spaces.isError && <Button variant="link" size="sm" className="h-auto p-0 text-sm" onClick={() => void spaces.refetch()}>Retry</Button>}</p>}
    </div>}
  </div>;
}
