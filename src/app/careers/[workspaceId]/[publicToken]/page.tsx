'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BriefcaseBusiness, CheckCircle2, Loader2, MapPin } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

type Job = { _id: string; title: string; department?: string; location?: string; employmentType: string; openings: number; description: string; requirements: string[] };

export default function PublicJobPage() {
  const { workspaceId, publicToken } = useParams<{ workspaceId: string; publicToken: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', consent: false });

  useEffect(() => {
    let active = true;
    api.get(`/public/workspaces/${workspaceId}/jobs/${publicToken}`)
      .then(response => { if (active) setJob(response.data.data); })
      .catch((error: any) => { if (active) toast.error(error?.response?.data?.message || 'This job posting is no longer available'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspaceId, publicToken]);

  const apply = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.consent) { toast.error('Consent is required to submit your application'); return; }
    setSubmitting(true);
    try {
      await api.post(`/public/workspaces/${workspaceId}/jobs/${publicToken}/applications`, form);
      setSubmitted(true);
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not submit your application'); }
    finally { setSubmitting(false); }
  };

  return <main className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16"><div className="mx-auto max-w-3xl space-y-6">
    <header className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><BriefcaseBusiness className="h-6 w-6" /></span><div><p className="text-sm font-semibold text-primary">Careers</p><h1 className="text-xl font-bold">Teamsever job opportunity</h1></div></header>
    {loading ? <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading job posting</div> : job ? <>
      <Card><CardContent className="space-y-5 p-6 sm:p-8"><div><h2 className="text-2xl font-bold tracking-tight">{job.title}</h2><p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm capitalize text-muted-foreground"><span>{job.department || 'Team'}</span><span>{job.employmentType.replaceAll('_', ' ')}</span>{job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}<span>{job.openings} opening{job.openings === 1 ? '' : 's'}</span></p></div>
        <section><h3 className="font-semibold">About the role</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{job.description}</p></section>
        {job.requirements?.length > 0 && <section><h3 className="font-semibold">Requirements</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{job.requirements.map((requirement, index) => <li key={index}>{requirement}</li>)}</ul></section>}
      </CardContent></Card>
      {submitted ? <Card><CardContent className="flex items-start gap-3 p-5"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /><div><h3 className="font-semibold">Application received</h3><p className="mt-1 text-sm text-muted-foreground">Thank you for applying. The hiring team will review your application.</p></div></CardContent></Card> : <Card><CardContent className="space-y-4 p-6 sm:p-8"><div><h3 className="text-lg font-semibold">Apply for this position</h3><p className="text-sm text-muted-foreground">Your contact details are stored encrypted and visible to authorized hiring staff.</p></div><form onSubmit={apply} className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm font-medium">Full name<Input required maxLength={160} autoComplete="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label className="space-y-1 text-sm font-medium">Email<Input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label><label className="space-y-1 text-sm font-medium sm:col-span-2">Phone (optional)<Input type="tel" maxLength={40} autoComplete="tel" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></label><label className="flex items-start gap-2 text-sm text-muted-foreground sm:col-span-2"><input className="mt-1" required type="checkbox" checked={form.consent} onChange={event => setForm({ ...form, consent: event.target.checked })} /><span>I consent to Teamsever storing and using my application contact details for hiring for this position.</span></label><Button disabled={submitting} className="sm:col-span-2">{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit application</Button></form></CardContent></Card>}
      <p className="text-center text-xs text-muted-foreground">Job posting and application form provided by Teamsever.</p>
    </> : <Card><CardContent className="py-16 text-center"><BriefcaseBusiness className="mx-auto h-9 w-9 text-muted-foreground" /><h2 className="mt-3 font-semibold">This job is no longer available</h2><p className="mt-1 text-sm text-muted-foreground">The position may have closed or its application link may have been unpublished.</p></CardContent></Card>}
  </div></main>;
}
