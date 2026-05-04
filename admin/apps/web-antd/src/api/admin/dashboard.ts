import { requestClient } from '#/api/request';

export function getDashboardStats() {
  return requestClient.get('/admin/dashboard/stats');
}

export function getDashboardTrends(days: number = 7) {
  return requestClient.get('/admin/dashboard/trends', { params: { days } });
}
