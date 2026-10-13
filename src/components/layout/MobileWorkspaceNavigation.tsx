'use client';

import { usePathname } from 'next/navigation';
import { MobileWorkspaceTabBar } from './MobileWorkspaceTabBar';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export function MobileWorkspaceNavigation() {
  const pathname = usePathname();
  const workspaceId = pathname?.match(/^\/workspace\/([^/]+)/)?.[1];
  const hierarchy = useWorkspaceStore((state) => state.hierarchy);

  if (!workspaceId) return null;

  const spaces = hierarchy?.workspaceId === workspaceId ? hierarchy.spaces : [];
  return <MobileWorkspaceTabBar workspaceId={workspaceId} spaces={spaces} />;
}
