'use client';

import type { PointerEvent as ReactPointerEvent, Ref } from 'react';
import { DAY_MS, isWeekend, todayDay, type Schedule, type ScheduledTask } from '@/lib/gantt/ganttEngine';

export type Zoom = 'day' | 'week' | 'month';
export type GanttRow =
  | { kind: 'phase'; phase: string; color: string; startDay: number; endDay: number }
  | { kind: 'task'; task: ScheduledTask };

export const ROW_HEIGHT = 36;
export const HEADER_HEIGHT = 52;
export const DAY_WIDTH: Record<Zoom, number> = { day: 34, week: 15, month: 4.5 };
const FONT = 'Inter, ui-sans-serif, system-ui, Arial, sans-serif';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const THEMES = {
  light: { bg: '#ffffff', header: '#f8fafc', grid: '#e5e7eb', gridStrong: '#d1d5db', text: '#111827', muted: '#6b7280', weekend: '#f3f4f6', phaseRow: '#f9fafb', arrow: '#9ca3af', selection: '#111827' },
  dark: { bg: '#0b0b0b', header: '#121212', grid: '#232323', gridStrong: '#333333', text: '#ededed', muted: '#9ca3af', weekend: '#141414', phaseRow: '#101010', arrow: '#6b7280', selection: '#ffffff' },
};

const date = (day: number) => new Date(day * DAY_MS);
const monthStart = (day: number) => Math.round(Date.UTC(date(day).getUTCFullYear(), date(day).getUTCMonth(), 1) / DAY_MS);
const nextMonth = (day: number) => Math.round(Date.UTC(date(day).getUTCFullYear(), date(day).getUTCMonth() + 1, 1) / DAY_MS);

/** Visible window around the project, snapped to clean boundaries for the current zoom. */
export function timelineRange(schedule: Schedule, zoom: Zoom): { start: number; end: number } {
  const today = todayDay();
  const from = Math.min(schedule.startDay, today);
  const to = Math.max(schedule.endDay, today + 1);
  if (zoom === 'month') return { start: monthStart(from), end: nextMonth(nextMonth(to)) };
  if (zoom === 'week') {
    const monday = from - ((date(from).getUTCDay() + 6) % 7);
    return { start: monday - 7, end: to + 21 };
  }
  return { start: from - 3, end: to + 7 };
}

type Props = {
  schedule: Schedule;
  rows: GanttRow[];
  zoom: Zoom;
  dark: boolean;
  selectedId: string | null;
  /** When > 0, draws its own task-name column on the left (used for image export). */
  labelWidth?: number;
  svgRef?: Ref<SVGSVGElement>;
  onSelect?: (id: string | null) => void;
  onBarPointerDown?: (event: ReactPointerEvent<SVGElement>, task: ScheduledTask, mode: 'move' | 'resize') => void;
  onPointerMove?: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerUp?: () => void;
};

