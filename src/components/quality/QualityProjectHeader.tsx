'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderPlus, Settings2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/store/useAuthStore';

type QualityProject = { _id: string; name: string; scopeType: 'workspace' | 'folder'; folder?: { _id: string; name: string; spaceId: string } | null; space?: string | null };
type Space = { _id: string; name: string };
type Folder = { _id: string; name: string; spaceId: string };

export function QualityProjectHeader() {
  const workspaceId = useParams().id as string;
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [projectId, setProjectId] = useState('workspace');
  const [adding, setAdding] = useState(false);
  const [folderId, setFolderId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const projects = useQuery({
    queryKey: ['quality', workspaceId, 'projects'],
    enabled: Boolean(workspaceId),
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}/quality/projects`)).data.data as QualityProject[],
    staleTime: 30_000,
  });
  const spaces = useQuery({
    queryKey: ['quality', workspaceId, 'project-folder-options'],
    enabled: adding,
    queryFn: async () => {
      const rows = (await api.get(`/workspaces/${workspaceId}/spaces`)).data.data as Space[];
      const nested = await Promise.all(rows.map(async space => ({ space, folders: (await api.get(`/spaces/${space._id}/folders`)).data.data as Folder[] })));
      return nested.flatMap(group => group.folders.map(folder => ({ ...folder, spaceName: group.space.name })));
    },
  });

  const currentProject = useMemo(() => projects.data?.find(item => item._id === projectId) || projects.data?.find(item => item.scopeType === 'workspace'), [projects.data, projectId]);

  useEffect(() => {
    const queryProjectId = new URLSearchParams(window.location.search).get('projectId');
    const storedProjectId = localStorage.getItem(`qualityProject:${workspaceId}`);
    const initial = queryProjectId || storedProjectId;
    if (initial) setProjectId(initial);
  }, [workspaceId]);

  useEffect(() => {
    if (!projects.data?.length) return;
    const known = projects.data.some(item => item._id === projectId);
    const nextId = known ? projectId : projects.data.find(item => item.scopeType === 'workspace')?._id;
    if (!nextId) return;
    setProjectId(nextId);
    localStorage.setItem(`qualityProject:${workspaceId}`, nextId);
    const params = new URLSearchParams(window.location.search);
    if (params.get('projectId') !== nextId) {
      params.set('projectId', nextId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [projects.data, projectId, workspaceId, pathname, router]);

  const selectProject = (nextId: string) => {
    setProjectId(nextId);
    localStorage.setItem(`qualityProject:${workspaceId}`, nextId);
    const params = new URLSearchParams(window.location.search);
    params.set('projectId', nextId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    void queryClient.invalidateQueries({ queryKey: ['quality', workspaceId] });
  };

  const createProject = async () => {
    if (!folderId) return setError('Choose a folder.');
    setSaving(true); setError('');
    try {
      const response = await api.post(`/workspaces/${workspaceId}/quality/projects`, { folderId, name: projectName.trim() || undefined });
      const created = response.data.data as QualityProject;
      await queryClient.invalidateQueries({ queryKey: ['quality', workspaceId, 'projects'] });
      setAdding(false); setFolderId(''); setProjectName('');
      selectProject(created._id);
    } catch (caught: any) {
      setError(caught?.response?.data?.message || 'Could not create this project.');
    } finally { setSaving(false); }
  };

  return <div className="border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-8">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">QA project</span>
        <select aria-label="Quality project" className="h-10 min-w-48 max-w-[min(70vw,360px)] rounded-md border border-input bg-background px-3 text-sm font-semibold" value={currentProject?._id || projectId} onChange={event => selectProject(event.target.value)}>
          {(projects.data || []).map(project => <option key={project._id} value={project._id}>{project.scopeType === 'workspace' ? 'Workspace project' : project.name}</option>)}
        </select>
        {currentProject?.scopeType === 'folder' && currentProject.folder && <span className="hidden truncate text-xs text-muted-foreground md:inline">Folder: {currentProject.folder.name}</span>}
      </div>
      <div className="flex gap-2">
        {can('MANAGE_SETTINGS') && <Button variant="outline" size="sm" onClick={() => { setAdding(value => !value); setError(''); }}><FolderPlus className="mr-1.5 h-4 w-4" />Add project</Button>}
        {can('MANAGE_SETTINGS') && <Button variant="ghost" size="sm" onClick={() => router.push(`/workspace/${workspaceId}/quality/settings?projectId=${encodeURIComponent(projectId)}`)}><Settings2 className="mr-1.5 h-4 w-4" />QA settings</Button>}
      </div>
    </div>
    {adding && <div className="mx-auto mt-3 grid max-w-6xl gap-2 rounded-lg border bg-card p-3 sm:grid-cols-[1fr_1fr_auto]"><select aria-label="Project folder" className="h-10 rounded-md border bg-background px-3 text-sm" value={folderId} onChange={event => setFolderId(event.target.value)}><option value="">Select a Folder in a Space</option>{(spaces.data || []).map(folder => <option key={folder._id} value={folder._id}>{folder.spaceName} / {folder.name}</option>)}</select><input aria-label="QA project name" className="h-10 rounded-md border bg-background px-3 text-sm" value={projectName} onChange={event => setProjectName(event.target.value)} placeholder="Project name (defaults to folder name)" maxLength={120} /><Button onClick={createProject} disabled={saving || spaces.isLoading}>{saving ? 'Creating…' : 'Create project'}</Button>{(error || spaces.isError) && <p role="alert" className="text-sm text-destructive sm:col-span-3">{error || 'Could not load folders.'}</p>}</div>}
  </div>;
}
