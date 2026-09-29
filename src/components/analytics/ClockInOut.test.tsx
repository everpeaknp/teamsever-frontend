import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ClockInOut } from './ClockInOut';

const { get, post, toastError, toastSuccess } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock('@/lib/axios', () => ({ api: { get, post } }));
vi.mock('sonner', () => ({ toast: { error: toastError, success: toastSuccess } }));

describe('ClockInOut location enforcement', () => {
  beforeEach(() => { vi.clearAllMocks(); get.mockResolvedValue({ data: { data: { policy: { enabled: true } } } }); });

  it('sends a fresh location and does not show clock-in success when the server rejects it', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (success: Function) => success({ coords: { latitude: 40, longitude: -74, accuracy: 12 }, timestamp: Date.now() }) } });
    post.mockRejectedValue({ response: { data: { message: 'You are outside your allowed attendance area' } } });
    render(<ClockInOut workspaceId="workspace-1" currentStatus="inactive" runningTimer={null} onStatusChange={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clock In' }));
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][1].locationFix).toMatchObject({ latitude: 40, longitude: -74, accuracyMeters: 12 });
    await waitFor(() => expect(screen.getByText('CLOCKED OUT')).toBeInTheDocument());
    expect(toastError).toHaveBeenCalledWith('You are outside your allowed attendance area');
  });

  it('does not call the clock endpoint if location permission fails', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_success: Function, failure: Function) => failure(new Error('denied')) } });
    render(<ClockInOut workspaceId="workspace-1" currentStatus="inactive" runningTimer={null} onStatusChange={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clock In' }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringContaining('permission was denied')));
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText('CLOCKED OUT')).toBeInTheDocument();
  });

  it('allows clock-out without requesting a location fix', async () => {
    get.mockResolvedValue({ data: { data: { policy: { enabled: true } } } });
    post.mockResolvedValue({ data: { success: true, data: { timeEntry: null } } });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: vi.fn() } });
    render(<ClockInOut workspaceId="workspace-1" currentStatus="active" runningTimer={{ startTime: new Date().toISOString() }} onStatusChange={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clock Out' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/workspaces/workspace-1/clock/toggle', { status: 'inactive' }));
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });
});
