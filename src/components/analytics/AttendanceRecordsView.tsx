'use client';

import { CalendarDays, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserAvatar } from '@/components/ui/user-avatar';
import { AttendanceRecordCard } from './AttendanceRecordCard';
import type { AttendanceReportEntry } from './attendanceReportTypes';

interface AttendanceRecordsViewProps {
  entries: AttendanceReportEntry[];
  loading: boolean;
  error?: string;
  onRetry?: () => void;
}

function DesktopRows({ entries, loading }: AttendanceRecordsViewProps) {
  return <div className="hidden min-w-0 lg:block">
    <div className="max-w-full overflow-x-auto rounded-md border">
      <Table>
        <TableHeader><TableRow>
          <TableHead>User</TableHead><TableHead>Date</TableHead><TableHead>Clock In</TableHead><TableHead>Clock Out</TableHead><TableHead>Duration</TableHead><TableHead>Clock-in location</TableHead><TableHead>Clock-out location</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {loading ? <TableRow><TableCell colSpan={7} className="py-10 text-center"><span className="inline-flex items-center gap-2 text-muted-foreground"><Clock className="h-5 w-5 animate-spin" />Loading report data…</span></TableCell></TableRow>
            : entries.length === 0 ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No attendance records found for the selected period.</TableCell></TableRow>
              : entries.map((entry) => <TableRow key={entry.id}>
                <TableCell><div className="flex min-w-40 items-center gap-2"><UserAvatar user={entry.user} className="h-9 w-9 shrink-0 border border-white/10"/><div className="flex min-w-0 flex-col"><span className="truncate font-medium">{entry.userName}</span><span className="max-w-44 truncate text-xs text-muted-foreground">{entry.userEmail}</span></div></div></TableCell>
                <TableCell><span className="inline-flex items-center gap-2 whitespace-nowrap"><CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground"/>{entry.date}</span></TableCell>
                <TableCell><span className="whitespace-nowrap font-medium tabular-nums text-emerald-600 dark:text-emerald-400">{format(new Date(entry.clockIn), 'p')}</span></TableCell>
                <TableCell><span className={entry.clockOut.includes('Running') ? 'whitespace-nowrap font-bold text-blue-500' : 'whitespace-nowrap font-medium tabular-nums text-rose-600 dark:text-rose-400'}>{entry.clockOut.includes('Running') ? <span className="inline-flex items-center gap-1"><span className="h-2 w-2 animate-ping rounded-full bg-blue-500"/>Running</span> : format(new Date(entry.clockOut), 'p')}</span></TableCell>
                <TableCell><span className="inline-flex items-center gap-2 whitespace-nowrap font-mono"><Clock className="h-3 w-3"/>{entry.durationFormatted}</span></TableCell>
                <TableCell><div className="min-w-36 text-xs"><div>{entry.clockInLocation?.areaName || (entry.attendanceMode === 'remote' ? 'Remote area' : 'Office')}</div><div className="text-muted-foreground">{entry.clockInLocation?.latitude != null && entry.clockInLocation?.longitude != null ? `${entry.clockInLocation.latitude.toFixed(5)}, ${entry.clockInLocation.longitude.toFixed(5)}` : entry.clockInLocation ? 'Location hidden' : 'Location not recorded'}</div><div className="text-muted-foreground">Source: {entry.clockInSource === 'desktop' ? 'Trusted desktop' : entry.clockInSource === 'mobile' ? 'Mobile app' : 'Web'}</div>{entry.clockInVerificationMethod && <details className="mt-1"><summary className="inline-flex min-h-8 cursor-pointer list-none items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">Location verified</summary><p className="mt-1 max-w-56 text-muted-foreground">{entry.clockInVerificationMethod === 'network_confirmed' ? 'GPS was imprecise; the registered network also matched and the location uncertainty overlapped this area.' : 'The GPS location matched an allowed attendance area.'}</p></details>}</div></TableCell>
                <TableCell><div className="min-w-36 text-xs">{entry.clockOutLocation ? <><div>{entry.clockOutLocation.latitude != null && entry.clockOutLocation.longitude != null ? `${entry.clockOutLocation.latitude.toFixed(5)}, ${entry.clockOutLocation.longitude.toFixed(5)}` : 'Location hidden'}</div><div className={entry.clockOutLocation.withinRange ? 'text-emerald-600' : 'text-amber-600'}>{entry.clockOutLocation.distanceFromClockInMeters != null ? `${entry.clockOutLocation.distanceFromClockInMeters} m from clock-in` : 'Distance unavailable'}</div><div className="text-muted-foreground">Source: {entry.clockOutSource === 'desktop' ? 'Trusted desktop' : entry.clockOutSource === 'mobile' ? 'Mobile app' : entry.clockOutSource === 'web' ? 'Web' : 'Not recorded'}</div></> : <span className="text-muted-foreground">{entry.clockOut === 'Running' ? '—' : 'Location not recorded'}</span>}{entry.locationReviewReason && <div className="mt-1 max-w-48 break-words text-amber-600" title={entry.locationReviewReason}>Review: {entry.locationReviewReason}</div>}</div></TableCell>
              </TableRow>)}
        </TableBody>
      </Table>
    </div>
  </div>;
}

export function AttendanceRecordsView(props: AttendanceRecordsViewProps) {
  const { entries, loading, error, onRetry } = props;
  return <div className="min-w-0">
    {error && <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"><span className="min-w-0 flex-1 break-words">{error}</span><Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4"/>Try again</Button></div>}
    <div className="space-y-3 lg:hidden">
      {loading ? <div aria-label="Loading attendance records" className="space-y-3">{[0, 1].map((index) => <div key={index} className="h-40 animate-pulse rounded-xl border bg-muted/30" />)}</div>
        : entries.length === 0 ? <div className="rounded-xl border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">No attendance records found for the selected period.</div>
          : entries.map((entry) => <AttendanceRecordCard key={entry.id} entry={entry} />)}
    </div>
    <DesktopRows {...props} />
  </div>;
}
