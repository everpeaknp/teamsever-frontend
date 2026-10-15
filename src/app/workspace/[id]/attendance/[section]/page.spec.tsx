import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import AttendanceSectionPage from './page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'ws1', section: 'timesheets' }),
  notFound: vi.fn(),
}));
vi.mock('@/lib/axios', () => ({
  api: { get: vi.fn().mockResolvedValue({ data: { data: { canManage: false } } }) },
}));
vi.mock('@/components/analytics/AttendanceReport', () => ({
  AttendanceReport: () => <div data-testid="attendance-report">Attendance report</div>,
}));
vi.mock('@/components/attendance/LiveAttendanceTimers', () => ({
  LiveAttendanceTimers: () => <div data-testid="live-attendance-timers">Currently clocked in</div>,
}));
vi.mock('@/components/attendance/LocationReviewPanel', () => ({
  LocationReviewPanel: () => <div data-testid="location-review">Location review</div>,
}));
vi.mock('@/components/attendance/LeaveManagementTab', () => ({ LeaveManagementTab: () => null }));
vi.mock('@/components/attendance/AttendanceLocationSettings', () => ({ AttendanceLocationSettings: () => null }));
vi.mock('@/components/attendance/DesktopPresenceSettings', () => ({ DesktopPresenceSettings: () => null }));
vi.mock('@/components/attendance/DesktopPresenceTimeline', () => ({ DesktopPresenceTimeline: () => null }));

describe('AttendanceSectionPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows current clock-ins above the timesheet report', async () => {
    await act(async () => { render(<AttendanceSectionPage />); });

    const currentClockIns = screen.getByTestId('live-attendance-timers');
    const report = screen.getByTestId('attendance-report');
    expect(currentClockIns).toBeInTheDocument();
    expect(currentClockIns.compareDocumentPosition(report) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
