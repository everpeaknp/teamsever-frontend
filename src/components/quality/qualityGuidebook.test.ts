import { describe, expect, it } from 'vitest';
import { filterGuidebookSections, qualityGuidebookSections } from './qualityGuidebook';

describe('Quality guidebook content', () => {
  it('contains an end-to-end testing path and the key workflow topics', () => {
    expect(qualityGuidebookSections.map(section => section.id)).toEqual(expect.arrayContaining([
      'scope', 'cases', 'plans-runs', 'evidence', 'bugs', 'reports', 'permissions',
    ]));
  });

  it('searches section titles, instructions, examples, and tips without case sensitivity', () => {
    expect(filterGuidebookSections('screenshot').map(section => section.id)).toContain('evidence');
    expect(filterGuidebookSections('yummy').map(section => section.id)).toContain('scope');
    expect(filterGuidebookSections('not a real topic')).toEqual([]);
  });
});
