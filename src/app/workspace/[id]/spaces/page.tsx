'use client';

import { useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { SpaceDirectory } from '@/components/space/SpaceDirectory';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useModalStore } from '@/store/useModalStore';
import { usePermissions } from '@/store/useAuthStore';

export default function SpacesPage() {
  const workspaceId = useParams().id as string;
  const hierarchy = useWorkspaceStore((state) => state.hierarchy);
  const loading = useWorkspaceStore((state) => state.loading);
  const error = useWorkspaceStore((state) => state.error);
  const fetchHierarchy = useWorkspaceStore((state) => state.fetchHierarchy);
  const openModal = useModalStore((state) => state.openModal);
  const { can } = usePermissions();
  const isCurrentWorkspace = hierarchy?.workspaceId === workspaceId;

  useEffect(() => {
    if (workspaceId && !isCurrentWorkspace) {
      void fetchHierarchy(workspaceId).catch(() => {});
    }
  }, [workspaceId, isCurrentWorkspace, fetchHierarchy]);

  const retry = useCallback(() => {
    void fetchHierarchy(workspaceId, true).catch(() => {});
  }, [workspaceId, fetchHierarchy]);

  return (
    <SpaceDirectory
      workspaceId={workspaceId}
      workspaceName={isCurrentWorkspace ? hierarchy?.workspaceName : undefined}
      spaces={isCurrentWorkspace ? hierarchy?.spaces ?? [] : []}
      loading={!isCurrentWorkspace && (loading || !error)}
      error={!isCurrentWorkspace ? error : null}
      onRetry={retry}
      canCreateSpace={can('create_space')}
      onCreateSpace={() => {
        if (isCurrentWorkspace && hierarchy) {
          openModal('space', workspaceId, 'workspace', hierarchy.workspaceName);
        }
      }}
    />
  );
}
