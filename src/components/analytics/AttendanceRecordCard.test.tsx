import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AttendanceRecordCard } from './AttendanceRecordCard';

const entry = {
  id: 'entry-1',
  user: { _id: 'member-1', name: 'Ramon' },
  userName: 'Ramon',
  userEmail: 'ramon@example.com',
  date: '2026-10-04',
  clockIn: '2026-10-04T09:00:00.000Z',
  clockOut: '2026-10-04T17:00:00.000Z',
  totalHours: '8',
  durationFormatted: '8h 0m',
  description: '',
  attendanceMode: 'remote' as const,
  clockInSource: 'desktop' as const,
  clockOutSource: 'desktop' as const,
  clockInLocation: { areaName: 'Home', latitude: 28.21, longitude: 83.98 },
  clockInVerificationMethod: 'network_confirmed' as const,
  clockOutLocation: { latitude: 28.21, longitude: 83.98, distanceFromClockInMeters: 2, withinRange: true },
  locationReviewReason: null,
};

describe('AttendanceRecordCard', () => {
  it('shows member, date, both clock times, and duration without requiring a table', () => {
    render(<AttendanceRecordCard entry={entry} />);
    expect(screen.getByText('Ramon')).toBeInTheDocument();
    expect(screen.getByText('ramon@example.com')).toBeInTheDocument();
    expect(screen.getByText('Check in')).toBeInTheDocument();
    expect(screen.getByText('Check out')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('8h 0m')).toBeInTheDocument();
  });

  it('keeps verified GPS/network detail collapsed under this record', () => {
    render(<AttendanceRecordCard entry={entry} />);
    const summary = screen.getByText('Location details');
    const disclosure = summary.closest('details');
    expect(disclosure).not.toHaveAttribute('open');
    fireEvent.click(summary);
    expect(screen.getByText(/registered network also matched/i)).toBeInTheDocument();
    expect(screen.getByText('Clock-in location')).toBeInTheDocument();
    expect(screen.getByText('Clock-out location')).toBeInTheDocument();
  });

  it('shows a running shift and says when location was not recorded', () => {
    render(<AttendanceRecordCard entry={{ ...entry, clockOut: 'Running', clockOutLocation: null, clockInLocation: null }} />);
    expect(screen.getAllByText('Running')).toHaveLength(2);
    expect(screen.getAllByText('Location not recorded')).toHaveLength(2);
  });
});
