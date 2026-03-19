'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { usePermissions } from '@/store/useAuthStore';
import FeedbackForm from '@/components/feedback/FeedbackForm';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export default function FeedbackPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const { isAdmin } = usePermissions();

  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkspaceDetails();
  }, [workspaceId]);

  const fetchWorkspaceDetails = async () => {
    try {
      setError(null);
      const response = await api.get(`/workspaces/${workspaceId}`);
      setWorkspaceName(response.data.data.name);
    } catch (error: any) {
      console.error('Failed to fetch workspace details:', error);
      setError(error.response?.data?.message || 'Failed to load workspace details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if user is admin or owner
  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Feedback & Support</h1>
              </div>
            </div>
          </div>
        </header>

        {/* Permission Error */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-destructive mb-2">Access Denied</h3>
              <p className="text-sm text-muted-foreground">
                You need to be an admin or owner to access the Feedback & Support page.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Feedback & Support</h1>
              <p className="text-sm text-muted-foreground">
                Share your feedback and get support from our team
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Feedback Form */}
        <FeedbackForm workspaceId={workspaceId} workspaceName={workspaceName} />
      </main>
    </div>
  );
}
