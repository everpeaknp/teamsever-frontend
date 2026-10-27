import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DesktopPresencePreference } from './DesktopPresencePreference';
import { getDesktopPresencePreference, setDesktopPresencePreference } from '@/lib/desktopAttendance';

vi.mock('@/lib/desktopAttendance', () => ({
  getDesktopPresencePreference: vi.fn(),
  setDesktopPresencePreference: vi.fn(),
}));

describe('DesktopPresencePreference', () => {
  afterEach(() => vi.restoreAllMocks());

  it('loads the saved preference and updates it', async () => {
    vi.mocked(getDesktopPresencePreference).mockResolvedValue(true);
    vi.mocked(setDesktopPresencePreference).mockResolvedValue(false);
    const monitoring = vi.fn().mockResolvedValue({ enabled: false });
    Object.defineProperty(window, 'teamseverDesktop', { configurable: true, value: { setMonitoringEnabled: monitoring } });

    render(<DesktopPresencePreference />);
    const toggle = await screen.findByRole('switch', { name: 'Desktop presence' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);

    await waitFor(() => expect(setDesktopPresencePreference).toHaveBeenCalledWith(false));
    expect(monitoring).toHaveBeenCalledWith(false);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('keeps the saved value and explains failures when the update fails', async () => {
    vi.mocked(getDesktopPresencePreference).mockResolvedValue(true);
    vi.mocked(setDesktopPresencePreference).mockRejectedValue(new Error('offline'));
    render(<DesktopPresencePreference />);
    const toggle = await screen.findByRole('switch', { name: 'Desktop presence' });
    fireEvent.click(toggle);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not update/i);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });
});
