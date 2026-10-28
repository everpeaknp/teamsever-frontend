import { describe, expect, it } from 'vitest';
import { chatImagePreviewUrl } from './chatImageUrls';

describe('chatImagePreviewUrl', () => {
  it('requests a size-limited, automatically optimized Cloudinary preview', () => {
    expect(chatImagePreviewUrl('https://res.cloudinary.com/demo/image/upload/v123/chat/photo.jpg'))
      .toBe('https://res.cloudinary.com/demo/image/upload/c_limit,w_960,f_auto,q_auto/v123/chat/photo.jpg');
  });

  it('leaves non-Cloudinary URLs unchanged', () => {
    expect(chatImagePreviewUrl('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
  });

  it('clamps preview width to a safe range', () => {
    expect(chatImagePreviewUrl('https://res.cloudinary.com/demo/image/upload/photo.jpg', 9000))
      .toContain('/c_limit,w_1600,f_auto,q_auto/');
  });
});
