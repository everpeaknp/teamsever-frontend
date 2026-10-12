'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export type QualityProject = { _id: string; name: string; scopeType: 'workspace' | 'folder'; folder?: { _id: string; name: string; spaceId: string } | null; space?: string | null };
type QualityProjectContextValue = {
  projects: QualityProject[];
  project: QualityProject | undefined;
  projectId: string | undefined;
  ready: boolean;
  hydrated: boolean;
  loading: boolean;
  error: boolean;
  retry: () => void;
  selectProject: (projectId: string) => void;
};
const QualityProjectContext = createContext<QualityProjectContextValue | null>(null);

export function QualityProjectProvider({ children }: { children: React.ReactNode }) {
  const workspaceId = useParams().id as string;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlProjectId = searchParams.get('projectId');
  const [selectedId, setSelectedId] = useState<string>();
  const selectedIdRef = useRef<string>();
  const [hydrated, setHydrated] = useState(false);
  const projectsQuery = useQuery({
    queryKey: ['quality', workspaceId, 'projects'],
    enabled: Boolean(workspaceId),
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}/quality/projects`)).data.data as QualityProject[],
    staleTime: 30_000,
  });
  const projects = projectsQuery.data || [];
  const workspaceProject = projects.find(project => project.scopeType === 'workspace');

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated || !projectsQuery.data) return;
    const storedId = localStorage.getItem(`qualityProject:${workspaceId}`) || undefined;
    const isValid = (id?: string | null) => Boolean(id && projects.some(project => project._id === id));
    const requestedId = isValid(urlProjectId) ? urlProjectId! : isValid(selectedIdRef.current) ? selectedIdRef.current! : isValid(storedId) ? storedId! : undefined;
    const nextId = requestedId || workspaceProject?._id;
    if (!nextId) return;
    setSelectedId(nextId);
    selectedIdRef.current = nextId;
    localStorage.setItem(`qualityProject:${workspaceId}`, nextId);
    if (urlProjectId !== nextId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('projectId', nextId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [hydrated, projectsQuery.data, projects, workspaceProject?._id, workspaceId, urlProjectId, pathname, router, searchParams]);

  const selectProject = useCallback((nextId: string) => {
    if (!projects.some(project => project._id === nextId)) return;
    setSelectedId(nextId);
    selectedIdRef.current = nextId;
    localStorage.setItem(`qualityProject:${workspaceId}`, nextId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('projectId', nextId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [projects, workspaceId, pathname, router, searchParams]);

  const project = projects.find(item => item._id === selectedId);
  const retry = useCallback(() => { void projectsQuery.refetch(); }, [projectsQuery.refetch]);
  const value = useMemo(() => ({ projects, project, projectId: project?._id, ready: Boolean(project), hydrated, loading: projectsQuery.isLoading, error: projectsQuery.isError, retry, selectProject }), [projects, project, hydrated, projectsQuery.isLoading, projectsQuery.isError, retry, selectProject]);
  return <QualityProjectContext.Provider value={value}>{children}</QualityProjectContext.Provider>;
}

export function useQualityProject() {
  const value = useContext(QualityProjectContext);
  if (!value) throw new Error('useQualityProject must be used inside QualityProjectProvider');
  return value;
}
