import { requestClient } from '#/api/request';

export function getOrderList(params?: Record<string, any>) {
  return requestClient.get('/admin/orders', { params });
}

export function getOrder(id: number) {
  return requestClient.get(`/admin/orders/${id}`);
}

export function updateOrderStatus(id: number, status: string) {
  return requestClient.put(`/admin/orders/${id}/status`, { status });
}

export function refundOrder(id: number) {
  return requestClient.post(`/admin/orders/${id}/refund`);
}
