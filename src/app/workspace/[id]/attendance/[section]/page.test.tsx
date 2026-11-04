import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AttendanceSectionPage from './page';
import { api } from '@/lib/axios';

let currentSection = 'timesheets';
const notFoundMock = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'ws1', section: currentSection }),
  notFound: () => notFoundMock(),
}));
vi.mock('@/lib/axios', () => ({ api: { get: vi.fn() } }));
vi.mock('@/components/analytics/AttendanceReport', () => ({
  AttendanceReport: () => <div data-testid="attendance-report">Attendance report</div>,
}));
vi.mock('@/components/attendance/LiveAttendanceTimers', () => ({
  LiveAttendanceTimers: () => <div data-testid="live-attendance-timers">Currently clocked in</div>,
}));
vi.mock('@/components/attendance/LeaveManagementTab', () => ({ LeaveManagementTab: () => null }));
vi.mock('@/components/attendance/AttendanceLocationSettings', () => ({ AttendanceLocationSettings: () => null }));
vi.mock('@/components/attendance/DesktopPresenceSettings', () => ({ DesktopPresenceSettings: () => null }));
vi.mock('@/components/attendance/DesktopPresenceTimeline', () => ({ DesktopPresenceTimeline: () => null }));
vi.mock('@/components/attendance/FieldTrackingTab', () => ({
  FieldTrackingTab: () => <div data-testid="field-tracking-tab">Field tracking tab</div>,
}));
vi.mock('@/components/hr/BiometricTerminalsCard', () => ({
  BiometricTerminalsCard: () => <div data-testid="biometric-terminals-card">Biometric terminals</div>,
}));

describe('AttendanceSectionPage', () => {
  beforeEach(() => {
    currentSection = 'timesheets';
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: { data: { canManage: false } } } as any);
  });

  it('shows current clock-ins above the timesheet report', () => {
    render(<AttendanceSectionPage />);

    const currentClockIns = screen.getByTestId('live-attendance-timers');
    const report = screen.getByTestId('attendance-report');
    expect(currentClockIns).toBeInTheDocument();
    expect(currentClockIns.compareDocumentPosition(report) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId('location-review')).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('renders Field GPS Visits section without crashing or calling notFound', () => {
    currentSection = 'field-tracking';
    render(<AttendanceSectionPage />);

    expect(notFoundMock).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Field GPS Visits' })).toBeInTheDocument();
    expect(screen.getByTestId('field-tracking-tab')).toBeInTheDocument();
  });

  it('renders Physical Biometric Terminals section without crashing', () => {
    currentSection = 'terminals';
    render(<AttendanceSectionPage />);

    expect(notFoundMock).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Physical Biometric Terminals' })).toBeInTheDocument();
    expect(screen.getByTestId('biometric-terminals-card')).toBeInTheDocument();
  });
});
