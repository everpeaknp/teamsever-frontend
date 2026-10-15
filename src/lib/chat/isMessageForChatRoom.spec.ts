import { describe, expect, it } from 'vitest';
import { isMessageForChatRoom } from './isMessageForChatRoom';

describe('isMessageForChatRoom', () => {
  it('matches the resolved General channel to the General route alias', () => {
    expect(isMessageForChatRoom('general', {
      channel: '507f1f77bcf86cd799439011',
      channelName: 'General',
    })).toBe(true);
  });

  it('matches a regular channel by its ID', () => {
    expect(isMessageForChatRoom('channel-1', { channel: 'channel-1' })).toBe(true);
  });

  it('does not match a different channel', () => {
    expect(isMessageForChatRoom('channel-1', { channel: 'channel-2', channelName: 'General' })).toBe(false);
  });
});
