'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;

  useEffect(() => {
    // Redirect to dashboard (analytics) as the default page
    if (workspaceId) {
      router.replace(`/workspace/${workspaceId}/analytics`);
    }
  }, [workspaceId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
