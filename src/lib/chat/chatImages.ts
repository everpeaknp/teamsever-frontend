export const MAX_CHAT_IMAGES = 5;
export const MAX_CHAT_IMAGE_BYTES = 10 * 1024 * 1024;
export const CHAT_IMAGE_ONLY_CONTENT = '📷 Photo';

const CHAT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function getChatMessageContent(content: string, attachmentCount: number): string {
  return content.trim();
}

export function shouldRenderChatMessageText(content: string, attachmentCount: number): boolean {
  return content.length > 0 && !(attachmentCount > 0 && content.trim() === CHAT_IMAGE_ONLY_CONTENT);
}

export function getChatNotificationPreview(content: string, attachmentCount: number): string {
  const message = content.trim();
  if (message && !(attachmentCount > 0 && message === CHAT_IMAGE_ONLY_CONTENT)) return message;
  return attachmentCount > 0 ? 'sent a photo' : 'Message';
}

export function validateChatImageSelection(current: File[], picked: File[]): string | null {
  if (current.length + picked.length > MAX_CHAT_IMAGES) {
    return `Choose up to ${MAX_CHAT_IMAGES} images per message.`;
  }
  if (picked.some((file) => !CHAT_IMAGE_TYPES.has(file.type))) {
    return 'Choose JPEG, PNG, WebP, or GIF images.';
  }
  if (picked.some((file) => file.size > MAX_CHAT_IMAGE_BYTES)) {
    return 'Each image must be 10 MB or smaller.';
  }
  return null;
}
