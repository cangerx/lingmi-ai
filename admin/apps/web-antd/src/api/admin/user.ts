import { requestClient } from '#/api/request';

export function getUserList(params?: Record<string, any>) {
  return requestClient.get('/admin/users', { params });
}

export function getUser(id: number) {
  return requestClient.get(`/admin/users/${id}`);
}

export function updateUserStatus(id: number, status: string) {
  return requestClient.put(`/admin/users/${id}/status`, { status });
}

export function adjustUserCredits(id: number, amount: number, reason: string) {
  return requestClient.post(`/admin/users/${id}/credits`, { amount, reason });
}

export function getUserCreditLogs(id: number, params?: Record<string, any>) {
  return requestClient.get(`/admin/users/${id}/credit-logs`, { params });
}

export function rechargePackage(id: number, packageId: number, remark: string) {
  return requestClient.post(`/admin/users/${id}/recharge-package`, { package_id: packageId, remark });
}
