import { describe, expect, it } from 'vitest';
import { getMentionKeyAction, getMentionSuggestions } from './mentions';

describe('getMentionSuggestions', () => {
  it('supports both user records and workspace membership records', () => {
    expect(getMentionSuggestions([
      { _id: 'user-1', name: 'Ramon' },
      { user: { _id: 'user-2', name: 'Namrata Bastola', email: 'namrata@example.com' } },
    ], 'nam')).toEqual([{ id: 'user-2', name: 'Namrata Bastola', email: 'namrata@example.com' }]);
  });
});

describe('getMentionKeyAction', () => {
  it.each([
    ['Enter', false, 'select'],
    ['Tab', false, 'select'],
    ['ArrowDown', false, 'next'],
    ['ArrowUp', false, 'previous'],
    ['Enter', true, 'none'],
  ] as const)('maps %s with shift=%s to %s while suggestions are visible', (key, shiftKey, action) => {
    expect(getMentionKeyAction(key, shiftKey, 3)).toBe(action);
  });

  it('keeps Enter as send when no suggestions are available', () => {
    expect(getMentionKeyAction('Enter', false, 0)).toBe('none');
  });
});
