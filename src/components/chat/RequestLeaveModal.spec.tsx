import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '@/lib/axios';
import { RequestLeaveModal } from './RequestLeaveModal';

vi.mock('@/lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('next/dynamic', () => ({ default: () => ({ latitude, longitude, hasSelection, onSelect }: any) => <button type="button" data-testid="map-picker" onClick={() => onSelect(latitude, longitude)}>{hasSelection ? 'Map point selected' : 'Choose map point'}</button> }));

describe('RequestLeaveModal remote locations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation(async (url: string) => url.includes('location-policy')
      ? { data: { data: { member: { remoteAreas: [] } } } } as any
      : { data: { data: {} } } as any);
  });

  it('lets a member with no assigned private map request a new address in a viewport-bounded modal', async () => {
    render(<RequestLeaveModal isOpen onClose={vi.fn()} workspaceId="workspace-1" assignedManagerId="manager-1" managerName="Manager" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Remote' }));

    expect(screen.getByRole('dialog').className).toContain('max-h-');
    expect(screen.getByRole('dialog').className).toContain('max-w-4xl');
    expect(screen.getByRole('dialog').querySelector('form')?.className).toContain('md:grid-cols-');
    expect(screen.getByRole('combobox', { name: 'Remote work location' })).toHaveValue('propose');
    expect(screen.getByText(/request approval for another address/i)).toBeInTheDocument();
    expect(screen.getByTestId('map-picker')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('map-picker'));
    fireEvent.change(screen.getByLabelText('Private area name'), { target: { value: 'Temporary apartment' } });
    fireEvent.change(screen.getByPlaceholderText('Reason for requesting remote work…'), { target: { value: 'Working away from office' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Remote Request' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/workspaces/workspace-1/leaves', expect.objectContaining({
      requestType: 'remote',
      proposedRemoteArea: expect.objectContaining({ name: 'Temporary apartment' }),
    })));
  });

  it('keeps the new-address option available alongside already approved private places', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => url.includes('location-policy')
      ? { data: { data: { member: { remoteAreas: [{ _id: 'area-1', name: 'Home', isActive: true }] } } } } as any
      : { data: { data: {} } } as any);
    render(<RequestLeaveModal isOpen onClose={vi.fn()} workspaceId="workspace-1" assignedManagerId="manager-1" managerName="Manager" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Remote' }));

    const location = screen.getByRole('combobox', { name: 'Remote work location' });
    expect(location).toHaveValue('area-1');
    expect(screen.getByRole('option', { name: /request approval for another address/i })).toBeInTheDocument();
    fireEvent.change(location, { target: { value: 'propose' } });
    expect(screen.getByTestId('map-picker')).toBeInTheDocument();
  });

  it('lets the requester expand the location picker and keeps the selected point visible', async () => {
    render(<RequestLeaveModal isOpen onClose={vi.fn()} workspaceId="workspace-1" assignedManagerId="manager-1" managerName="Manager" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Remote' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expand map' }));

    expect(screen.getByRole('dialog', { name: 'Choose remote work location' })).toBeInTheDocument();
    const maps = screen.getAllByTestId('map-picker');
    expect(maps).toHaveLength(2);
    fireEvent.click(maps[1]);
    expect(screen.getByText(/Selected point: 27\.71720, 85\.32400/)).toBeInTheDocument();
  });
});
