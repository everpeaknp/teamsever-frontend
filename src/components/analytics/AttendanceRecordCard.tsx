'use client';

import { format, parseISO } from 'date-fns';
import { CalendarDays, Clock3, MapPin } from 'lucide-react';
import type { AttendanceReportEntry } from './attendanceReportTypes';

const sourceLabel = (source?: AttendanceReportEntry['clockInSource'] | AttendanceReportEntry['clockOutSource']) => {
  if (source === 'desktop') return 'Trusted desktop';
  if (source === 'mobile') return 'Mobile app';
  if (source === 'web') return 'Web';
  return 'Not recorded';
};

function coordinates(location?: { latitude?: number; longitude?: number } | null) {
  if (location?.latitude != null && location.longitude != null) {
    return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
  }
  return location ? 'Location hidden' : 'Location not recorded';
}

function AttendanceLocationDetails({ entry }: { entry: AttendanceReportEntry }) {
  const hasLocation = !!entry.clockInLocation || !!entry.clockOutLocation || !!entry.clockInVerificationMethod || !!entry.locationReviewReason;
  return (
    <details className="mt-3 border-t border-border/70 pt-2.5 text-sm">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <MapPin aria-hidden="true" className="h-4 w-4" />
        <span>Location details</span>
        {entry.clockInVerificationMethod && <span className="ml-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">Location verified</span>}
      </summary>
      <div className="grid min-w-0 grid-cols-1 gap-3 pb-1 pt-2 min-[440px]:grid-cols-2">
        <section className="min-w-0 rounded-lg bg-muted/40 p-3" aria-label="Clock-in location details">
          <h3 className="font-medium">Clock-in location</h3>
          <p className="mt-1 break-words text-muted-foreground">{entry.clockInLocation?.areaName || (entry.attendanceMode === 'remote' ? 'Remote area' : 'Office')}</p>
          <p className="break-words text-xs text-muted-foreground">{coordinates(entry.clockInLocation)}</p>
          <p className="text-xs text-muted-foreground">Source: {sourceLabel(entry.clockInSource)}</p>
          {entry.clockInVerificationMethod && <p className="mt-2 text-xs text-muted-foreground">{entry.clockInVerificationMethod === 'network_confirmed' ? 'GPS was imprecise; the registered network also matched and the location uncertainty overlapped this area.' : 'The GPS location matched an allowed attendance area.'}</p>}
        </section>
        <section className="min-w-0 rounded-lg bg-muted/40 p-3" aria-label="Clock-out location details">
          <h3 className="font-medium">Clock-out location</h3>
          <p className="mt-1 break-words text-muted-foreground">{coordinates(entry.clockOutLocation)}</p>
          {entry.clockOutLocation?.distanceFromClockInMeters != null && <p className={entry.clockOutLocation.withinRange ? 'text-xs text-emerald-600 dark:text-emerald-400' : 'text-xs text-amber-600'}>{entry.clockOutLocation.distanceFromClockInMeters} m from clock-in</p>}
          <p className="text-xs text-muted-foreground">Source: {sourceLabel(entry.clockOutSource)}</p>
          {entry.locationReviewReason && <p className="mt-2 break-words text-xs text-amber-600 dark:text-amber-400">Review: {entry.locationReviewReason}</p>}
          {!hasLocation && <p className="mt-1 text-xs text-muted-foreground">No location audit details were recorded for this shift.</p>}
        </section>
      </div>
    </details>
  );
}

export function AttendanceRecordCard({ entry }: { entry: AttendanceReportEntry }) {
  const running = entry.clockOut === 'Running' || entry.clockOut.includes('Running');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
    ? format(parseISO(`${entry.date}T00:00:00`), 'EEE, MMM d, yyyy')
    : entry.date;

  return (
    <article className="min-w-0 rounded-xl border border-border bg-card p-3.5 text-card-foreground shadow-sm sm:p-4" aria-label={`Attendance record for ${entry.userName}`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold" aria-hidden="true">{entry.userName.trim().charAt(0).toUpperCase() || '?'}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-5">{entry.userName}</p>
          <p className="truncate text-xs text-muted-foreground">{entry.userEmail}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${running ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
          {running ? 'Running' : 'Completed'}
        </span>
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        <time className="truncate">{date}</time>
        {entry.attendanceMode && <span className="ml-auto shrink-0 capitalize">{entry.attendanceMode === 'onsite' ? 'On-site' : 'Remote'}</span>}
      </div>

      <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-3 gap-y-3 rounded-lg bg-muted/35 p-3">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Check in</dt>
          <dd className="mt-0.5 truncate font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{format(new Date(entry.clockIn), 'p')}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Check out</dt>
          <dd className={`mt-0.5 truncate font-semibold tabular-nums ${running ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>{running ? 'Running' : format(new Date(entry.clockOut), 'p')}</dd>
        </div>
        <div className="col-span-2 flex min-w-0 items-center gap-1.5 border-t border-border/70 pt-2">
          <Clock3 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <dt className="text-xs text-muted-foreground">Duration</dt>
          <dd className="ml-auto truncate font-semibold tabular-nums">{entry.durationFormatted}</dd>
        </div>
      </dl>
      <AttendanceLocationDetails entry={entry} />
    </article>
  );
}
