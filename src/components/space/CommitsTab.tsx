'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { Github, GitCommit, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Commit {
  _id: string;
  description: string;
  createdAt: string;
  metadata?: {
    repoName?: string;
    commitMessage?: string;
    author?: string;
    url?: string;
    branch?: string;
    pusher?: string;
  };
}

interface CommitsTabProps {
  spaceId: string;
  workspaceId: string;
  spaceColor: string;
}

export function CommitsTab({ spaceId, workspaceId, spaceColor }: CommitsTabProps) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommits = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/spaces/${spaceId}/commits`, {
        params: {
          limit: 50,
        },
      });
      const data = response.data;
      // Backend returns data in 'data' field
      const activities = data.data || data.activities || data || [];
      setCommits(Array.isArray(activities) ? activities : []);
    } catch (err: any) {
      setError('Failed to load commits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommits();
  }, [spaceId, workspaceId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3 mt-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Github className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchCommits}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-xl">
        <Github className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-1">No commits yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Push a commit to the connected GitHub repository to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Github className="w-5 h-5" style={{ color: spaceColor }} />
          <h2 className="text-base font-semibold">GitHub Commits</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {commits.length}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchCommits}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

        <div className="flex flex-col gap-0">
          {commits.map((commit, index) => {
            const meta = commit.metadata || {};
            return (
              <div key={commit._id} className="relative flex items-start gap-4 pb-5 pl-12">
                {/* Timeline dot */}
                <div
                  className="absolute left-3.5 top-2 w-3 h-3 rounded-full border-2 border-background"
                  style={{ backgroundColor: spaceColor }}
                />

                <div className="flex-1 bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Commit message */}
                      <p className="font-medium text-sm leading-snug truncate">
                        {meta.commitMessage || commit.description}
                      </p>

                      {/* Meta info */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {meta.author && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold uppercase">
                              {meta.author[0]}
                            </span>
                            {meta.author}
                          </span>
                        )}
                        {meta.branch && (
                          <span className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                            <GitCommit className="w-3 h-3" />
                            {meta.branch}
                          </span>
                        )}
                        {meta.repoName && (
                          <span className="text-xs text-muted-foreground">
                            {meta.repoName}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatDate(commit.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Link to GitHub */}
                    {meta.url && (
                      <a
                        href={meta.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title="View on GitHub"
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
