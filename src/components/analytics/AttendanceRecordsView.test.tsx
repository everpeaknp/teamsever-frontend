import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AttendanceRecordsView } from './AttendanceRecordsView';

const entry = {
  id: 'entry-1', user: { _id: 'member-1' }, userName: 'Ramon', userEmail: 'ramon@example.com',
  date: '2026-10-04', clockIn: '2026-10-04T09:00:00.000Z', clockOut: '2026-10-04T17:00:00.000Z',
  totalHours: '8', durationFormatted: '8h 0m', description: '', clockInSource: 'web' as const,
};

describe('AttendanceRecordsView responsive states', () => {
  it('keeps cards for narrow layouts and a full table for desktop layouts', () => {
    const { container } = render(<AttendanceRecordsView entries={[entry]} loading={false} />);
    expect(container.querySelector('.lg\\:hidden')).toBeInTheDocument();
    expect(container.querySelector('.hidden.lg\\:block')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Attendance record for Ramon' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Clock-in location' })).toBeInTheDocument();
  });

  it('uses a card-sized loading state on phones', () => {
    const { container } = render(<AttendanceRecordsView entries={[]} loading />);
    expect(container.querySelector('[aria-label="Loading attendance records"]')).toBeInTheDocument();
    expect(container.querySelector('.hidden.lg\\:block')).toBeInTheDocument();
  });

  it('offers retry for a report error and a clear empty state', () => {
    const retry = vi.fn();
    render(<AttendanceRecordsView entries={[]} loading={false} error="Network unavailable" onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Network unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
    cleanup();
    render(<AttendanceRecordsView entries={[]} loading={false} />);
    expect(screen.getAllByText('No attendance records found for the selected period.')).toHaveLength(2);
  });
});
