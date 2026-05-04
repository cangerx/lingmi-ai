import { requestClient } from '#/api/request';

export function getInspirationList(params?: Record<string, any>) {
  return requestClient.get('/admin/inspirations', { params });
}

export function createInspiration(data: Record<string, any>) {
  return requestClient.post('/admin/inspirations', data);
}

export function updateInspiration(id: number, data: Record<string, any>) {
  return requestClient.put(`/admin/inspirations/${id}`, data);
}

export function deleteInspiration(id: number) {
  return requestClient.delete(`/admin/inspirations/${id}`);
}

export function updateInspirationStatus(id: number, status: string) {
  return requestClient.put(`/admin/inspirations/${id}/status`, { status });
}

export function toggleInspirationFeatured(id: number) {
  return requestClient.put(`/admin/inspirations/${id}/featured`);
}
