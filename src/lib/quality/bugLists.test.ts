import { describe, expect, it } from 'vitest';
import { uniqueBugLists } from './bugLists';

describe('uniqueBugLists', () => {
  it('keeps one destination when workspace and folder queries return the same list', () => {
    const lists = [
      { _id: 'list-1', name: 'Bugs', spaceName: 'Development' },
      { _id: 'list-1', name: 'Bugs', spaceName: 'Development' },
      { _id: 'list-2', name: 'Feedback', spaceName: 'Marketing' },
    ];

    expect(uniqueBugLists(lists)).toEqual([lists[0], lists[2]]);
  });
});
