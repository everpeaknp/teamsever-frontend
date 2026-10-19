'use client';

import Link from 'next/link';
import { AlertCircle, ArrowLeft, ChevronRight, Folder, Layers3, ListChecks, Plus, RefreshCw } from 'lucide-react';
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
  canCreateSpace?: boolean;
  onCreateSpace?: () => void;
}

const SPACE_ACCENTS = ['#4F8CFF', '#9B6BFF', '#20B98A', '#F2A93B', '#E66AA8', '#25B7C7'];

function getSpaceAccent(space: SpaceSummary) {
  if (space.color) return space.color;
  const key = space._id || space.name;
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0;
  }
  return SPACE_ACCENTS[Math.abs(hash) % SPACE_ACCENTS.length];
}

export function SpaceDirectory({
  workspaceId,
  workspaceName,
  spaces,
  loading = false,
  error = null,
  onRetry,
  canCreateSpace = false,
  onCreateSpace,
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
          <div className="flex shrink-0 items-center gap-2">
            {!loading && !error && (
            <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
              {spaces.length} {spaces.length === 1 ? 'space' : 'spaces'}
            </span>
            )}
            {canCreateSpace && onCreateSpace && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Create space"
                onClick={onCreateSpace}
                className="min-h-10 min-w-10 shrink-0 gap-2 rounded-xl px-2.5 sm:px-3"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Create space</span>
              </Button>
            )}
          </div>
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
            {canCreateSpace
              ? 'Create a space to organize your team’s folders, lists, and work.'
              : 'Spaces organize your team’s folders, lists, and work. Ask a workspace admin to create the first one.'}
          </p>
          {canCreateSpace && onCreateSpace && (
            <Button type="button" onClick={onCreateSpace} className="mt-5 min-h-11 gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create space
            </Button>
          )}
        </section>
      ) : (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {spaces.map((space) => {
            const folderCount = space.folders?.length ?? 0;
            const listCount = (space.lists?.length ?? 0) + (space.folders ?? []).reduce((sum, folder) => sum + (folder.lists?.length ?? 0), 0);
            const accent = getSpaceAccent(space);
            return (
              <Link
                key={space._id}
                href={`/workspace/${workspaceId}/spaces/${space._id}`}
                className="group flex min-h-0 min-w-0 flex-col rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/50 hover:bg-muted/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:min-h-40 sm:p-5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="space-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-current/10 sm:h-11 sm:w-11"
                    style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)` }}
                  >
                    <Layers3 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className="min-w-0 flex-1 break-words font-semibold leading-6 group-hover:text-primary">{space.name}</h2>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary sm:hidden" aria-hidden="true" />
                    </div>
                    {space.description?.trim() && (
                      <p className="mt-0.5 line-clamp-1 break-words text-sm text-muted-foreground sm:mt-1 sm:line-clamp-2">
                        {space.description.trim()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:mt-auto sm:pt-5">
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
