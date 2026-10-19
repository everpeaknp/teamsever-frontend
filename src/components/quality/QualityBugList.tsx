'use client';

import { Button } from '@/components/ui/button';
import type { QualityBug } from '@/hooks/queries/useQuality';

type Props = {
  bugs: QualityBug[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  onOpen: (bugId: string) => void;
};

export function QualityBugList({ bugs, total, page, onPageChange, onOpen }: Props) {
  return <div className="overflow-hidden rounded-xl border bg-card">
    <div data-testid="quality-bug-mobile-list" className="divide-y lg:hidden">
      {bugs.map(bug => <article key={bug._id} className="min-w-0 p-3">
        <button type="button" className="min-h-11 w-full min-w-0 break-words text-left font-medium hover:underline" onClick={() => onOpen(bug._id)}>{bug.title}</button>
        <p className="mt-1 break-words text-xs text-muted-foreground">{bug.bugDetails?.environment || 'Environment not specified'}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border px-2.5 py-1 capitalize">{bug.status.replace('inprogress', 'in progress')}</span>
          <span className="rounded-full border px-2.5 py-1 capitalize">{bug.bugDetails?.severity || bug.priority}</span>
          <span className="ml-auto py-1 text-muted-foreground">Updated {new Date(bug.updatedAt).toLocaleDateString()}</span>
        </div>
      </article>)}
    </div>
    <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Bug</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Updated</th></tr></thead><tbody>{bugs.map(bug => <tr key={bug._id} className="border-b last:border-b-0 hover:bg-muted/30"><td className="max-w-md px-4 py-3"><button type="button" className="break-words text-left font-medium hover:underline" onClick={() => onOpen(bug._id)}>{bug.title}</button><p className="mt-1 break-words text-xs text-muted-foreground">{bug.bugDetails?.environment}</p></td><td className="px-4 py-3 capitalize">{bug.status}</td><td className="px-4 py-3 capitalize">{bug.bugDetails?.severity || bug.priority}</td><td className="px-4 py-3 text-xs text-muted-foreground">{new Date(bug.updatedAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>
    {!bugs.length && <p className="p-8 text-center text-sm text-muted-foreground">No bugs match these filters.</p>}
    <div className="flex flex-col items-start justify-between gap-3 border-t px-3 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-4"><span>{total} bugs</span><div className="grid w-full grid-cols-2 gap-2 sm:w-auto"><Button className="min-h-11" size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button><Button className="min-h-11" size="sm" variant="outline" disabled={page * 30 >= total} onClick={() => onPageChange(page + 1)}>Next</Button></div></div>
  </div>;
}
