import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 获取管理员信息 — 调用 /admin/auth/profile
 */
export async function getUserInfoApi(): Promise<UserInfo> {
  const res = await requestClient.get('/admin/auth/profile');
  const raw = (res as any)?.admin ?? (res as any)?.data?.admin ?? res;
  return {
    realName: raw.username || 'Admin',
    roles: ['admin'],
    userId: String(raw.id || ''),
    username: raw.username || '',
    avatar: '',
    desc: '管理员',
    homePath: '/analytics',
  } as UserInfo;
}
