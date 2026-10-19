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
  const [selectedRepo, setSelectedRepo] = useState<string>('all');

  // Get unique repo names for filtering
  const repoNames = Array.from(new Set(commits.map(c => c.metadata?.repoName).filter(Boolean))) as string[];

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

  const filteredCommits = selectedRepo === 'all' 
    ? commits 
    : commits.filter(c => c.metadata?.repoName === selectedRepo);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="mb-1 flex min-w-0 items-center justify-between gap-2 sm:mb-2">
        <div className="flex min-w-0 items-center gap-2">
          <Github className="w-5 h-5" style={{ color: spaceColor }} />
          <h2 className="truncate text-base font-semibold">GitHub Commits</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {filteredCommits.length}
          </span>
        </div>
        <Button variant="ghost" size="icon" aria-label="Refresh commits" onClick={fetchCommits} className="min-h-10 min-w-10 shrink-0">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Repo Filter Pills */}
      {repoNames.length > 1 && (
        <div role="group" aria-label="Filter commits by repository" className="mb-1 flex min-w-0 flex-wrap items-center gap-2 sm:mb-2">
          <button
            onClick={() => setSelectedRepo('all')}
            className={`min-h-9 max-w-full rounded-full border px-3 py-1.5 text-xs transition-all ${
              selectedRepo === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-muted-foreground'
            }`}
          >
            All Repos
          </button>
          {repoNames.map(repo => (
            <button
              key={repo}
              onClick={() => setSelectedRepo(repo)}
              className={`min-h-9 max-w-full rounded-full border px-3 py-1.5 text-xs transition-all ${
                selectedRepo === repo
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-muted-foreground'
              }`}
            >
              <span className="block max-w-[65vw] truncate sm:max-w-none">{repo}</span>
            </button>
          ))}
        </div>
      )}

      <div className="relative min-w-0">
        {/* Timeline line */}
        <div className="absolute bottom-0 left-3 top-0 w-px bg-border sm:left-5" />

        <div className="flex flex-col gap-0">
          {filteredCommits.map((commit, index) => {
            const meta = commit.metadata || {};
            return (
              <div key={commit._id} className="relative flex min-w-0 items-start gap-3 pb-4 pl-8 sm:gap-4 sm:pb-5 sm:pl-12">
                {/* Timeline dot */}
                <div
                  className="absolute left-1.5 top-2 h-3 w-3 rounded-full border-2 border-background sm:left-3.5"
                  style={{ backgroundColor: spaceColor }}
                />

                <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-sm sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Commit message */}
                      <p className="line-clamp-2 break-words text-sm font-medium leading-snug">
                        {meta.commitMessage || commit.description}
                      </p>

                      {/* Meta info */}
                      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 sm:gap-x-3">
                        {meta.author && (
                          <span className="flex min-w-0 max-w-full items-center gap-1 text-xs text-muted-foreground">
                            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold uppercase">
                              {meta.author[0]}
                            </span>
                            <span className="truncate">{meta.author}</span>
                          </span>
                        )}
                        {meta.branch && (
                          <span className="flex max-w-full items-center gap-1 truncate rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            <GitCommit className="w-3 h-3" />
                            {meta.branch}
                          </span>
                        )}
                        {meta.repoName && (
                          <span className="max-w-full truncate text-xs text-muted-foreground">
                            {meta.repoName}
                          </span>
                        )}
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
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
                        className="flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-muted"
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
