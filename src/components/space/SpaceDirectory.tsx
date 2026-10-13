'use client';

import Link from 'next/link';
import { AlertCircle, ArrowLeft, Folder, Layers3, ListChecks, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SpaceSummary {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  folders?: Array<{ lists?: unknown[] }>;
  lists?: unknown[];
}

interface SpaceDirectoryProps {
  workspaceId: string;
  workspaceName?: string;
  spaces: SpaceSummary[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function SpaceDirectory({
  workspaceId,
  workspaceName,
  spaces,
  loading = false,
  error = null,
  onRetry,
}: SpaceDirectoryProps) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 pb-8 sm:px-6 sm:py-7">
      <header className="space-y-3">
        <Link
          href={`/workspace/${workspaceId}/analytics`}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg pr-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Dashboard
        </Link>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">Spaces</h1>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {workspaceName ? `Choose a space in ${workspaceName}.` : 'Choose a space to open its lists, folders, and work.'}
            </p>
          </div>
          {!loading && !error && (
            <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
              {spaces.length} {spaces.length === 1 ? 'space' : 'spaces'}
            </span>
          )}
        </div>
      </header>

      {loading ? (
        <div role="status" aria-label="Loading spaces" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="min-h-36 animate-pulse rounded-xl border bg-card p-4">
              <div className="mb-4 h-10 w-10 rounded-lg bg-muted" />
              <div className="mb-2 h-5 w-2/3 rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : error ? (
        <section role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Could not load spaces</h2>
              <p className="mt-1 break-words text-sm text-muted-foreground">{error}</p>
              {onRetry && <Button className="mt-4 min-h-11" variant="outline" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>}
            </div>
          </div>
        </section>
      ) : spaces.length === 0 ? (
        <section className="rounded-xl border border-dashed bg-card px-5 py-12 text-center">
          <Layers3 className="mx-auto h-9 w-9 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">No spaces yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Spaces organize your team’s folders, lists, and work. Ask a workspace admin to create the first one.
          </p>
        </section>
      ) : (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {spaces.map((space) => {
            const folderCount = space.folders?.length ?? 0;
            const listCount = (space.lists?.length ?? 0) + (space.folders ?? []).reduce((sum, folder) => sum + (folder.lists?.length ?? 0), 0);
            return (
              <Link
                key={space._id}
                href={`/workspace/${workspaceId}/spaces/${space._id}`}
                className="group flex min-h-40 min-w-0 flex-col rounded-xl border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-muted/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:p-5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                    style={space.color ? { color: space.color, backgroundColor: `${space.color}18` } : undefined}
                  >
                    <Layers3 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words font-semibold leading-6 group-hover:text-primary">{space.name}</h2>
                    <p className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">
                      {space.description?.trim() || 'Open this space to browse its work.'}
                    </p>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Folder className="h-3.5 w-3.5" aria-hidden="true" />{folderCount} {folderCount === 1 ? 'folder' : 'folders'}</span>
                  <span className="inline-flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5" aria-hidden="true" />{listCount} {listCount === 1 ? 'list' : 'lists'}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
