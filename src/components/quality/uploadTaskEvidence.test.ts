import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/axios';
import { uploadTaskEvidence } from './uploadTaskEvidence';

vi.mock('@/lib/axios', () => ({ api: { post: vi.fn() } }));

describe('bug evidence upload', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('signs, uploads, and confirms a file for the created bug', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { data: { signature: 'signed', timestamp: 123, cloudName: 'workspace', apiKey: 'key', folder: 'attachments/images' } } })
      .mockResolvedValueOnce({ data: { success: true } });
    const fetchUpload = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ secure_url: 'https://example.com/failure.png', public_id: 'attachments/images/failure', bytes: 4, resource_type: 'image' }) });
    vi.stubGlobal('fetch', fetchUpload);
    await uploadTaskEvidence('bug-1', new File(['fail'], 'failure.png', { type: 'image/png' }));
    expect(api.post).toHaveBeenNthCalledWith(1, '/tasks/bug-1/attachments/init-upload', { fileName: 'failure.png', fileType: 'image/png', fileSize: 4 });
    expect(fetchUpload.mock.calls[0][0]).toBe('https://api.cloudinary.com/v1_1/workspace/image/upload');
    expect(api.post).toHaveBeenNthCalledWith(2, '/tasks/bug-1/attachments/confirm', expect.objectContaining({ public_id: 'attachments/images/failure', fileName: 'failure.png' }));
  });
});
