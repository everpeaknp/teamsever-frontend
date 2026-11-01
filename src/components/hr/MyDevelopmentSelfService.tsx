'use client';

import { useEffect, useState } from 'react';
import { BookOpenCheck, Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

type GrowthRecord = { _id: string; kind: string; title: string; status: string; dueAt?: string | null; completedAt?: string | null; details?: string; outcome?: string; task?: { title: string; status: string; deadline?: string | null; completedAt?: string | null } | null };

export function MyDevelopmentSelfService({ workspaceId }: { workspaceId: string }) {
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api.get(`/workspaces/${workspaceId}/hr/my/development`)
      .then(response => { if (active) setRecords(response.data.data || []); })
      .catch((error: any) => { if (active) toast.error(error?.response?.data?.message || 'Could not load your goals and development'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspaceId]);

  return <Card><CardContent className="space-y-4 p-5">
    <div><h2 className="flex items-center gap-2 text-lg font-semibold"><BookOpenCheck className="h-5 w-5 text-primary" />My goals & development</h2><p className="text-sm text-muted-foreground">Goals, learning, certifications, and career plans assigned to you.</p></div>
    {loading ? <div className="flex justify-center py-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div> : records.length ? <ul className="divide-y rounded-lg border">{records.map(record => <li key={record._id} className="space-y-2 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium">{record.title}</p><p className="text-xs capitalize text-muted-foreground">{record.kind.replaceAll('_', ' ')} · {record.status.replaceAll('_', ' ')}{record.dueAt ? ` · Due ${new Date(record.dueAt).toLocaleDateString()}` : ''}{record.completedAt ? ` · Completed ${new Date(record.completedAt).toLocaleDateString()}` : ''}</p></div></div>{record.details && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{record.details}</p>}{record.outcome && <p className="whitespace-pre-wrap text-sm">Outcome: {record.outcome}</p>}{record.task && <p className="rounded-md bg-muted/60 px-3 py-2 text-xs">Linked task: {record.task.title} · {record.task.status.replaceAll('_', ' ')}{record.task.deadline ? ` · Due ${new Date(record.task.deadline).toLocaleDateString()}` : ''}</p>}</li>)}</ul> : <p className="rounded-lg border p-4 text-sm text-muted-foreground">No goals or development items have been assigned yet.</p>}
  </CardContent></Card>;
}
