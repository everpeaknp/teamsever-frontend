import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DesktopPresenceSettings } from './DesktopPresenceSettings';
import { api } from '@/lib/axios';

vi.mock('@/lib/axios', () => ({ api: { get: vi.fn(), put: vi.fn() } }));

describe('DesktopPresenceSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('explains the collected data and saves threshold for an authorized manager', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { policy: { afkThresholdMinutes: 5 }, canManage: true } } } as any);
    vi.mocked(api.put).mockResolvedValue({ data: { data: { policy: { afkThresholdMinutes: 7 } } } } as any);
    render(<DesktopPresenceSettings workspaceId="ws1" />);
    expect(await screen.findByText(/never records keys, text, mouse details/i)).toBeInTheDocument();
    const input = screen.getByLabelText('Mark AFK after minutes');
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save AFK threshold' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/attendance/workspace/ws1/desktop-presence-policy', { afkThresholdMinutes: 7 }));
  });

  it('is read-only when the server says the viewer cannot manage the policy', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { policy: { afkThresholdMinutes: 5 }, canManage: false } } } as any);
    render(<DesktopPresenceSettings workspaceId="ws1" />);
    expect(await screen.findByText(/only workspace owners and authorized/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save AFK threshold' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Mark AFK after minutes')).toBeDisabled();
  });

  it('shows server rejection feedback', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { policy: { afkThresholdMinutes: 5 }, canManage: true } } } as any);
    vi.mocked(api.put).mockRejectedValue({ response: { data: { message: 'AFK threshold must be a whole number from 1 to 60 minutes' } } });
    render(<DesktopPresenceSettings workspaceId="ws1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Save AFK threshold' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/whole number from 1 to 60/i);
  });
});
