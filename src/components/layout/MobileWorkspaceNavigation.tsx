'use client';

import { usePathname } from 'next/navigation';
import { MobileWorkspaceTabBar } from './MobileWorkspaceTabBar';

export function MobileWorkspaceNavigation() {
  const pathname = usePathname();
  const workspaceId = pathname?.match(/^\/workspace\/([^/]+)/)?.[1];

  if (!workspaceId) return null;

  return <MobileWorkspaceTabBar workspaceId={workspaceId} />;
}
