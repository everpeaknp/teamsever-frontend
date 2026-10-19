'use client';

import { useState } from 'react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { useQualityProject } from '@/components/quality/QualityProjectContext';

type PreviewRow = { line: number; key?: string; draft: { title: string }; errors: string[] };
type Preview = { previewToken: string; rows: PreviewRow[]; valid: number; invalid: number };
type Outcome = { created: number; updated: number; skipped: number; errors: Array<{ line: number; message: string }> };

export function CaseImportWizard({ workspaceId, onComplete }: { workspaceId: string; onComplete: () => void }) {
  const { projectId } = useQualityProject();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [mode, setMode] = useState<'create' | 'update' | 'skip'>('skip');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const previewFile = async () => {
    if (!projectId) return setError('Wait for the QA project to load, then try again.');
    if (!file) return setError('Choose a CSV or XLSX file.');
    if (file.size > 2 * 1024 * 1024) return setError('File must be smaller than 2 MB.');
    setBusy(true); setError(''); setOutcome(null);
    try {
      const form = new FormData(); form.append('file', file);
      const response = await api.post(`/workspaces/${workspaceId}/quality/cases/import/preview`, form, { params: { projectId } });
      setPreview(response.data.data);
    } catch (caught: any) { setError(caught?.response?.data?.message || 'Could not preview this file.'); }
    finally { setBusy(false); }
  };

  const commit = async () => {
    if (!projectId) return setError('Choose a QA project before importing cases.');
    if (!preview || preview.invalid) return;
    setBusy(true); setError('');
    try {
      const response = await api.post(`/workspaces/${workspaceId}/quality/cases/import/commit`, { previewToken: preview.previewToken, mode }, { params: { projectId } });
      setOutcome(response.data.data); onComplete();
    } catch (caught: any) { setError(caught?.response?.data?.message || 'Import did not finish. Retry with this preview.'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-5 text-sm">
    <p className="text-muted-foreground">Use columns Key, Title, Priority, Type, State, Preconditions and Steps. Steps is a JSON array, for example <code className="rounded bg-muted px-1">[{`{"action":"Open login","expectedResult":"Form appears"}`}]</code>. Leave Key blank for new cases.</p>
    <div className="flex flex-wrap items-center gap-2"><input aria-label="Case spreadsheet" type="file" accept=".csv,.xlsx" onChange={event => { setFile(event.target.files?.[0] || null); setPreview(null); setOutcome(null); }} /><Button type="button" size="sm" variant="outline" disabled={busy || !file} onClick={previewFile}>{busy ? 'Working…' : 'Preview'}</Button></div>
    {preview && <><div className="rounded-lg border p-3">{preview.valid} valid · {preview.invalid} need correction</div><div className="max-h-64 overflow-auto rounded-lg border"><table className="w-full min-w-[420px] text-left text-xs"><thead className="sticky top-0 bg-muted"><tr><th className="p-2">Row</th><th className="p-2">Case</th><th className="p-2">Validation</th></tr></thead><tbody>{preview.rows.map(row => <tr key={row.line} className="border-t"><td className="p-2">{row.line}</td><td className="max-w-[180px] break-words p-2">{row.key ? `${row.key} · ` : ''}{row.draft.title}</td><td className={`max-w-[180px] break-words p-2 ${row.errors.length ? 'text-destructive' : 'text-muted-foreground'}`}>{row.errors.join('; ') || 'Ready'}</td></tr>)}</tbody></table></div><div className="space-y-2"><label htmlFor="case-import-mode" className="font-medium">Existing case keys</label><select id="case-import-mode" className="h-11 w-full rounded-md border bg-background px-3" value={mode} onChange={event => setMode(event.target.value as typeof mode)}><option value="skip">Skip existing</option><option value="update">Update existing, skip new</option><option value="create">Create new, skip existing</option></select></div><Button className="min-h-11 w-full" type="button" disabled={busy || preview.invalid > 0 || Boolean(outcome)} onClick={commit}>Import {preview.valid} cases</Button>{preview.invalid > 0 && <p className="text-destructive">Fix the listed rows and preview the file again before importing.</p>}</>}
    {outcome && <div role="status" className="rounded-lg border p-3"><p>{outcome.created} created · {outcome.updated} updated · {outcome.skipped} skipped</p>{outcome.errors.map(item => <p key={item.line} className="text-destructive">Row {item.line}: {item.message}</p>)}</div>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </div>;
}
