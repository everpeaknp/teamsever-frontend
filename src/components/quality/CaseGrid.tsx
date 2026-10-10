'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { QualityCase } from './CaseEditor';

type Props = {
  cases: QualityCase[];
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onOpen: (testCase: QualityCase) => void;
};

export function CaseGrid({ cases, page, limit, total, onPageChange, onOpen }: Props) {
  const start = total ? (page - 1) * limit + 1 : 0;
  const end = Math.min(page * limit, total);
  return <div className="overflow-hidden rounded-xl border bg-card">
    <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm">
      <thead className="border-b bg-muted/40 text-xs font-medium text-muted-foreground"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Case</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Revision</th></tr></thead>
      <tbody>{cases.map(testCase => <tr key={testCase._id} className="border-b last:border-b-0 hover:bg-muted/30">
        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{testCase.key}</td>
        <td className="px-4 py-3"><button type="button" className="text-left font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => onOpen(testCase)}>{testCase.title}</button></td>
        <td className="px-4 py-3 capitalize">{testCase.priority}</td>
        <td className="px-4 py-3"><Badge variant="outline" className="capitalize">{testCase.state}</Badge></td>
        <td className="px-4 py-3 text-muted-foreground">v{testCase.currentRevision}</td>
      </tr>)}</tbody>
    </table></div>
    {!cases.length && <div className="px-5 py-12 text-center text-sm text-muted-foreground">No cases match these filters.</div>}
    <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground"><span>{start}–{end} of {total}</span><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">Previous</Button><Button type="button" size="sm" variant="outline" disabled={page * limit >= total} onClick={() => onPageChange(page + 1)} aria-label="Next page">Next</Button></div></div>
  </div>;
}
