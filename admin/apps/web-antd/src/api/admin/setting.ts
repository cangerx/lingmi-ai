import { requestClient } from '#/api/request';

export function getSettingsByGroup(group: string) {
  return requestClient.get(`/admin/settings/${group}`);
}

export function updateSettingsByGroup(group: string, data: any[]) {
  return requestClient.put(`/admin/settings/${group}`, data);
}
