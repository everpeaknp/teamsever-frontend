import { describe, expect, it } from 'vitest';
import { CHAT_IMAGE_ONLY_CONTENT, getChatMessageContent, MAX_CHAT_IMAGE_BYTES, shouldRenderChatMessageText, validateChatImageSelection } from './chatImages';

const image = (name: string, type = 'image/jpeg', size = 100) => new File([new Uint8Array(size)], name, { type });

describe('chat image selection', () => {
  it('accepts up to five supported images', () => {
    const files = ['a.jpg', 'b.png', 'c.webp', 'd.gif', 'e.jpg'].map((name) => image(name));
    expect(validateChatImageSelection([], files)).toBeNull();
  });

  it('rejects more than five images across picker selections', () => {
    expect(validateChatImageSelection([image('a.jpg')], Array.from({ length: 5 }, (_, i) => image(`${i}.jpg`))))
      .toContain('up to 5');
  });

  it('rejects unsupported formats and images over 10 MB', () => {
    expect(validateChatImageSelection([], [image('a.svg', 'image/svg+xml')])).toContain('JPEG, PNG');
    expect(validateChatImageSelection([], [image('large.jpg', 'image/jpeg', MAX_CHAT_IMAGE_BYTES + 1)]))
      .toContain('10 MB');
  });
});


describe('image-only chat messages', () => {
  it('uses a backend-compatible content fallback but renders only the attachment', () => {
    const content = getChatMessageContent('', 1);
    expect(content).toBe(CHAT_IMAGE_ONLY_CONTENT);
    expect(shouldRenderChatMessageText(content, 1)).toBe(false);
    expect(getChatMessageContent('caption', 1)).toBe('caption');
    expect(shouldRenderChatMessageText('caption', 1)).toBe(true);
  });
});
