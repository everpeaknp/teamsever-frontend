import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/store/useAuthStore';
import { PermissionAction, usePermission } from './usePermission';

const qualityPermissions = [
  'QA_VIEW',
  'QA_MANAGE_CASES',
  'QA_EXECUTE',
  'QA_CREATE_BUG',
  'QA_TRIAGE_BUG',
  'QA_VERIFY_BUG',
  'QA_MANAGE_RELEASES',
  'QA_SIGN_OFF',
] as const satisfies readonly PermissionAction[];

describe('usePermission QA role', () => {
  beforeEach(() => {
    useAuthStore.getState().clearWorkspaceContext();
    useAuthStore.getState().setWorkspaceContext('workspace-id', 'qa');
  });

  it('inherits every Quality workflow permission', () => {
    const { result } = renderHook(() => usePermission());

    for (const permission of qualityPermissions) {
      expect(result.current.can(permission)).toBe(true);
    }
  });
});
