import { describe, expect, it } from 'vitest';
import { getManageWorkspaceHref } from './workspaceNavigation';

describe('getManageWorkspaceHref', () => {
  it('opens settings for the workspace in the current route', () => {
    expect(getManageWorkspaceHref('/workspace/ws-1/attendance/timesheets', 'ws-2'))
      .toBe('/workspace/ws-1/settings');
  });

  it('uses the stored active workspace outside a workspace route', () => {
    expect(getManageWorkspaceHref('/account', 'ws-2')).toBe('/workspace/ws-2/settings');
  });

  it('falls back to workspace selection when no workspace is active', () => {
    expect(getManageWorkspaceHref('/dashboard', null)).toBe('/dashboard');
  });
});
