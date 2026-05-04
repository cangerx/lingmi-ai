import { requestClient } from '#/api/request';

export function adminUpload(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post('/admin/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
