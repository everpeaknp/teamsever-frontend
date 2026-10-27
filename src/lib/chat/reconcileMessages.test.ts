import { describe, expect, it } from 'vitest';
import { reconcileChatMessages } from './reconcileMessages';

const baseTime = Date.parse('2026-10-14T12:00:00.000Z');
const message = (overrides: Record<string, any> = {}) => ({
  _id: 'message-1',
  sender: { _id: 'user-1', name: 'Ramon', email: 'ramon@example.com' },
  content: 'Bhai',
  createdAt: new Date(baseTime).toISOString(),
  updatedAt: new Date(baseTime).toISOString(),
  conversation: 'conversation-1',
  ...overrides,
});

describe('reconcileChatMessages', () => {
  it('replaces a pending optimistic message with its realtime server echo', () => {
    const optimistic = message({ _id: 'temp-1', tempId: 'temp-1', sending: true });
    const confirmed = message({ _id: 'server-1', createdAt: new Date(baseTime + 800).toISOString() });

    expect(reconcileChatMessages([confirmed], [optimistic])).toEqual([confirmed]);
  });

  it('keeps a successful optimistic message visible until its socket echo arrives', () => {
    const optimistic = message({ _id: 'temp-1', tempId: 'temp-1', sending: false });
    expect(reconcileChatMessages([], [optimistic])).toEqual([optimistic]);
  });

  it('reconciles a populated conversation reference to the optimistic conversation id', () => {
    const optimistic = message({ _id: 'temp-1', tempId: 'temp-1', sending: false });
    const confirmed = message({ _id: 'server-1', conversation: { _id: 'conversation-1' } });
    expect(reconcileChatMessages([confirmed], [optimistic])).toEqual([confirmed]);
  });

  it('reconciles image-only messages sent to the General channel alias', () => {
    const optimistic = message({
      _id: 'temp-image',
      tempId: 'temp-image',
      content: '',
      attachments: ['https://images.example/photo.jpg'],
      channel: 'general',
      conversation: undefined,
    });
    const confirmed = message({
      _id: 'server-image',
      content: '',
      attachments: ['https://images.example/photo.jpg'],
      channel: 'resolved-general-channel-id',
      conversation: undefined,
    });

    expect(reconcileChatMessages([confirmed], [optimistic])).toEqual([confirmed]);
  });

  it('keeps separate rapid messages with identical text when only one echo has arrived', () => {
    const optimisticA = message({ _id: 'temp-a', tempId: 'temp-a', sending: true });
    const optimisticB = message({ _id: 'temp-b', tempId: 'temp-b', sending: true, createdAt: new Date(baseTime + 1000).toISOString() });
    const confirmed = message({ _id: 'server-1', createdAt: new Date(baseTime + 1200).toISOString() });

    expect(reconcileChatMessages([confirmed], [optimisticA, optimisticB]).map(item => item._id)).toEqual(['temp-b', 'server-1']);
  });

  it('does not reconcile another sender or a message outside the send window', () => {
    const optimistic = message({ _id: 'temp-1', tempId: 'temp-1', sending: true });
    const otherSender = message({ _id: 'server-other', sender: { _id: 'user-2' } });
    const oldSameText = message({ _id: 'server-old', createdAt: new Date(baseTime - 180_000).toISOString() });

    expect(reconcileChatMessages([otherSender, oldSameText], [optimistic])).toHaveLength(3);
  });
});
