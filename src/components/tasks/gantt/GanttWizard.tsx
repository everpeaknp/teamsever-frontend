'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { ArrowLeft, ArrowRight, Check, Info, RefreshCw, Sparkles, TriangleAlert, Calendar } from 'lucide-react';
import {
  countDays, defaultAssignments, formatDay, GANTT_TEMPLATES, parseDay, templateLength, templateWorkTasks, todayDay, type PromptAnswers,
} from '@/lib/gantt/ganttEngine';

type Step = 'name' | 'template' | 'start' | 'deadline' | 'team' | 'assign' | 'weekends' | 'review';

const QUESTIONS: Record<Step, string> = {
  name: 'What are you planning? Give your project a name.',
  template: 'What kind of project is it? I’ll start you from a matching template.',
  start: 'When does work start?',
  deadline: 'Is there a deadline? I’ll fit the schedule to it.',
  team: 'Who’s on the team?',
  assign: 'Who’s doing what? Pick a person for each task.',
  weekends: 'Should the schedule skip weekends?',
  review: 'Here’s what I’ve got. Ready to build your chart?',
};

const HINTS: Record<Step, string> = {
  name: 'This becomes the chart title and the file name when you export. Example: “Mobile App v2 Launch”.',
  template: 'Each template comes with phases, tasks, dependencies, and milestones. You can rename, add, or delete anything afterwards.',
  start: 'The first task begins on this date. Later tasks are scheduled after the ones they depend on.',
  deadline: 'Pick the date everything must be finished by and every task is stretched or shortened to fit. Skip it to keep the template’s typical durations.',
  team: 'Type each person’s name separated by a comma, for example: Sara, Mike, Priya. Leave it empty if you’re working alone.',
  assign: 'I’ve shared the tasks out evenly to start. Change any of them below. Milestones are checkpoints, so they don’t get an owner.',
  weekends: 'Skipping weekends schedules work Monday to Friday only, so a 5-day task takes one working week.',
  review: 'Everything can still be changed in the editor: drag bars, rename tasks, change owners, and link dependencies.',
};

const iconFor = (name: string) => (LucideIcons as unknown as Record<string, typeof Sparkles>)[name] ?? Sparkles;
const prettyDate = (value: string) => {
  const day = parseDay(value);
  return day === null ? value : new Date(day * 86_400_000).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
};
const parseTeam = (text: string) => Array.from(new Set(text.split(',').map((member) => member.trim()).filter(Boolean)));

