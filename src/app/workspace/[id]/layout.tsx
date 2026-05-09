'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
    }
  }, [workspaceId, router]);

  return (
    <ErrorBoundary>
      <>{children}</>
    </ErrorBoundary>
  );
}
