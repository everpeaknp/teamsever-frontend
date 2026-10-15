import { describe, expect, it } from 'vitest';
import { matchesSidebarRoute } from './sidebarRouteMatch';

describe('matchesSidebarRoute', () => {
  it('matches the destination and its nested pages', () => {
    const href = '/workspace/acme/attendance';

    expect(matchesSidebarRoute(href, href)).toBe(true);
    expect(matchesSidebarRoute(`${href}/timesheets`, href)).toBe(true);
  });

  it('does not match a sibling route with the same prefix', () => {
    expect(matchesSidebarRoute('/workspace/acme/attendance-old', '/workspace/acme/attendance')).toBe(false);
  });
});
