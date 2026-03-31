'use client';

import { useParams } from 'next/navigation';
import { AttendanceReport } from '@/components/analytics/AttendanceReport';

export default function AttendancePage() {
  const params = useParams();
  const workspaceId = params.id as string;

  return (
    <div className="container mx-auto py-8 px-4 md:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Attendance & Timesheets</h1>
        <p className="text-muted-foreground mt-2">
          View and export clock-in/out records and time tracking history.
        </p>
      </div>

      <AttendanceReport workspaceId={workspaceId} />
    </div>
  );
}
