'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, BriefcaseBusiness, Loader2, Plus, UserRoundPlus } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

type Requisition = { _id: string; title: string; department?: string; location?: string; openings: number; status: string; description: string; publicToken?: string | null; publiclyVisible?: boolean };
type Candidate = { _id: string; requisition: string; name: string; email: string; phone?: string; stage: string; source?: string; notes?: string; stageHistory?: { from?: string | null; to: string; actor?: string | null; reason?: string; at: string }[] };
type Interview = { _id: string; candidate?: { _id: string; name: string }; scheduledAt: string; status: string; format: string; rating?: number; recommendation?: string; feedback?: string };
type Offer = { _id: string; candidate?: { _id: string; name: string }; title: string; salaryAmount: string; currency: string; proposedStartDate: string; status: string };
type Member = { _id: string; name: string; email: string };
type HrCapabilities = Record<string, boolean>;

const label = (value: string) => value.replaceAll('_', ' ');

function PublicationControls({ workspaceId, requisition, onChanged }: { workspaceId: string; requisition: Requisition; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const update = async (publiclyVisible: boolean) => {
    setBusy(true);
    try {
      const response = await api.patch(`/workspaces/${workspaceId}/hr/requisitions/${requisition._id}/publication`, { publiclyVisible });
      if (publiclyVisible && response.data.data.publicToken) {
        const url = `${window.location.origin}/careers/${workspaceId}/${response.data.data.publicToken}`;
        toast.success('Job published');
        try { await navigator.clipboard.writeText(url); toast.success('Application link copied'); }
        catch { window.prompt('Copy the public application link', url); }
      } else toast.success('Job posting unpublished');
      onChanged();
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not update job posting'); }
    finally { setBusy(false); }
  };
  const copyLink = async () => {
    if (!requisition.publicToken) return;
    try { await navigator.clipboard.writeText(`${window.location.origin}/careers/${workspaceId}/${requisition.publicToken}`); toast.success('Application link copied'); }
    catch { toast.error('Could not copy the job link'); }
  };
  return requisition.publiclyVisible ? <><Button size="sm" variant="outline" disabled={busy} onClick={() => void copyLink()}>Copy application link</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void update(false)}>Unpublish</Button></> : <Button size="sm" variant="outline" disabled={busy || requisition.status !== 'open'} onClick={() => void update(true)}>Publish job</Button>;
}

export default function RecruitingPage() {
  const workspaceId = useParams().id as string;
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [capabilities, setCapabilities] = useState<HrCapabilities>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [requisitionForm, setRequisitionForm] = useState({ title: '', department: '', location: '', openings: '1', description: '' });
  const [candidateForm, setCandidateForm] = useState({ requisitionId: '', name: '', email: '', phone: '', source: '', consent: false });
  const [interviewForm, setInterviewForm] = useState({ candidateId: '', scheduledAt: '', format: 'video' });
  const [offerForm, setOfferForm] = useState({ candidateId: '', title: '', employmentType: 'full_time', proposedStartDate: '', salaryType: 'monthly', salaryAmount: '', currency: 'NPR' });
  const [hireForm, setHireForm] = useState({ candidateId: '', offerId: '', employeeNumber: '', startDate: '', probationEndDate: '' });

  const load = async () => {
    setLoading(true);
    try {
      const capabilityResponse = await api.get(`/workspaces/${workspaceId}/hr/capabilities`);
      const allowed = capabilityResponse.data.data || {};
      setCapabilities(allowed);
      const [reqs, people, meetings, offersResponse, workspaceMembers] = await Promise.all([
        allowed.VIEW_HR_RECRUITING ? api.get(`/workspaces/${workspaceId}/hr/requisitions`) : Promise.resolve(null),
        allowed.VIEW_HR_CANDIDATE_DATA ? api.get(`/workspaces/${workspaceId}/hr/candidates`) : Promise.resolve(null),
        allowed.VIEW_HR_CANDIDATE_DATA ? api.get(`/workspaces/${workspaceId}/hr/interviews`) : Promise.resolve(null),
        allowed.VIEW_HR_COMPENSATION ? api.get(`/workspaces/${workspaceId}/hr/offers`) : Promise.resolve(null),
        allowed.MANAGE_HR_ONBOARDING ? api.get(`/workspaces/${workspaceId}/members`) : Promise.resolve(null),
      ]);
      setRequisitions(reqs?.data.data || []); setCandidates(people?.data.data || []); setInterviews(meetings?.data.data || []); setOffers(offersResponse?.data.data || []); setMembers(workspaceMembers?.data.data || []);
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not load recruiting workspace'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [workspaceId]);

  const action = async (path: string, method: 'patch' | 'post', body: unknown = {}) => {
    setBusy(true);
    try { if (method === 'post') await api.post(path, body); else await api.patch(path, body); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'The action could not be completed'); }
    finally { setBusy(false); }
  };
  const createRequisition = async (event: React.FormEvent) => { event.preventDefault(); await action(`/workspaces/${workspaceId}/hr/requisitions`, 'post', { ...requisitionForm, openings: Number(requisitionForm.openings) }); setRequisitionForm({ title: '', department: '', location: '', openings: '1', description: '' }); };
  const createCandidate = async (event: React.FormEvent) => { event.preventDefault(); if (!candidateForm.consent) { toast.error('Confirm candidate consent before saving contact details'); return; } await action(`/workspaces/${workspaceId}/hr/candidates`, 'post', candidateForm); setCandidateForm({ requisitionId: '', name: '', email: '', phone: '', source: '', consent: false }); };
  const createInterview = async (event: React.FormEvent) => { event.preventDefault(); await action(`/workspaces/${workspaceId}/hr/interviews`, 'post', { ...interviewForm, scheduledAt: new Date(interviewForm.scheduledAt).toISOString() }); };
  const recordInterviewOutcome = async (interview: Interview) => {
    const feedback = window.prompt(`Interview feedback for ${interview.candidate?.name || 'candidate'}`);
    if (feedback === null || !feedback.trim()) return;
    const rawRating = window.prompt('Interview rating from 1 to 5', '3');
    if (rawRating === null) return;
    const rating = Number(rawRating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) { toast.error('Rating must be a whole number from 1 to 5'); return; }
    const recommendation = window.prompt('Recommendation: strong_yes, yes, undecided, no, strong_no', 'undecided');
    if (!recommendation || !['strong_yes', 'yes', 'undecided', 'no', 'strong_no'].includes(recommendation)) { toast.error('Choose a valid interview recommendation'); return; }
    await action(`/workspaces/${workspaceId}/hr/interviews/${interview._id}`, 'patch', { status: 'completed', feedback: feedback.trim(), rating, recommendation });
  };
  const createOffer = async (event: React.FormEvent) => { event.preventDefault(); await action(`/workspaces/${workspaceId}/hr/offers`, 'post', offerForm); };
  const createHire = async (event: React.FormEvent) => { event.preventDefault(); await action(`/workspaces/${workspaceId}/hr/candidates/${hireForm.candidateId}/hire`, 'post', hireForm); setHireForm({ candidateId: '', offerId: '', employeeNumber: '', startDate: '', probationEndDate: '' }); };

  return <main className="container mx-auto space-y-6 px-4 py-8 md:px-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/workspace/${workspaceId}/hr`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Human Resources</Link>{(capabilities.VIEW_HR_ONBOARDING || capabilities.MANAGE_HR_ONBOARDING) && <Link href={`/workspace/${workspaceId}/hr/onboarding`} className="text-sm font-medium text-primary hover:underline">Onboarding & probation</Link>}</div>
    <header className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><BriefcaseBusiness className="h-6 w-6" /></span><div><h1 className="text-3xl font-bold tracking-tight">Hiring</h1><p className="mt-1 text-sm text-muted-foreground">Requisitions, candidates, interviews, offers, and conversion into employee records.</p></div></header>
    {loading ? <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading hiring pipeline</div> : <>
      {(capabilities.VIEW_HR_RECRUITING || capabilities.VIEW_HR_CANDIDATE_DATA) && <section className="grid gap-4 xl:grid-cols-2">
        {capabilities.MANAGE_HR_RECRUITING && capabilities.VIEW_HR_RECRUITING && <Card><CardContent className="p-5"><h2 className="mb-4 text-lg font-semibold">Open a position</h2><form onSubmit={createRequisition} className="grid gap-3 sm:grid-cols-2"><Input required placeholder="Job title" value={requisitionForm.title} onChange={e => setRequisitionForm({ ...requisitionForm, title: e.target.value })} /><Input placeholder="Department" value={requisitionForm.department} onChange={e => setRequisitionForm({ ...requisitionForm, department: e.target.value })} /><Input placeholder="Location" value={requisitionForm.location} onChange={e => setRequisitionForm({ ...requisitionForm, location: e.target.value })} /><Input required type="number" min="1" max="500" placeholder="Openings" value={requisitionForm.openings} onChange={e => setRequisitionForm({ ...requisitionForm, openings: e.target.value })} /><textarea required placeholder="Role description and requirements" value={requisitionForm.description} onChange={e => setRequisitionForm({ ...requisitionForm, description: e.target.value })} className="min-h-24 rounded-md border bg-background p-3 text-sm sm:col-span-2" /><Button disabled={busy} className="sm:col-span-2"><Plus className="mr-2 h-4 w-4" />Save requisition</Button></form></CardContent></Card>}
        {capabilities.MANAGE_HR_RECRUITING && capabilities.VIEW_HR_CANDIDATE_DATA && <Card><CardContent className="p-5"><h2 className="mb-4 text-lg font-semibold">Add candidate</h2><form onSubmit={createCandidate} className="grid gap-3 sm:grid-cols-2"><select required value={candidateForm.requisitionId} onChange={e => setCandidateForm({ ...candidateForm, requisitionId: e.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm sm:col-span-2"><option value="">Select an approved open position</option>{requisitions.filter(r => r.status === 'open').map(r => <option key={r._id} value={r._id}>{r.title} · {r.department || 'No department'}</option>)}</select><Input required placeholder="Candidate name" value={candidateForm.name} onChange={e => setCandidateForm({ ...candidateForm, name: e.target.value })} /><Input required type="email" placeholder="Candidate email" value={candidateForm.email} onChange={e => setCandidateForm({ ...candidateForm, email: e.target.value })} /><Input placeholder="Phone" value={candidateForm.phone} onChange={e => setCandidateForm({ ...candidateForm, phone: e.target.value })} /><Input placeholder="Source" value={candidateForm.source} onChange={e => setCandidateForm({ ...candidateForm, source: e.target.value })} /><label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2"><input type="checkbox" checked={candidateForm.consent} onChange={e => setCandidateForm({ ...candidateForm, consent: e.target.checked })} />Candidate consent to store contact details is recorded</label><Button disabled={busy} className="sm:col-span-2"><UserRoundPlus className="mr-2 h-4 w-4" />Save candidate</Button></form></CardContent></Card>}
      </section>}
      {capabilities.VIEW_HR_RECRUITING && <section className="space-y-3"><h2 className="text-xl font-semibold">Position requests</h2>{requisitions.length ? requisitions.map(req => <Card key={req._id}><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold">{req.title}</p><p className="text-sm text-muted-foreground">{req.department || 'No department'} · {req.openings} opening(s) · {req.location || 'Location not set'}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{label(req.status)}</p></div><div className="flex flex-wrap gap-2">{capabilities.MANAGE_HR_RECRUITING && (req.status === 'draft' || req.status === 'rejected') ? <Button size="sm" variant="outline" disabled={busy} onClick={() => action(`/workspaces/${workspaceId}/hr/requisitions/${req._id}/submit`, 'patch')}>Submit for approval</Button> : null}{capabilities.APPROVE_HR_REQUISITIONS && req.status === 'pending_approval' ? <><Button size="sm" disabled={busy} onClick={() => action(`/workspaces/${workspaceId}/hr/requisitions/${req._id}/approve`, 'patch')}>Approve & open</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => action(`/workspaces/${workspaceId}/hr/requisitions/${req._id}/reject`, 'patch', { reason: 'Needs revision' })}>Reject</Button></> : null}{capabilities.MANAGE_HR_RECRUITING && req.status === 'open' ? <><Button size="sm" variant="outline" disabled={busy} onClick={() => action(`/workspaces/${workspaceId}/hr/requisitions/${req._id}/close`, 'patch')}>Close position</Button><PublicationControls workspaceId={workspaceId} requisition={req} onChanged={() => void load()} /></> : null}</div></CardContent></Card>) : <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No position requests yet.</CardContent></Card>}</section>}
      {capabilities.VIEW_HR_CANDIDATE_DATA && <section className="space-y-3"><h2 className="text-xl font-semibold">Candidates</h2>{candidates.length ? candidates.map(candidate => <Card key={candidate._id}><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4"><div className="min-w-0"><p className="font-semibold">{candidate.name}</p><p className="text-sm text-muted-foreground">{candidate.email}{candidate.phone ? ` · ${candidate.phone}` : ''} · {candidate.source || 'Direct'}</p></div>{capabilities.MANAGE_HR_RECRUITING && <div className="flex flex-wrap items-center gap-2"><select aria-label={`Stage for ${candidate.name}`} value={candidate.stage} onChange={e => action(`/workspaces/${workspaceId}/hr/candidates/${candidate._id}/stage`, 'patch', { stage: e.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm">{['new', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'].map(stage => <option key={stage} value={stage}>{label(stage)}</option>)}</select></div>}{candidate.stageHistory?.length ? <details className="w-full border-t pt-2"><summary className="cursor-pointer text-xs font-medium text-muted-foreground">Stage history ({candidate.stageHistory.length})</summary><ol className="mt-2 space-y-1">{candidate.stageHistory.map((event, index) => <li key={`${event.at}-${index}`} className="text-xs text-muted-foreground">{new Date(event.at).toLocaleString()} · {event.from ? label(event.from) + " → " : ""}{label(event.to)}{event.actor ? ` · ${event.actor}` : ""}{event.reason ? ` · ${event.reason}` : ""}</li>)}</ol></details> : null}</CardContent></Card>) : <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No candidates recorded. Candidate contacts are encrypted at rest and visible only to authorized HR users.</CardContent></Card>}</section>}
      <section className="grid gap-4 xl:grid-cols-2">
        {capabilities.VIEW_HR_CANDIDATE_DATA && <Card><CardContent className="p-5"><h2 className="mb-4 text-lg font-semibold">Schedule interview</h2>{capabilities.MANAGE_HR_RECRUITING && <form onSubmit={createInterview} className="grid gap-3"><select required value={interviewForm.candidateId} onChange={e => setInterviewForm({ ...interviewForm, candidateId: e.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Select candidate</option>{candidates.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select><Input required type="datetime-local" value={interviewForm.scheduledAt} onChange={e => setInterviewForm({ ...interviewForm, scheduledAt: e.target.value })} /><select value={interviewForm.format} onChange={e => setInterviewForm({ ...interviewForm, format: e.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm">{['video', 'phone', 'in_person', 'other'].map(format => <option key={format} value={format}>{label(format)}</option>)}</select><Button disabled={busy}>Schedule interview</Button></form>}<div className="mt-4 space-y-2">{interviews.map(interview => <div key={interview._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3 text-sm"><div><strong>{interview.candidate?.name || 'Candidate'}</strong><p className="text-muted-foreground">{new Date(interview.scheduledAt).toLocaleString()} · {label(interview.format)} · {label(interview.status)}{interview.rating ? ` · ${interview.rating}/5 · ${label(interview.recommendation || '')}` : ''}</p>{interview.feedback && <p className="mt-1 whitespace-pre-wrap">{interview.feedback}</p>}</div>{capabilities.MANAGE_HR_RECRUITING && interview.status === 'scheduled' && <Button size="sm" variant="outline" disabled={busy} onClick={() => void recordInterviewOutcome(interview)}>Record outcome</Button>}</div>)}</div></CardContent></Card>}
        {capabilities.VIEW_HR_COMPENSATION && <Card><CardContent className="p-5"><h2 className="mb-4 text-lg font-semibold">Prepare offer</h2>{capabilities.MANAGE_HR_RECRUITING && <form onSubmit={createOffer} className="grid gap-3 sm:grid-cols-2"><select required value={offerForm.candidateId} onChange={e => setOfferForm({ ...offerForm, candidateId: e.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm sm:col-span-2"><option value="">Select candidate</option>{candidates.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select><Input required placeholder="Offer title" value={offerForm.title} onChange={e => setOfferForm({ ...offerForm, title: e.target.value })} /><Input required type="date" value={offerForm.proposedStartDate} onChange={e => setOfferForm({ ...offerForm, proposedStartDate: e.target.value })} /><Input required type="number" min="0.01" step="0.01" placeholder="Salary amount" value={offerForm.salaryAmount} onChange={e => setOfferForm({ ...offerForm, salaryAmount: e.target.value })} /><Input required maxLength={3} placeholder="Currency" value={offerForm.currency} onChange={e => setOfferForm({ ...offerForm, currency: e.target.value.toUpperCase() })} /><select value={offerForm.employmentType} onChange={e => setOfferForm({ ...offerForm, employmentType: e.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm">{['full_time', 'part_time', 'contract', 'intern', 'temporary'].map(type => <option key={type} value={type}>{label(type)}</option>)}</select><select value={offerForm.salaryType} onChange={e => setOfferForm({ ...offerForm, salaryType: e.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm">{['monthly', 'weekly', 'daily', 'hourly'].map(type => <option key={type} value={type}>{label(type)}</option>)}</select><Button disabled={busy} className="sm:col-span-2">Submit offer for approval</Button></form>}<div className="mt-4 space-y-2">{offers.map(offer => <div key={offer._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 p-3 text-sm"><span><strong>{offer.candidate?.name}</strong> · {offer.title} · {offer.currency} {offer.salaryAmount} · {label(offer.status)}</span><span className="flex gap-1">{capabilities.APPROVE_HR_COMPENSATION && offer.status === 'pending_approval' && <><Button size="sm" onClick={() => action(`/workspaces/${workspaceId}/hr/offers/${offer._id}/approve`, 'patch')}>Approve</Button><Button size="sm" variant="outline" onClick={() => action(`/workspaces/${workspaceId}/hr/offers/${offer._id}/reject`, 'patch', { reason: 'Needs revision' })}>Reject</Button></>}{capabilities.MANAGE_HR_RECRUITING && offer.status === 'approved' && <Button size="sm" onClick={() => action(`/workspaces/${workspaceId}/hr/offers/${offer._id}/send`, 'patch')}>Mark sent</Button>}{capabilities.MANAGE_HR_RECRUITING && offer.status === 'sent' && <><Button size="sm" onClick={() => action(`/workspaces/${workspaceId}/hr/offers/${offer._id}/respond`, 'patch', { response: 'accepted' })}>Record accepted</Button><Button size="sm" variant="outline" onClick={() => action(`/workspaces/${workspaceId}/hr/offers/${offer._id}/respond`, 'patch', { response: 'rejected' })}>Record declined</Button></>}</span></div>)}</div></CardContent></Card>}
      </section>
      {capabilities.MANAGE_HR_ONBOARDING && capabilities.VIEW_HR_CANDIDATE_DATA && capabilities.VIEW_HR_COMPENSATION && <Card><CardContent className="p-5"><h2 className="mb-4 text-lg font-semibold">Start onboarding for accepted offer</h2><p className="mb-4 text-sm text-muted-foreground">This links the candidate to an existing workspace member. Invite them using workspace access first; HR does not create a duplicate account.</p><form onSubmit={createHire} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><select required value={hireForm.candidateId} onChange={e => setHireForm({ ...hireForm, candidateId: e.target.value, offerId: '' })} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Candidate</option>{candidates.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select><select required value={hireForm.offerId} onChange={e => setHireForm({ ...hireForm, offerId: e.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Accepted offer</option>{offers.filter(o => o.status === 'accepted' && (!hireForm.candidateId || o.candidate?._id === hireForm.candidateId)).map(o => <option key={o._id} value={o._id}>{o.title} · {o.candidate?.name}</option>)}</select><Input required placeholder="Employee number" value={hireForm.employeeNumber} onChange={e => setHireForm({ ...hireForm, employeeNumber: e.target.value })} /><Input required type="date" aria-label="Start date" value={hireForm.startDate} onChange={e => setHireForm({ ...hireForm, startDate: e.target.value })} /><Input type="date" aria-label="Probation end date" value={hireForm.probationEndDate} onChange={e => setHireForm({ ...hireForm, probationEndDate: e.target.value })} /><Button disabled={busy || !members.length} className="sm:col-span-2 lg:col-span-5">Create employee and onboarding checklist</Button></form></CardContent></Card>}
    </>}
  </main>;
}
