import { requestClient } from '#/api/request';

export function getAdList(params?: Record<string, any>) {
  return requestClient.get('/admin/ads', { params });
}

export function createAd(data: Record<string, any>) {
  return requestClient.post('/admin/ads', data);
}

export function updateAd(id: number, data: Record<string, any>) {
  return requestClient.put(`/admin/ads/${id}`, data);
}

export function deleteAd(id: number) {
  return requestClient.delete(`/admin/ads/${id}`);
}

export function getAdStats(id: number) {
  return requestClient.get(`/admin/ads/${id}/stats`);
}
