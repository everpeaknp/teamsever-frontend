import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttendanceLocationSettings } from './AttendanceLocationSettings';

vi.mock('@/lib/axios', () => ({ api: { get: vi.fn().mockResolvedValue({ data: { data: {} } }), put: vi.fn(), patch: vi.fn() } }));

describe('AttendanceLocationSettings authorization UI', () => {
  it('does not render policy mutation controls for a user without the permission', async () => {
    render(<AttendanceLocationSettings workspaceId="workspace-1" />);
    expect(await screen.findByText('You do not have permission to manage attendance locations.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add area' })).not.toBeInTheDocument();
  });
});
