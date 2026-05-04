import { requestClient } from '#/api/request';

export function getGenerationList(params?: Record<string, any>) {
  return requestClient.get('/admin/generations', { params });
}

export function getGeneration(id: number) {
  return requestClient.get(`/admin/generations/${id}`);
}
