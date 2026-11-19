export const DAY_MS = 86_400_000;

export type GanttTask = {
  id: string;
  name: string;
  phase: string;
  assignee: string;
  /** Requested start (YYYY-MM-DD). Dependencies can push the real start later. */
  start: string;
  /** Length in days (working days when the project skips weekends). 0 = milestone. */
  duration: number;
  progress: number;
  dependsOn: string[];
  color: string;
};

export type GanttProject = { name: string; skipWeekends: boolean; tasks: GanttTask[] };

/** startDay/endDay are days since the Unix epoch; endDay is exclusive. */
export type ScheduledTask = GanttTask & { startDay: number; endDay: number };

export type Schedule = { tasks: ScheduledTask[]; startDay: number; endDay: number; cycle: string[] };

export const PHASE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

export function parseDay(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return Math.round(time / DAY_MS);
}

export function formatDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function todayDay(): number {
  const now = new Date();
  return Math.round(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS);
}

export function isWeekend(day: number): boolean {
  const weekday = new Date(day * DAY_MS).getUTCDay();
  return weekday === 0 || weekday === 6;
}

export function nextWorkday(day: number): number {
  let current = day;
  while (isWeekend(current)) current += 1;
  return current;
}

/** Exclusive end day after spending `duration` days starting at `start`. */
export function addDuration(start: number, duration: number, skipWeekends: boolean): number {
  if (!skipWeekends) return start + duration;
  let day = start;
  let remaining = duration;
  while (remaining > 0) {
    if (!isWeekend(day)) remaining -= 1;
    day += 1;
  }
  return day;
}

export function countDays(start: number, endExclusive: number, skipWeekends: boolean): number {
  if (!skipWeekends) return Math.max(0, endExclusive - start);
  let count = 0;
  for (let day = start; day < endExclusive; day += 1) if (!isWeekend(day)) count += 1;
  return count;
}

/** Finish-to-start scheduling: a task starts at its requested date or when its last dependency ends, whichever is later. */
export function scheduleProject(project: GanttProject): Schedule {
  const byId = new Map(project.tasks.map((task) => [task.id, task]));
  const done = new Map<string, ScheduledTask>();
  const visiting = new Set<string>();
  const cycle = new Set<string>();
  const fallbackStart = todayDay();

  const visit = (task: GanttTask): ScheduledTask => {
    const existing = done.get(task.id);
    if (existing) return existing;
    visiting.add(task.id);
    let start = parseDay(task.start) ?? fallbackStart;
    for (const dependencyId of task.dependsOn) {
      const dependency = byId.get(dependencyId);
      if (!dependency || dependencyId === task.id) continue;
      if (visiting.has(dependencyId)) {
        cycle.add(dependencyId);
        cycle.add(task.id);
        continue;
      }
      start = Math.max(start, visit(dependency).endDay);
    }
    visiting.delete(task.id);
    if (project.skipWeekends) start = nextWorkday(start);
    const duration = Math.max(0, Math.round(task.duration));
    const scheduled = { ...task, startDay: start, endDay: duration > 0 ? addDuration(start, duration, project.skipWeekends) : start };
    done.set(task.id, scheduled);
    return scheduled;
  };

  const tasks = project.tasks.map(visit);
  const startDay = tasks.length ? Math.min(...tasks.map((task) => task.startDay)) : fallbackStart;
  const endDay = tasks.length ? Math.max(startDay + 1, ...tasks.map((task) => Math.max(task.endDay, task.startDay + 1))) : fallbackStart + 1;
  return { tasks, startDay, endDay, cycle: Array.from(cycle) };
}

/** Phases in first-appearance order, each with its tasks in project order. */
export function groupByPhase<T extends GanttTask>(tasks: T[]): { phase: string; tasks: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const task of tasks) {
    const key = task.phase.trim() || 'Tasks';
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }
  return Array.from(groups.entries()).map(([phase, phaseTasks]) => ({ phase, tasks: phaseTasks }));
}

/** True when `candidateId` already (directly or indirectly) depends on `taskId` — linking them would create a loop. */
export function wouldCreateCycle(tasks: GanttTask[], taskId: string, candidateId: string): boolean {
  if (taskId === candidateId) return true;
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const stack = [candidateId];
  const seen = new Set<string>();
  while (stack.length) {
    const current = stack.pop()!;
    if (current === taskId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(byId.get(current)?.dependsOn ?? []));
  }
  return false;
}

import { GANTT_TEMPLATES, type GanttTemplate } from './ganttTemplates';
export { GANTT_TEMPLATES, type GanttTemplate };

export type PromptAnswers = {
  name: string;
  templateId: string;
  startDate: string;
  deadline: string | null;
  team: string[];
  skipWeekends: boolean;
  /** Template task name -> person. Tasks left out are spread round-robin across the team. */
  assignments?: Record<string, string>;
};

/** The work tasks (not milestones) a template will create, in order — what the wizard asks people to assign. */
export function templateWorkTasks(templateId: string): { phase: string; name: string; duration: number }[] {
  const template = GANTT_TEMPLATES.find((candidate) => candidate.id === templateId);
  if (!template) return [];
  return template.phases.flatMap((phase) => phase.tasks.filter((task) => task.duration > 0).map((task) => ({ phase: phase.name, name: task.name, duration: task.duration })));
}

/** Round-robin default used both as the wizard's starting assignment and as the fallback in generateProject. */
export function defaultAssignments(templateId: string, team: string[]): Record<string, string> {
  const members = team.map((member) => member.trim()).filter(Boolean);
  if (!members.length) return {};
  return Object.fromEntries(templateWorkTasks(templateId).map((task, index) => [task.name, members[index % members.length]]));
}

