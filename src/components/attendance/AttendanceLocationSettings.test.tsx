import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AttendanceLocationSettings } from './AttendanceLocationSettings';

const { get, put, patch } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), patch: vi.fn() }));
vi.mock('@/lib/axios', () => ({ api: { get, put, patch } }));
vi.mock('next/dynamic', async () => {
  const React = await import('react');
  return { default: () => ({ onSelect }: { onSelect: (latitude: number, longitude: number) => void }) => React.createElement('button', { type: 'button', onClick: () => onSelect(27.5, 84.4) }, 'Choose map point') };
});

describe('AttendanceLocationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockImplementation((url: string) => url.endsWith('/location-policy')
      ? Promise.resolve({ data: { data: { canManage: false, policy: { enabled: false, areas: [] } } } })
      : Promise.resolve({ data: { data: { members: [] } } }));
  });

  it('does not render policy mutation controls without Manage Addresses', async () => {
    render(<AttendanceLocationSettings workspaceId="workspace-1" />);
    expect(await screen.findByText('You need Manage Addresses permission to edit these locations.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Set office pin' })).not.toBeInTheDocument();
  });

  it('saves the enforcement checkbox value instead of inverting it', async () => {
    get.mockImplementation((url: string) => url.endsWith('/location-policy')
      ? Promise.resolve({ data: { data: { canManage: true, policy: { enabled: false, areas: [] } } } })
      : Promise.resolve({ data: { data: { members: [] } } }));
    put.mockResolvedValue({ data: { data: { policy: { enabled: true, areas: [] } } } });
    render(<AttendanceLocationSettings workspaceId="workspace-1" />);

    fireEvent.click(await screen.findByRole('checkbox', { name: /Enforce location at clock-in/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save enforcement on' }));

    await waitFor(() => expect(put).toHaveBeenCalledWith(
      '/attendance/workspace/workspace-1/location-policy',
      expect.objectContaining({ enabled: true }),
    ));
  });

  it('lets a location manager set and save the accepted device accuracy limit', async () => {
    get.mockImplementation((url: string) => url.endsWith('/location-policy')
      ? Promise.resolve({ data: { data: { canManage: true, policy: { enabled: true, maxAccuracyMeters: 100, areas: [] } } } })
      : Promise.resolve({ data: { data: { members: [] } } }));
    put.mockResolvedValue({ data: { data: { policy: { enabled: true, maxAccuracyMeters: 250, areas: [] } } } });
    render(<AttendanceLocationSettings workspaceId="workspace-1" />);

    fireEvent.change(await screen.findByLabelText('Maximum location uncertainty (meters)'), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save enforcement on' }));

    await waitFor(() => expect(put).toHaveBeenCalledWith(
      '/attendance/workspace/workspace-1/location-policy',
      expect.objectContaining({ maxAccuracyMeters: 250 }),
    ));
  });

  it('shows member-private remote places instead of a shared remote-area catalog', async () => {
    get.mockImplementation((url: string) => url.endsWith('/location-policy')
      ? Promise.resolve({ data: { data: { canManage: true, policy: { enabled: true, areas: [{ _id: 'office-1', name: 'Simalchaur office', kind: 'office', latitude: 28.2, longitude: 83.9, radiusMeters: 60 }] } } } })
      : Promise.resolve({ data: { data: { members: [{ id: 'member-1', name: 'B', role: 'member', attendanceMode: 'remote', remoteAreas: [{ _id: 'home-1', name: 'Kathmandu home', kind: 'remote', latitude: 27.7, longitude: 85.3, radiusMeters: 60, isActive: true }] }] } } }));
    render(<AttendanceLocationSettings workspaceId="workspace-1" />);
    expect(await screen.findByText('Each member’s private Remote places')).toBeInTheDocument();
    expect(await screen.findByText(/Private to B · 27.70000, 85.30000/)).toBeInTheDocument();
    expect(screen.getByText(/One shared office geofence/)).toBeInTheDocument();
  });

  it('edits a saved remote place and sends its updated details to the server', async () => {
    const originalPlace = { _id: 'home-1', name: 'Kathmandu home', kind: 'remote', latitude: 27.7, longitude: 85.3, radiusMeters: 60, isActive: true, networkIp: '' };
    const updatedPlace = { ...originalPlace, name: 'Chitwan home', latitude: 27.5, longitude: 84.4, radiusMeters: 120, networkIp: '203.0.113.10' };
    get.mockImplementation((url: string) => url.endsWith('/location-policy')
      ? Promise.resolve({ data: { data: { canManage: true, policy: { enabled: true, areas: [] } } } })
      : Promise.resolve({ data: { data: { members: [{ id: 'member-1', name: 'B', role: 'member', attendanceMode: 'remote', remoteAreas: [originalPlace] }] } } }));
    put.mockResolvedValue({ data: { data: { member: { remoteAreas: [updatedPlace] } } } });

    render(<AttendanceLocationSettings workspaceId="workspace-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'View Kathmandu home on map' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Choose map point' })[1]);
    fireEvent.change(screen.getByLabelText('Private remote place name'), { target: { value: 'Chitwan home' } });
    fireEvent.change(screen.getByLabelText('Remote area radius in meters'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('Optional registered public IP'), { target: { value: '203.0.113.10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(put).toHaveBeenCalledWith(
      '/attendance/workspace/workspace-1/location-policy/members/member-1/remote-areas',
      { areas: [updatedPlace] },
    ));
    expect(await screen.findByText(/Chitwan home/)).toBeInTheDocument();
  });

});
