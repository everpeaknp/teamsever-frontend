import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ClockInOut } from './ClockInOut';

const { get, post, toastError, toastSuccess, desktopToggle, provision } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), toastError: vi.fn(), toastSuccess: vi.fn(), desktopToggle: vi.fn(), provision: vi.fn() }));
vi.mock('@/lib/axios', () => ({ api: { get, post } }));
vi.mock('sonner', () => ({ toast: { error: toastError, success: toastSuccess } }));
vi.mock('@/lib/desktopAttendance', () => ({ ensureTrustedDesktopDevice: provision, setDesktopActivityConsent: vi.fn(), disconnectDesktopDevice: vi.fn() }));

describe('ClockInOut location enforcement', () => {
  beforeEach(() => { vi.clearAllMocks(); delete (window as any).teamseverDesktop; get.mockResolvedValue({ data: { data: { policy: { enabled: true } } } }); });

  it('sends a fresh location and does not show clock-in success when the server rejects it', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { watchPosition: (success: Function) => { success({ coords: { latitude: 40, longitude: -74, accuracy: 12 }, timestamp: Date.now() }); return 1; }, clearWatch: vi.fn() } });
    post.mockRejectedValue({ response: { status: 403, data: { message: 'You are outside your allowed attendance area' } } });
    render(<ClockInOut workspaceId="workspace-1" currentStatus="inactive" runningTimer={null} onStatusChange={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clock In' }));
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][1].locationFix).toMatchObject({ latitude: 40, longitude: -74, accuracyMeters: 12 });
    await waitFor(() => expect(screen.getByText('CLOCKED OUT')).toBeInTheDocument());
    expect(toastError).toHaveBeenCalledWith('You are outside your allowed attendance area');
  });

  it('does not call the clock endpoint if location permission fails', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { watchPosition: (_success: Function, failure: Function) => { failure(new Error('denied')); return 2; }, clearWatch: vi.fn() } });
    render(<ClockInOut workspaceId="workspace-1" currentStatus="inactive" runningTimer={null} onStatusChange={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clock In' }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringContaining('permission was denied')));
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText('CLOCKED OUT')).toBeInTheDocument();
  });

  it('sends a low-accuracy fix to the backend so it can check optional remote IP corroboration', async () => {
    get.mockResolvedValue({ data: { data: { policy: { enabled: true, maxAccuracyMeters: 100 } } } });
    post.mockResolvedValue({ data: { success: true, data: { timeEntry: { startTime: new Date().toISOString() } } } });
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { watchPosition: (success: Function, failure: Function) => { success({ coords: { latitude: 28.2, longitude: 83.9, accuracy: 420 }, timestamp: Date.now() }); failure(new Error('provider finished')); return 3; }, clearWatch: vi.fn() } });
    render(<ClockInOut workspaceId="workspace-1" currentStatus="inactive" runningTimer={null} onStatusChange={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Clock In' }));

    await waitFor(() => expect(post).toHaveBeenCalledWith('/workspaces/workspace-1/clock/toggle', {
      status: 'active', locationFix: expect.objectContaining({ accuracyMeters: 420 }),
    }));
    expect(toastSuccess).toHaveBeenCalledWith('Clocked in successfully!');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('retries policy verification on clock-in while the initial policy request is still pending', async () => {
    let resolveInitialPolicy!: (value: any) => void;
    get.mockImplementationOnce(() => new Promise((resolve) => { resolveInitialPolicy = resolve; }))
      .mockResolvedValueOnce({ data: { data: { policy: { enabled: false } } } });
    post.mockResolvedValue({ data: { success: true, data: { timeEntry: { startTime: new Date().toISOString() } } } });
    render(<ClockInOut workspaceId="workspace-1" currentStatus="inactive" runningTimer={null} onStatusChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Clock In' }));

    await waitFor(() => expect(post).toHaveBeenCalledWith('/workspaces/workspace-1/clock/toggle', { status: 'active' }));
    expect(get).toHaveBeenCalledTimes(2);
    await act(async () => resolveInitialPolicy({ data: { data: { policy: { enabled: false } } } }));
  });

  it('submits a clock-out location fix so the server can compare it with clock-in', async () => {
    get.mockResolvedValue({ data: { data: { policy: { enabled: true } } } });
    post.mockResolvedValue({ data: { success: true, data: { timeEntry: null } } });
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { watchPosition: (success: Function) => { success({ coords: { latitude: 40.0001, longitude: -74, accuracy: 12 }, timestamp: Date.now() }); return 4; }, clearWatch: vi.fn() } });
    render(<ClockInOut workspaceId="workspace-1" currentStatus="active" runningTimer={{ startTime: new Date().toISOString() }} onStatusChange={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clock Out' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/workspaces/workspace-1/clock/toggle', { status: 'inactive', locationFix: expect.objectContaining({ latitude: 40.0001 }) }));
  });

  it('uses the trusted desktop bridge for desktop clock events', async () => {
    get.mockResolvedValue({ data: { data: { policy: { enabled: false } } } });
    provision.mockResolvedValue({ deviceId: 'device-1' });
    desktopToggle.mockResolvedValue({ data: { success: true, data: { timeEntry: { startTime: new Date().toISOString() } } } });
    Object.defineProperty(window, 'teamseverDesktop', { configurable: true, value: { toggleClock: desktopToggle } });
    render(<ClockInOut workspaceId="0123456789abcdef01234567" currentStatus="inactive" runningTimer={null} onStatusChange={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clock In' }));
    await waitFor(() => expect(desktopToggle).toHaveBeenCalledWith({ workspaceId: '0123456789abcdef01234567', status: 'active' }));
    expect(post).not.toHaveBeenCalled();
    delete (window as any).teamseverDesktop;
  });
});
