'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { initializeSocket, joinWorkspace } from '@/lib/socket';
import "react-day-picker/dist/style.css";

import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const workspaceId = params.id as string;
  const router = useRouter();

  useEffect(() => {
    if (workspaceId === 'undefined') {
      router.push('/dashboard');
      return;
    }
  }, [workspaceId, router]);

  useEffect(() => {
    // Initialize socket connection for the workspace
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    
    if (!token) {
      console.warn('[Workspace Layout] No auth token found');
      return;
    }

    try {
      console.log('[Workspace Layout] Initializing socket for workspace:', workspaceId);
      const socket = initializeSocket(token);
      
      if (workspaceId && workspaceId !== 'undefined') {
        joinWorkspace(workspaceId);
        console.log('[Workspace Layout] Joined workspace room:', workspaceId);
      }
    } catch (error) {
      console.error('[Workspace Layout] Failed to initialize socket:', error);
    }
  }, [workspaceId]);

  return (
    <ErrorBoundary>
      <>{children}</>
    </ErrorBoundary>
  );
}
