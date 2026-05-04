import { requestClient } from '#/api/request';

export function getRedeemCodeList(params?: Record<string, any>) {
  return requestClient.get('/admin/redeem-codes', { params });
}

export function batchCreateRedeemCodes(data: Record<string, any>) {
  return requestClient.post('/admin/redeem-codes/batch', data);
}

export function updateRedeemCodeStatus(id: number, status: string) {
  return requestClient.put(`/admin/redeem-codes/${id}/status`, { status });
}

export function deleteRedeemCode(id: number) {
  return requestClient.delete(`/admin/redeem-codes/${id}`);
}

export function getRedeemLogs(params?: Record<string, any>) {
  return requestClient.get('/admin/redeem-codes/logs', { params });
}
