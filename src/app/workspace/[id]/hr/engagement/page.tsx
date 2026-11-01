'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, HeartHandshake, Loader2, Plus, Send } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

type Person = { _id: string; user?: { name: string; profilePicture?: string; avatar?: string }; jobTitle?: string; department?: string };
type SurveyQuestion = { _id: string; prompt: string; type: 'rating' | 'text'; required: boolean };
type Survey = { _id: string; title: string; description?: string; questions: SurveyQuestion[]; status: 'draft' | 'open' | 'closed'; startsAt?: string; endsAt: string; alreadyResponded?: boolean; resultsAvailable?: boolean; responseCount?: number | null; history?: { status: string; actor: string; at: string }[]; results?: { questionId: string; type: 'rating' | 'text'; count: number | null; average?: number | null; comments?: string[] | null }[] | null };
type Recognition = { _id: string; sender?: { name: string }; recipient?: { user?: { name: string }; jobTitle?: string }; category: string; title: string; message: string; createdAt: string };

export default function HrEngagementPage() {
  const workspaceId = useParams().id as string;
  const [employees, setEmployees] = useState<Person[]>([]);
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [mySurveys, setMySurveys] = useState<Survey[]>([]);
  const [managedSurveys, setManagedSurveys] = useState<Survey[]>([]);
  const [canManageSurveys, setCanManageSurveys] = useState(false);
  const [canRecognize, setCanRecognize] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recognition, setRecognition] = useState({ recipientEmployeeId: '', category: 'teamwork', title: '', message: '' });
  const [survey, setSurvey] = useState({ title: '', description: '', endsAt: '', questions: [{ prompt: '', type: 'rating' as 'rating' | 'text', required: true }] });
  const [answers, setAnswers] = useState<Record<string, Record<string, string | number>>>({});

  const load = async () => {
    const [feed, personal, managed] = await Promise.allSettled([
      api.get(`/workspaces/${workspaceId}/hr/recognitions`),
      api.get(`/workspaces/${workspaceId}/hr/my/surveys`),
      api.get(`/workspaces/${workspaceId}/hr/surveys`),
    ]);
    if (feed.status === 'fulfilled') { setRecognitions(feed.value.data.data.items || []); setEmployees(feed.value.data.data.employees || []); setCanRecognize(Boolean(feed.value.data.permissions?.canRecognize)); }
    else toast.error(feed.reason?.response?.data?.message || 'Could not load team recognition');
    if (personal.status === 'fulfilled') setMySurveys(personal.value.data.data || []);
    else if (personal.reason?.response?.status !== 404) toast.error(personal.reason?.response?.data?.message || 'Could not load your surveys');
    if (managed.status === 'fulfilled') { setManagedSurveys(managed.value.data.data || []); setCanManageSurveys(Boolean(managed.value.data.permissions?.canManage)); }
    else { setManagedSurveys([]); setCanManageSurveys(false); }
    setLoading(false);
  };
  useEffect(() => { void load(); }, [workspaceId]);

  const sendRecognition = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { await api.post(`/workspaces/${workspaceId}/hr/recognitions`, recognition); setRecognition({ ...recognition, title: '', message: '' }); toast.success('Recognition shared with the team'); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not send recognition'); }
    finally { setSaving(false); }
  };
  const createSurvey = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { await api.post(`/workspaces/${workspaceId}/hr/surveys`, { ...survey, startsAt: new Date().toISOString(), endsAt: new Date(survey.endsAt).toISOString() }); setSurvey({ ...survey, title: '', description: '', questions: [{ prompt: '', type: 'rating', required: true }] }); toast.success('Survey saved as a draft'); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not create survey'); }
    finally { setSaving(false); }
  };
  const changeSurveyStatus = async (item: Survey) => {
    const status = item.status === 'draft' ? 'open' : 'closed';
    try { await api.patch(`/workspaces/${workspaceId}/hr/surveys/${item._id}`, { status }); toast.success(status === 'open' ? 'Survey opened' : 'Survey closed'); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not update survey'); }
  };
  const submitAnswers = async (item: Survey) => {
    try { await api.post(`/workspaces/${workspaceId}/hr/my/surveys/${item._id}/responses`, { answers: answers[item._id] || {} }); toast.success('Your response was submitted'); setAnswers({ ...answers, [item._id]: {} }); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not submit your response'); }
  };

  return <main className="container mx-auto space-y-6 px-4 py-8 md:px-8">
    <div className="flex items-center justify-between"><Link href={`/workspace/${workspaceId}/hr`} className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Human Resources</Link><Link href={`/workspace/${workspaceId}/hr/me`} className="text-sm text-primary hover:underline">My HR</Link></div>
    <header className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><HeartHandshake className="h-6 w-6" /></span><div><h1 className="text-3xl font-bold">Team engagement</h1><p className="text-sm text-muted-foreground">Recognize teammates and take part in workspace surveys.</p></div></header>
    {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div> : <>
      <Card><CardContent className="space-y-4 p-5"><div><h2 className="text-lg font-semibold">Recognize a teammate</h2><p className="text-sm text-muted-foreground">Recognitions are visible to active workspace members.</p></div>{canRecognize ? <form onSubmit={sendRecognition} className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm font-medium">Teammate<select required value={recognition.recipientEmployeeId} onChange={event => setRecognition({ ...recognition, recipientEmployeeId: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3"><option value="">Choose teammate</option>{employees.map(person => <option key={person._id} value={person._id}>{person.user?.name || 'Employee'}{person.jobTitle ? ` · ${person.jobTitle}` : ''}</option>)}</select></label><label className="space-y-1 text-sm font-medium">Category<select value={recognition.category} onChange={event => setRecognition({ ...recognition, category: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3">{[['teamwork', 'Teamwork'], ['customer_impact', 'Customer impact'], ['innovation', 'Innovation'], ['ownership', 'Ownership'], ['other', 'Other']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><Input required maxLength={120} placeholder="Recognition title" value={recognition.title} onChange={event => setRecognition({ ...recognition, title: event.target.value })} /><textarea required maxLength={1000} placeholder="What did they do well?" value={recognition.message} onChange={event => setRecognition({ ...recognition, message: event.target.value })} className="min-h-20 rounded-md border bg-background p-3 text-sm sm:col-span-2" /><Button disabled={saving || !employees.length} className="sm:col-span-2"><Send className="mr-2 h-4 w-4" />Share recognition</Button></form> : <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">An active HR employee record is needed to send recognition.</p>}</CardContent></Card>
      <section className="space-y-3"><h2 className="text-lg font-semibold">Recent recognition</h2>{recognitions.length ? recognitions.map(item => <Card key={item._id}><CardContent className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{item.title}</p><span className="rounded-full bg-primary/10 px-2 py-1 text-xs capitalize text-primary">{item.category.replaceAll('_', ' ')}</span></div><p className="mt-1 text-sm">{item.message}</p><p className="mt-2 text-xs text-muted-foreground">{item.sender?.name || 'Teammate'} recognized {item.recipient?.user?.name || 'a teammate'} · {new Date(item.createdAt).toLocaleDateString()}</p></CardContent></Card>) : <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No recognitions yet.</CardContent></Card>}</section>

      <section className="space-y-3"><div><h2 className="text-lg font-semibold">Your surveys</h2><p className="text-sm text-muted-foreground">HR sees survey results only after at least five employees respond. Text answers are shown without a linked employee name, and each rating result needs five answers.</p></div>{mySurveys.length ? mySurveys.map(item => <Card key={item._id}><CardContent className="space-y-4 p-5"><div><h3 className="font-semibold">{item.title}</h3>{item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}<p className="text-xs text-muted-foreground">Closes {new Date(item.endsAt).toLocaleString()}</p></div>{item.alreadyResponded ? <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">Your response has been recorded.</p> : <div className="space-y-3">{item.questions.map(question => <label key={question._id} className="block space-y-1 text-sm font-medium">{question.prompt}{question.required && <span className="ml-1 text-red-600">*</span>}{question.type === 'rating' ? <select required={question.required} value={answers[item._id]?.[question._id] || ''} onChange={event => setAnswers({ ...answers, [item._id]: { ...(answers[item._id] || {}), [question._id]: event.target.value } })} className="h-10 w-full rounded-md border bg-background px-3"><option value="">Choose rating</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} / 5</option>)}</select> : <textarea required={question.required} maxLength={2000} value={String(answers[item._id]?.[question._id] || '')} onChange={event => setAnswers({ ...answers, [item._id]: { ...(answers[item._id] || {}), [question._id]: event.target.value } })} className="min-h-20 w-full rounded-md border bg-background p-3" />}</label>)}<Button onClick={() => void submitAnswers(item)}>Submit survey</Button></div>}</CardContent></Card>) : <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No open surveys right now.</CardContent></Card>}</section>

      {canManageSurveys && <><Card><CardContent className="space-y-4 p-5"><div><h2 className="text-lg font-semibold">Create a team survey</h2><p className="text-sm text-muted-foreground">No direct employee reference is attached to a response. A private keyed token prevents duplicate submissions; text answers are encrypted.</p></div><form onSubmit={createSurvey} className="space-y-3"><Input required maxLength={160} placeholder="Survey title" value={survey.title} onChange={event => setSurvey({ ...survey, title: event.target.value })} /><textarea maxLength={1000} placeholder="What is this survey about?" value={survey.description} onChange={event => setSurvey({ ...survey, description: event.target.value })} className="min-h-16 w-full rounded-md border bg-background p-3 text-sm" /><label className="block space-y-1 text-sm font-medium">Closes at<Input required type="datetime-local" min={new Date().toISOString().slice(0, 16)} value={survey.endsAt} onChange={event => setSurvey({ ...survey, endsAt: event.target.value })} /></label><div className="space-y-3">{survey.questions.map((question, index) => <div key={index} className="grid items-end gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_180px_auto]"><label className="space-y-1 text-xs font-medium">Question<Input required maxLength={240} value={question.prompt} onChange={event => setSurvey({ ...survey, questions: survey.questions.map((item, i) => i === index ? { ...item, prompt: event.target.value } : item) })} /></label><label className="space-y-1 text-xs font-medium">Answer type<select value={question.type} onChange={event => setSurvey({ ...survey, questions: survey.questions.map((item, i) => i === index ? { ...item, type: event.target.value as 'rating' | 'text' } : item) })} className="h-10 w-full rounded-md border bg-background px-3"><option value="rating">1–5 rating</option><option value="text">Text response</option></select></label><Button type="button" size="sm" variant="ghost" disabled={survey.questions.length <= 1} onClick={() => setSurvey({ ...survey, questions: survey.questions.filter((_, i) => i !== index) })}>Remove</Button></div>)}</div><Button type="button" variant="outline" disabled={survey.questions.length >= 20} onClick={() => setSurvey({ ...survey, questions: [...survey.questions, { prompt: '', type: 'rating', required: true }] })}><Plus className="mr-2 h-4 w-4" />Add question</Button><Button disabled={saving} className="ml-2">{saving ? 'Saving…' : 'Save as draft'}</Button></form></CardContent></Card>
        <section className="space-y-3"><h2 className="text-lg font-semibold">Manage surveys</h2>{managedSurveys.map(item => <Card key={item._id}><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold">{item.title}<span className="ml-2 rounded-full bg-muted px-2 py-1 text-xs capitalize">{item.status}</span></p><p className="text-xs text-muted-foreground">{item.questions.length} questions · {item.status === 'closed' ? 'Closed' : `Ends ${new Date(item.endsAt).toLocaleString()}`} · {item.resultsAvailable ? `${item.responseCount} responses` : 'Results private until 5 responses'}</p>{item.results && <div className="mt-2 space-y-2">{item.questions.map(question => { const result = item.results?.find(entry => entry.questionId === question._id); return <div key={question._id} className="rounded bg-muted px-2 py-1 text-xs"><strong>{question.prompt}:</strong> {question.type === 'rating' ? (result?.average == null ? 'Not enough answers' : `${result.average}/5 (${result.count})`) : result?.comments?.length ? <details className="mt-1"><summary className="cursor-pointer">View {result.count} responses without names</summary><ul className="mt-2 list-disc space-y-1 pl-5">{result.comments.map((comment, index) => <li key={index} className="whitespace-pre-wrap">{comment}</li>)}</ul></details> : 'Text responses hidden until at least five answers'}</div>; })}</div>}{item.history?.length ? <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">History ({item.history.length})</summary><ul className="mt-1">{item.history.map((event, index) => <li key={index}>{new Date(event.at).toLocaleString()} · {event.actor} · {event.status}</li>)}</ul></details> : null}</div>{item.status !== 'closed' && <Button size="sm" variant={item.status === 'draft' ? 'default' : 'outline'} onClick={() => void changeSurveyStatus(item)}>{item.status === 'draft' ? 'Open survey' : 'Close survey'}</Button>}</CardContent></Card>)}</section>
      </>}
    </>}
  </main>;
}