export function GanttChart({ schedule, rows, zoom, dark, selectedId, labelWidth = 0, svgRef, onSelect, onBarPointerDown, onPointerMove, onPointerUp }: Props) {
  const theme = dark ? THEMES.dark : THEMES.light;
  const range = timelineRange(schedule, zoom);
  const dayWidth = DAY_WIDTH[zoom];
  const timelineWidth = (range.end - range.start) * dayWidth;
  const width = labelWidth + timelineWidth;
  const height = HEADER_HEIGHT + Math.max(rows.length, 1) * ROW_HEIGHT;
  const x = (day: number) => (day - range.start) * dayWidth;
  const rowY = new Map<string, number>();
  rows.forEach((row, index) => { if (row.kind === 'task') rowY.set(row.task.id, HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2); });
  const today = todayDay();

  const topCells: { from: number; to: number; label: string }[] = [];
  const bottomCells: { from: number; to: number; label: string; weekend?: boolean }[] = [];
  if (zoom === 'month') {
    for (let year = date(range.start).getUTCFullYear(); year <= date(range.end).getUTCFullYear(); year += 1) {
      const from = Math.max(range.start, Math.round(Date.UTC(year, 0, 1) / DAY_MS));
      const to = Math.min(range.end, Math.round(Date.UTC(year + 1, 0, 1) / DAY_MS));
      if (to > from) topCells.push({ from, to, label: String(year) });
    }
    for (let day = monthStart(range.start); day < range.end; day = nextMonth(day)) bottomCells.push({ from: Math.max(day, range.start), to: Math.min(nextMonth(day), range.end), label: MONTHS[date(day).getUTCMonth()] });
  } else {
    for (let day = monthStart(range.start); day < range.end; day = nextMonth(day)) {
      const from = Math.max(day, range.start);
      topCells.push({ from, to: Math.min(nextMonth(day), range.end), label: `${MONTHS[date(day).getUTCMonth()]} ${date(day).getUTCFullYear()}` });
    }
    if (zoom === 'day') for (let day = range.start; day < range.end; day += 1) bottomCells.push({ from: day, to: day + 1, label: String(date(day).getUTCDate()), weekend: isWeekend(day) });
    else for (let day = range.start; day < range.end; day += 7) bottomCells.push({ from: day, to: Math.min(day + 7, range.end), label: `${MONTHS[date(day).getUTCMonth()]} ${date(day).getUTCDate()}` });
  }

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fontFamily={FONT}
      style={{ display: 'block', userSelect: 'none', touchAction: 'pan-y' }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <defs>
        <marker id="gantt-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill={theme.arrow} />
        </marker>
      </defs>
      <rect width={width} height={height} fill={theme.bg} onClick={() => onSelect?.(null)} />

      {labelWidth > 0 && (
        <g>
          <rect width={labelWidth} height={height} fill={theme.bg} />
          <rect width={labelWidth} height={HEADER_HEIGHT} fill={theme.header} />
          <text x={16} y={HEADER_HEIGHT / 2 + 5} fontSize={12} fontWeight={600} fill={theme.muted}>TASK</text>
          {rows.map((row, index) => {
            const y = HEADER_HEIGHT + index * ROW_HEIGHT;
            return row.kind === 'phase' ? (
              <g key={`label-${row.phase}`}>
                <rect y={y} width={labelWidth} height={ROW_HEIGHT} fill={theme.phaseRow} />
                <rect x={0} y={y} width={4} height={ROW_HEIGHT} fill={row.color} />
                <text x={16} y={y + ROW_HEIGHT / 2 + 4} fontSize={13} fontWeight={700} fill={theme.text}>{row.phase}</text>
              </g>
            ) : (
              <g key={`label-${row.task.id}`}>
                <text x={28} y={y + ROW_HEIGHT / 2 + 4} fontSize={12} fill={theme.text}>{truncate(row.task.name, 30)}</text>
                {row.task.assignee && <text x={labelWidth - 12} y={y + ROW_HEIGHT / 2 + 4} fontSize={11} fill={theme.muted} textAnchor="end">{truncate(row.task.assignee, 12)}</text>}
              </g>
            );
          })}
          <line x1={labelWidth} x2={labelWidth} y1={0} y2={height} stroke={theme.gridStrong} />
        </g>
      )}

      <g transform={`translate(${labelWidth},0)`}>
        {/* Row backgrounds */}
        {rows.map((row, index) => (row.kind === 'phase' ? <rect key={`bg-${row.phase}`} y={HEADER_HEIGHT + index * ROW_HEIGHT} width={timelineWidth} height={ROW_HEIGHT} fill={theme.phaseRow} /> : null))}
        {/* Weekend shading */}
        {zoom === 'day' && bottomCells.filter((cell) => cell.weekend).map((cell) => <rect key={`we-${cell.from}`} x={x(cell.from)} y={HEADER_HEIGHT} width={dayWidth} height={height - HEADER_HEIGHT} fill={theme.weekend} />)}
        {/* Vertical grid */}
        {bottomCells.map((cell) => <line key={`grid-${cell.from}`} x1={x(cell.from)} x2={x(cell.from)} y1={HEADER_HEIGHT / 2} y2={height} stroke={theme.grid} />)}
        {/* Horizontal row lines */}
        {rows.map((_, index) => <line key={`row-${index}`} x1={0} x2={timelineWidth} y1={HEADER_HEIGHT + (index + 1) * ROW_HEIGHT} y2={HEADER_HEIGHT + (index + 1) * ROW_HEIGHT} stroke={theme.grid} />)}

        {/* Header */}
        <rect width={timelineWidth} height={HEADER_HEIGHT} fill={theme.header} />
        {topCells.map((cell) => (
          <g key={`top-${cell.from}`}>
            <line x1={x(cell.from)} x2={x(cell.from)} y1={0} y2={HEADER_HEIGHT / 2} stroke={theme.gridStrong} />
            <text x={x(cell.from) + 8} y={17} fontSize={12} fontWeight={600} fill={theme.text}>{(cell.to - cell.from) * dayWidth > 64 ? cell.label : ''}</text>
          </g>
        ))}
        {bottomCells.map((cell) => (
          <text key={`bottom-${cell.from}`} x={x(cell.from) + ((cell.to - cell.from) * dayWidth) / 2} y={HEADER_HEIGHT - 10} fontSize={zoom === 'day' ? 11 : 10.5} fill={cell.weekend ? theme.muted : theme.text} textAnchor="middle">{(cell.to - cell.from) * dayWidth >= 24 ? cell.label : ''}</text>
        ))}
        <line x1={0} x2={timelineWidth} y1={HEADER_HEIGHT / 2} y2={HEADER_HEIGHT / 2} stroke={theme.grid} />
        <line x1={0} x2={timelineWidth} y1={HEADER_HEIGHT} y2={HEADER_HEIGHT} stroke={theme.gridStrong} />

        {/* Today marker */}
        {today >= range.start && today < range.end && (
          <g>
            <line x1={x(today) + dayWidth / 2} x2={x(today) + dayWidth / 2} y1={HEADER_HEIGHT} y2={height} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3" />
            <rect x={x(today) + dayWidth / 2 - 20} y={HEADER_HEIGHT - 4} width={40} height={14} rx={7} fill="#ef4444" />
            <text x={x(today) + dayWidth / 2} y={HEADER_HEIGHT + 6} fontSize={9} fontWeight={700} fill="#ffffff" textAnchor="middle">TODAY</text>
          </g>
        )}

        {/* Dependency arrows */}
        {rows.map((row) => {
          if (row.kind !== 'task') return null;
          return row.task.dependsOn.map((dependencyId) => {
            const dependency = schedule.tasks.find((candidate) => candidate.id === dependencyId);
            const fromY = rowY.get(dependencyId);
            const toY = rowY.get(row.task.id);
            if (!dependency || fromY === undefined || toY === undefined) return null;
            const fromX = x(dependency.duration === 0 ? dependency.startDay : dependency.endDay) + (dependency.duration === 0 ? 6 : 0);
            const toX = x(row.task.startDay) - (row.task.duration === 0 ? 7 : 1);
            const elbow = fromX + 8;
            const d = toX - 8 >= elbow
              ? `M${fromX},${fromY} H${elbow} V${toY} H${toX}`
              : `M${fromX},${fromY} H${elbow} V${fromY + (toY > fromY ? ROW_HEIGHT / 2 : -ROW_HEIGHT / 2)} H${toX - 10} V${toY} H${toX}`;
            return <path key={`dep-${dependencyId}-${row.task.id}`} d={d} fill="none" stroke={theme.arrow} strokeWidth={1.25} markerEnd="url(#gantt-arrow)" />;
          });
        })}

        {/* Phase summary bars and task bars */}
        {rows.map((row, index) => {
          const top = HEADER_HEIGHT + index * ROW_HEIGHT;
          if (row.kind === 'phase') {
            return (
              <g key={`phase-${row.phase}`}>
                <rect x={x(row.startDay)} y={top + 13} width={Math.max((row.endDay - row.startDay) * dayWidth, 4)} height={10} rx={2} fill={row.color} />
                <text x={x(row.endDay) + 8} y={top + ROW_HEIGHT / 2 + 4} fontSize={12} fontWeight={700} fill={theme.text}>{row.phase}</text>
              </g>
            );
          }
          const task = row.task;
          const selected = task.id === selectedId;
          const center = top + ROW_HEIGHT / 2;
          const label = task.assignee ? `${task.name} · ${task.assignee}` : task.name;
          if (task.duration === 0) {
            const cx = x(task.startDay);
            return (
              <g key={task.id} style={{ cursor: onBarPointerDown ? 'grab' : 'default' }} onPointerDown={(event) => onBarPointerDown?.(event, task, 'move')} onClick={(event) => { event.stopPropagation(); onSelect?.(task.id); }}>
                <rect x={cx - 9} y={center - 9} width={18} height={18} fill="transparent" />
                <path d={`M${cx},${center - 8} L${cx + 8},${center} L${cx},${center + 8} L${cx - 8},${center} Z`} fill={task.color} stroke={selected ? theme.selection : 'none'} strokeWidth={2} />
                <text x={cx + 14} y={center + 4} fontSize={12} fontWeight={600} fill={theme.text}>{label}</text>
              </g>
            );
          }
          const barX = x(task.startDay);
          const barWidth = Math.max((task.endDay - task.startDay) * dayWidth, 3);
          return (
            <g key={task.id} onClick={(event) => { event.stopPropagation(); onSelect?.(task.id); }}>
              <rect x={barX} y={center - 10} width={barWidth} height={20} rx={5} fill={task.color} fillOpacity={0.28} stroke={selected ? theme.selection : task.color} strokeWidth={selected ? 2 : 1} style={{ cursor: onBarPointerDown ? 'grab' : 'default' }} onPointerDown={(event) => onBarPointerDown?.(event, task, 'move')} />
              {task.progress > 0 && <rect x={barX} y={center - 10} width={(barWidth * Math.min(task.progress, 100)) / 100} height={20} rx={5} fill={task.color} pointerEvents="none" />}
              {task.progress > 0 && barWidth >= 34 && <text x={barX + 8} y={center + 4} fontSize={10.5} fontWeight={700} fill={task.progress >= 50 ? '#ffffff' : theme.text} pointerEvents="none">{task.progress}%</text>}
              {onBarPointerDown && <rect x={barX + barWidth - 6} y={center - 10} width={10} height={20} fill="transparent" style={{ cursor: 'ew-resize' }} onPointerDown={(event) => onBarPointerDown(event, task, 'resize')} />}
              <text x={barX + barWidth + 8} y={center + 4} fontSize={12} fill={theme.text} pointerEvents="none">{label}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
