import { requestClient } from '#/api/request';

export function getNotificationList(params?: Record<string, any>) {
  return requestClient.get('/admin/notifications', { params });
}

export function createNotification(data: Record<string, any>) {
  return requestClient.post('/admin/notifications', data);
}

export function updateNotification(id: number, data: Record<string, any>) {
  return requestClient.put(`/admin/notifications/${id}`, data);
}

export function deleteNotification(id: number) {
  return requestClient.delete(`/admin/notifications/${id}`);
}
