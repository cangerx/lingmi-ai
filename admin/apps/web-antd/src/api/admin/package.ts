import { requestClient } from '#/api/request';

export function getPackageList() {
  return requestClient.get('/admin/packages');
}

export function createPackage(data: Record<string, any>) {
  return requestClient.post('/admin/packages', data);
}

export function updatePackage(id: number, data: Record<string, any>) {
  return requestClient.put(`/admin/packages/${id}`, data);
}

export function deletePackage(id: number) {
  return requestClient.delete(`/admin/packages/${id}`);
}
