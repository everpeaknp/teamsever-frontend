import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './useAuthStore';

describe('attendance location permission UI', () => {
  beforeEach(() => useAuthStore.getState().clearWorkspaceContext());

  it('grants owners and admins by default, but not other managers', () => {
    useAuthStore.getState().setWorkspaceContext('workspace-1', 'owner');
    expect(useAuthStore.getState().can('MANAGE_ATTENDANCE_LOCATIONS')).toBe(true);
    useAuthStore.getState().setWorkspaceContext('workspace-1', 'admin');
    expect(useAuthStore.getState().can('MANAGE_ATTENDANCE_LOCATIONS')).toBe(true);
    useAuthStore.getState().setWorkspaceContext('workspace-1', 'operations_manager');
    expect(useAuthStore.getState().can('MANAGE_ATTENDANCE_LOCATIONS')).toBe(false);
  });

  it('honors explicit delegated grants and restrictions', () => {
    useAuthStore.getState().setWorkspaceContext('workspace-1', 'operations_manager', ['MANAGE_ATTENDANCE_LOCATIONS']);
    expect(useAuthStore.getState().can('MANAGE_ATTENDANCE_LOCATIONS')).toBe(true);
    useAuthStore.getState().setWorkspaceContext('workspace-1', 'operations_manager', ['MANAGE_ATTENDANCE_LOCATIONS'], ['MANAGE_ATTENDANCE_LOCATIONS']);
    expect(useAuthStore.getState().can('MANAGE_ATTENDANCE_LOCATIONS')).toBe(false);
  });
});