/** Template length in days (critical path, at the template's own durations). */
export function templateLength(templateId: string, startDate: string, skipWeekends: boolean): number {
  const project = generateProject({ name: '', templateId, startDate, deadline: null, team: [], skipWeekends });
  const schedule = scheduleProject(project);
  return countDays(schedule.startDay, schedule.endDay, skipWeekends);
}

export function newTaskId(): string {
  return `t${Math.random().toString(36).slice(2, 10)}`;
}

/** Turns the wizard's answers into a project, stretching or compressing the template to fit the deadline when one is given. */
export function generateProject(answers: PromptAnswers): GanttProject {
  const template = GANTT_TEMPLATES.find((candidate) => candidate.id === answers.templateId) ?? GANTT_TEMPLATES[0];
  const flat = template.phases.flatMap((phase, phaseIndex) => phase.tasks.map((task) => ({ ...task, phase: phase.name, color: PHASE_COLORS[phaseIndex % PHASE_COLORS.length] })));
  const ids = flat.map((_, index) => `t${index + 1}`);
  const idByName = new Map(flat.map((task, index) => [task.name, ids[index]]));
  const fallback = defaultAssignments(template.id, answers.team);
  const tasks: GanttTask[] = flat.map((task, index) => ({
    id: ids[index],
    name: task.name,
    phase: task.phase,
    assignee: task.duration > 0 ? (answers.assignments?.[task.name] ?? fallback[task.name] ?? '') : '',
    start: answers.startDate,
    duration: task.duration,
    progress: 0,
    dependsOn: task.after ? task.after.map((name) => idByName.get(name)).filter((id): id is string => Boolean(id)) : index > 0 ? [ids[index - 1]] : [],
    color: task.color,
  }));
  const project: GanttProject = { name: answers.name.trim() || template.name, skipWeekends: answers.skipWeekends, tasks };
  return answers.deadline ? fitToDeadline(project, answers.startDate, answers.deadline) : project;
}

export function fitToDeadline(project: GanttProject, startDate: string, deadline: string): GanttProject {
  const start = parseDay(startDate);
  const end = parseDay(deadline);
  if (start === null || end === null || end < start) return project;
  const available = countDays(start, end + 1, project.skipWeekends);
  const base = scheduleProject(project);
  const baseLength = countDays(base.startDay, base.endDay, project.skipWeekends);
  if (!available || !baseLength) return project;
  const factor = available / baseLength;
  let tasks = project.tasks.map((task) => (task.duration > 0 ? { ...task, duration: Math.max(1, Math.round(task.duration * factor)) } : task));
  // Rounding can overshoot by a few days; trim the longest tasks until the plan fits (or nothing can shrink further).
  for (let guard = 0; guard < 1000; guard += 1) {
    const schedule = scheduleProject({ ...project, tasks });
    if (schedule.endDay <= end + 1) break;
    const longest = tasks.reduce((best, task) => (task.duration > best.duration ? task : best), tasks[0]);
    if (!longest || longest.duration <= 1) break;
    tasks = tasks.map((task) => (task.id === longest.id ? { ...task, duration: task.duration - 1 } : task));
  }
  return { ...project, tasks };
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function projectToCsv(project: GanttProject): string {
  const schedule = scheduleProject(project);
  const names = new Map(project.tasks.map((task) => [task.id, task.name]));
  const header = ['Phase', 'Task', 'Assignee', 'Start', 'End', 'Duration (days)', 'Progress (%)', 'Depends on', 'Milestone'];
  const rows = schedule.tasks.map((task) => [
    task.phase, task.name, task.assignee, formatDay(task.startDay), formatDay(Math.max(task.startDay, task.endDay - 1)),
    task.duration, task.progress, task.dependsOn.map((id) => names.get(id) ?? id).join('; '), task.duration === 0 ? 'Yes' : 'No',
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

/** Validates an imported JSON file so a malformed upload can't crash the editor. */
export function parseProject(json: string): GanttProject {
  const data = JSON.parse(json) as Partial<GanttProject>;
  if (!data || typeof data !== 'object' || !Array.isArray(data.tasks)) throw new Error('This file is not a Gantt chart export.');
  const tasks = data.tasks.map((raw, index): GanttTask => {
    const task = raw as Partial<GanttTask>;
    if (typeof task.name !== 'string' || typeof task.start !== 'string' || parseDay(task.start) === null) throw new Error(`Task ${index + 1} is missing a name or a valid start date.`);
    return {
      id: typeof task.id === 'string' && task.id ? task.id : newTaskId(),
      name: task.name,
      phase: typeof task.phase === 'string' ? task.phase : '',
      assignee: typeof task.assignee === 'string' ? task.assignee : '',
      start: task.start,
      duration: Number.isFinite(task.duration) ? Math.max(0, Math.round(task.duration as number)) : 1,
      progress: Number.isFinite(task.progress) ? Math.min(100, Math.max(0, task.progress as number)) : 0,
      dependsOn: Array.isArray(task.dependsOn) ? task.dependsOn.filter((id): id is string => typeof id === 'string') : [],
      color: typeof task.color === 'string' && /^#[0-9a-f]{6}$/i.test(task.color) ? task.color : PHASE_COLORS[0],
    };
  });
  return { name: typeof data.name === 'string' ? data.name : 'Imported project', skipWeekends: Boolean(data.skipWeekends), tasks };
}
