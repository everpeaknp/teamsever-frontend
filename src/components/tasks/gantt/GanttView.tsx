'use client';

import { useMemo, useRef, useState } from 'react';
import { Task } from '@/types';
import {
  GanttChart,
  ROW_HEIGHT,
  type Zoom,
  type GanttRow,
} from './GanttChart';
import {
  scheduleProject,
  groupByPhase,
  projectToCsv,
  generateProject,
  countDays,
  parseDay,
  todayDay,
  formatDay,
  type GanttProject,
  type GanttTask,
  type PromptAnswers,
} from '@/lib/gantt/ganttEngine';
import { GanttWizard } from './GanttWizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  Sparkles,
  Search,
  RefreshCw,
  X,
  FileSpreadsheet,
  FileImage,
  Printer,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface GanttViewProps {
  tasks: Task[];
  listName?: string;
  onTaskClick?: (task: Task) => void;
  isReadOnly?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#10b981',
};

export function GanttView({ tasks, listName = 'Tasks', onTaskClick }: GanttViewProps) {
  const [zoom, setZoom] = useState<Zoom>('week');
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardProject, setWizardProject] = useState<GanttProject | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Convert workspace tasks to GanttTasks
  const liveProject = useMemo<GanttProject>(() => {
    if (wizardProject) return wizardProject;

    const ganttTasks: GanttTask[] = tasks.map((t) => {
      const startStr = t.createdAt ? t.createdAt.slice(0, 10) : formatDay(todayDay());
      const dueStr = t.dueDate ? t.dueDate.slice(0, 10) : t.deadline ? t.deadline.slice(0, 10) : null;
      let duration = 3;
      if (dueStr) {
        const startDayVal = parseDay(startStr) ?? todayDay();
        const dueDayVal = parseDay(dueStr) ?? startDayVal + 3;
        duration = Math.max(1, countDays(startDayVal, dueDayVal + 1, skipWeekends));
      }

      const progress = t.status === 'done' ? 100 : t.status === 'review' ? 75 : t.status === 'inprogress' ? 50 : 0;
      const assigneeName = typeof t.assignee === 'object' && t.assignee ? (t.assignee as any).name || '' : '';

      return {
        id: t._id,
        name: t.title || 'Untitled Task',
        phase: listName,
        assignee: assigneeName,
        start: startStr,
        duration,
        progress,
        dependsOn: [],
        color: PRIORITY_COLORS[t.priority] || '#3b82f6',
      };
    });

    return {
      name: listName,
      skipWeekends,
      tasks: ganttTasks,
    };
  }, [tasks, listName, skipWeekends, wizardProject]);

  const schedule = useMemo(() => scheduleProject(liveProject), [liveProject]);

  const rows = useMemo<GanttRow[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    const filteredTasks = schedule.tasks.filter((t) => {
      if (!query) return true;
      return t.name.toLowerCase().includes(query) || t.assignee.toLowerCase().includes(query);
    });

    const phases = groupByPhase(filteredTasks);
    const result: GanttRow[] = [];
    phases.forEach((p) => {
      const phaseStart = p.tasks.length ? Math.min(...p.tasks.map((t) => t.startDay)) : schedule.startDay;
      const phaseEnd = p.tasks.length ? Math.max(...p.tasks.map((t) => t.endDay)) : schedule.endDay;
      result.push({ kind: 'phase', phase: p.phase, color: '#6366f1', startDay: phaseStart, endDay: phaseEnd });
      p.tasks.forEach((t) => result.push({ kind: 'task', task: t }));
    });
    return result;
  }, [schedule, searchQuery]);

  const handleExportCsv = () => {
    const csv = projectToCsv(liveProject);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${liveProject.name.replace(/\s+/g, '_')}_Gantt.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgRef.current);
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${liveProject.name.replace(/\s+/g, '_')}_Gantt.svg`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPng = () => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgEl);
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const bbox = svgEl.getBoundingClientRect();
    const width = Math.max(1000, bbox.width || 1200);
    const height = Math.max(400, bbox.height || 600);

    const img = new Image();
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; // retina 2x quality
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
        ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.setAttribute('download', `${liveProject.name.replace(/\s+/g, '_')}_Gantt.png`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWizardComplete = (answers: PromptAnswers) => {
    const generated = generateProject(answers);
    setWizardProject(generated);
    setShowWizard(false);
  };

  if (showWizard) {
    return (
      <div className="p-4 sm:p-6 bg-card rounded-2xl border border-border">
        <GanttWizard onComplete={handleWizardComplete} onCancel={() => setShowWizard(false)} />
      </div>
    );
  }

  const selectedTaskObj = selectedId ? tasks.find((t) => t._id === selectedId) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter tasks or assignees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          {searchQuery && (
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setSearchQuery('')}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom Selector */}
          <div className="flex items-center rounded-lg bg-muted p-1">
            <button
              onClick={() => setZoom('day')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                zoom === 'day' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setZoom('week')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                zoom === 'week' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setZoom('month')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                zoom === 'month' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Month
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSkipWeekends((prev) => !prev)}
            className="text-xs h-8"
          >
            {skipWeekends ? 'Weekdays Only' : 'Include Weekends'}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Export
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs">Export Timeline</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportPng} className="text-xs cursor-pointer gap-2">
                <FileImage className="h-3.5 w-3.5 text-blue-500" />
                <span>Export as PNG Image</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportSvg} className="text-xs cursor-pointer gap-2">
                <Layers className="h-3.5 w-3.5 text-indigo-500" />
                <span>Export as Vector SVG</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCsv} className="text-xs cursor-pointer gap-2">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                <span>Export Tasks as CSV</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePrint} className="text-xs cursor-pointer gap-2">
                <Printer className="h-3.5 w-3.5 text-amber-500" />
                <span>Print / Save as PDF</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="default"
            size="sm"
            onClick={() => setShowWizard(true)}
            className="text-xs h-8 gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Gantt Wizard
          </Button>

          {wizardProject && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWizardProject(null)}
              className="text-xs h-8 gap-1 text-muted-foreground"
            >
              <RefreshCw className="h-3 w-3" />
              Reset to Live Tasks
            </Button>
          )}
        </div>
      </div>

      {/* Gantt Timeline Container */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto overflow-y-auto max-h-[680px]">
          <GanttChart
            svgRef={svgRef}
            schedule={schedule}
            rows={rows}
            zoom={zoom}
            dark={typeof document !== 'undefined' && document.documentElement.classList.contains('dark')}
            selectedId={selectedId}
            labelWidth={220}
            onSelect={(id) => {
              setSelectedId(id);
              if (id) {
                const found = tasks.find((t) => t._id === id);
                if (found && onTaskClick) onTaskClick(found);
              }
            }}
          />
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{schedule.tasks.length} total tasks</span>
          <span>·</span>
          <span>{schedule.tasks.filter((t) => t.progress === 100).length} completed</span>
          <span>·</span>
          <span>{schedule.endDay - schedule.startDay} days timeline</span>
        </div>
        {selectedTaskObj && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs capitalize">
              {selectedTaskObj.status}
            </Badge>
            <span className="font-medium text-foreground">{selectedTaskObj.title}</span>
          </div>
        )}
      </div>
    </div>
  );
}
