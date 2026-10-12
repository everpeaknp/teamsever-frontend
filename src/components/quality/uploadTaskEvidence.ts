import { api } from '@/lib/axios';

export async function uploadTaskEvidence(taskId: string, file: File) {
  const { data: initResponse } = await api.post(`/tasks/${taskId}/attachments/init-upload`, {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  });
  const { signature, timestamp, cloudName, apiKey, folder } = initResponse.data;
  const resourceType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'raw';
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('folder', folder);
  form.append('resource_type', resourceType);
  const uploaded = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`, {
    method: 'POST', body: form,
  });
  const body = await uploaded.json();
  if (!uploaded.ok) throw new Error(body?.error?.message || 'Could not upload evidence.');
  await api.post(`/tasks/${taskId}/attachments/confirm`, {
    ...body,
    fileName: file.name,
    fileType: file.type,
  });
}