export function GanttWizard({ onComplete, onCancel }: { onComplete: (answers: PromptAnswers) => void; onCancel?: () => void }) {
  const [step, setStep] = useState<Step>('name');
  const [answers, setAnswers] = useState<PromptAnswers>({ name: '', templateId: '', startDate: formatDay(todayDay()), deadline: null, team: [], skipWeekends: true, assignments: {} });
  const [teamText, setTeamText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLDivElement>(null);

  const steps = useMemo<Step[]>(() => ['name', 'template', 'start', 'deadline', 'team', ...(answers.team.length ? ['assign' as Step] : []), 'weekends', 'review'], [answers.team.length]);
  const index = steps.indexOf(step);
  const template = GANTT_TEMPLATES.find((candidate) => candidate.id === answers.templateId);
  const typedTeam = parseTeam(teamText);
  const workTasks = useMemo(() => templateWorkTasks(answers.templateId), [answers.templateId]);

  useEffect(() => { current.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [step]);

  const go = (next: Step) => { setError(null); setStep(next); };
  const nextStep = (from: Step, team = answers.team) => {
    const order: Step[] = ['name', 'template', 'start', 'deadline', 'team', ...(team.length ? ['assign' as Step] : []), 'weekends', 'review'];
    return order[order.indexOf(from) + 1];
  };

  const advance = () => {
    if (step === 'name' && !answers.name.trim()) return setError('Give the project a name first.');
    if (step === 'template' && !answers.templateId) return setError('Pick a project type.');
    if (step === 'start' && parseDay(answers.startDate) === null) return setError('Choose a valid start date.');
    if (step === 'deadline' && answers.deadline) {
      const deadline = parseDay(answers.deadline);
      if (deadline === null) return setError('Choose a valid deadline, or press “No fixed deadline”.');
      if (deadline <= parseDay(answers.startDate)!) return setError('The deadline has to be after the start date.');
    }
    if (step === 'team') {
      const team = typedTeam;
      const fallback = defaultAssignments(answers.templateId, team);
      const kept = Object.fromEntries(Object.entries(answers.assignments ?? {}).filter(([, person]) => person === '' || team.includes(person)));
      setAnswers({ ...answers, team, assignments: { ...fallback, ...kept } });
      return go(nextStep('team', team));
    }
    go(nextStep(step));
  };

  const pickTemplate = (templateId: string) => setAnswers((currentAnswers) => ({ ...currentAnswers, templateId, assignments: defaultAssignments(templateId, currentAnswers.team) }));

  const answerLabel = (target: Step): string => {
    if (target === 'name') return answers.name;
    if (target === 'template') return template?.name ?? '';
    if (target === 'start') return prettyDate(answers.startDate);
    if (target === 'deadline') return answers.deadline ? prettyDate(answers.deadline) : 'No fixed deadline';
    if (target === 'team') return answers.team.length ? answers.team.join(', ') : 'Just me';
    if (target === 'assign') {
      const counts = answers.team.map((person) => `${person} (${workTasks.filter((task) => answers.assignments?.[task.name] === person).length})`);
      const open = workTasks.filter((task) => !answers.assignments?.[task.name]).length;
      return [...counts, ...(open ? [`${open} unassigned`] : [])].join(' · ');
    }
    if (target === 'weekends') return answers.skipWeekends ? 'Skip weekends (Mon–Fri)' : 'Work every day';
    return '';
  };

  const squeeze = useMemo(() => {
    if (!answers.deadline || !answers.templateId) return null;
    const start = parseDay(answers.startDate);
    const end = parseDay(answers.deadline);
    if (start === null || end === null) return null;
    const available = countDays(start, end + 1, answers.skipWeekends);
    const usual = templateLength(answers.templateId, answers.startDate, answers.skipWeekends);
    return { available, usual };
  }, [answers.deadline, answers.templateId, answers.startDate, answers.skipWeekends]);

  const unit = answers.skipWeekends ? 'working days' : 'days';
  const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary';
  const primary = 'inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90';
  const secondary = 'inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted';

  return (
    <div ref={top} className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Gantt Chart Maker</h2>
          <p className="mt-1 text-sm text-muted-foreground">Answer a few questions and get a ready-to-edit project timeline.</p>
        </div>
        {onCancel && <button type="button" onClick={onCancel} className={secondary}>Back to my chart</button>}
      </div>

      <div className="mb-2 flex gap-1.5" aria-hidden="true">
        {steps.map((candidate, position) => <div key={candidate} className={`h-1 flex-1 rounded-full ${position <= index ? 'bg-primary' : 'bg-muted'}`} />)}
      </div>
      <p className="mb-4 text-xs text-muted-foreground">Question {index + 1} of {steps.length}</p>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        {steps.slice(0, index).map((done) => (
          <div key={done} className="space-y-2">
            <Bubble>{QUESTIONS[done]}</Bubble>
            <div className="flex justify-end">
              <button type="button" onClick={() => go(done)} title="Change this answer" className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-left text-sm text-primary-foreground hover:opacity-90">{answerLabel(done)}</button>
            </div>
          </div>
        ))}

        <div ref={current}>
          <Bubble>{QUESTIONS[step]}</Bubble>
          <div className="mt-2 pl-11">
            <p className="mb-3 flex gap-1.5 text-xs leading-5 text-muted-foreground"><Info size={14} className="mt-0.5 shrink-0" /> {HINTS[step]}</p>

            {step === 'name' && (
              <input autoFocus value={answers.name} onChange={(event) => setAnswers({ ...answers, name: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && advance()} placeholder="Project name" className={inputClass} />
            )}

            {step === 'template' && (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {GANTT_TEMPLATES.map((candidate) => {
                  const Icon = iconFor(candidate.icon);
                  const active = candidate.id === answers.templateId;
                  const taskCount = candidate.phases.reduce((total, phase) => total + phase.tasks.length, 0);
                  return (
                    <button key={candidate.id} type="button" onClick={() => pickTemplate(candidate.id)} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${active ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}>
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"><Icon size={16} /></span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">{candidate.name}</span>
                        <span className="block text-xs text-muted-foreground">{candidate.description}</span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">{candidate.phases.map((phase) => phase.name).join(' → ')} · {taskCount} tasks</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 'start' && <input type="date" autoFocus value={answers.startDate} onChange={(event) => setAnswers({ ...answers, startDate: event.target.value })} className={`${inputClass} max-w-xs`} />}

            {step === 'deadline' && (
              <div className="flex flex-wrap items-center gap-2">
                <input type="date" value={answers.deadline ?? ''} min={answers.startDate} onChange={(event) => setAnswers({ ...answers, deadline: event.target.value || null })} className={`${inputClass} max-w-xs`} />
                <button type="button" onClick={() => { setAnswers({ ...answers, deadline: null }); go('team'); }} className={secondary}>No fixed deadline</button>
              </div>
            )}

            {step === 'team' && (
              <div>
                <input autoFocus value={teamText} onChange={(event) => setTeamText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && advance()} placeholder="Sara, Mike, Priya" className={inputClass} />
                {typedTeam.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{typedTeam.length} {typedTeam.length === 1 ? 'person' : 'people'}:</span>
                    {typedTeam.map((person) => <span key={person} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">{person}</span>)}
                  </div>
                )}
              </div>
            )}

            {step === 'assign' && (
              <div>
                <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
                  {workTasks.map((task, position) => (
                    <div key={task.name}>
                      {(position === 0 || workTasks[position - 1].phase !== task.phase) && (
                        <p className="border-b border-border bg-muted/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{task.phase}</p>
                      )}
                      <label className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-foreground">{task.name}</span>
                          <span className="block text-[11px] text-muted-foreground">about {task.duration} {task.duration === 1 ? unit.replace(/s$/, '') : unit}</span>
                        </span>
                        <select
                          value={answers.assignments?.[task.name] ?? ''}
                          onChange={(event) => setAnswers({ ...answers, assignments: { ...answers.assignments, [task.name]: event.target.value } })}
                          className="w-36 shrink-0 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                        >
                          <option value="">Unassigned</option>
                          {answers.team.map((person) => <option key={person} value={person}>{person}</option>)}
                        </select>
                      </label>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setAnswers({ ...answers, assignments: defaultAssignments(answers.templateId, answers.team) })} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                  <RefreshCw size={12} /> Share out evenly again
                </button>
              </div>
            )}

            {step === 'weekends' && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setAnswers({ ...answers, skipWeekends: true }); go('review'); }} className={answers.skipWeekends ? primary : secondary}>Skip weekends (Mon–Fri)</button>
                <button type="button" onClick={() => { setAnswers({ ...answers, skipWeekends: false }); go('review'); }} className={!answers.skipWeekends ? primary : secondary}>Work every day</button>
              </div>
            )}

            {step === 'review' && (
              <div className="space-y-3">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-xl border border-border bg-muted/20 p-4 text-sm">
                  {steps.filter((field) => field !== 'review').map((field) => (
                    <div key={field} className="contents">
                      <dt className="text-muted-foreground">{{ name: 'Name', template: 'Type', start: 'Start', deadline: 'Deadline', team: 'Team', assign: 'Tasks', weekends: 'Weekends', review: '' }[field]}</dt>
                      <dd className="text-foreground">{answerLabel(field)}</dd>
                    </div>
                  ))}
                </dl>
                {squeeze && squeeze.available < squeeze.usual * 0.6 && (
                  <p className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-400">
                    <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                    This template usually takes about {squeeze.usual} {unit}, but your deadline leaves {squeeze.available}. Every task will be shortened a lot. Consider a later deadline or adjusting tasks afterwards.
                  </p>
                )}
                {squeeze && squeeze.available >= squeeze.usual * 0.6 && (
                  <p className="text-xs text-muted-foreground">This template usually takes about {squeeze.usual} {unit}; it’ll be fitted into the {squeeze.available} you have.</p>
                )}
              </div>
            )}

            {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {index > 0 && <button type="button" onClick={() => go(steps[index - 1])} className={secondary}><ArrowLeft size={15} /> Back</button>}
              {step === 'review'
                ? <button type="button" onClick={() => onComplete(answers)} className={primary}><Check size={15} /> Build my Gantt chart</button>
                : step !== 'weekends' && <button type="button" onClick={advance} className={primary}>{step === 'team' && !typedTeam.length ? 'Skip, it’s just me' : 'Next'} <ArrowRight size={15} /></button>}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start from a template</p>
        <p className="mb-3 text-xs text-muted-foreground">Picks the template for you. You’ll still be asked for the name, dates, and who’s doing what.</p>
        <div className="flex flex-wrap gap-2">
          {GANTT_TEMPLATES.map((candidate) => {
            const Icon = iconFor(candidate.icon);
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => { pickTemplate(candidate.id); go(answers.name.trim() ? 'start' : 'name'); top.current?.scrollIntoView({ behavior: 'smooth' }); }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted ${answers.templateId === candidate.id ? 'border-primary' : 'border-border'}`}
              >
                <Icon size={13} /> {candidate.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Calendar size={16} />
      </div>
      <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted/60 px-3.5 py-2 text-sm text-foreground">{children}</p>
    </div>
  );
}
