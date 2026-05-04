import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

/**
 * 登录 — 调用 /admin/auth/login
 */
export async function loginApi(data: AuthApi.LoginParams) {
  // 后端返回 { token, admin }，需要映射为 { accessToken }
  const res = await baseRequestClient.post('/admin/auth/login', data);
  const raw = (res as any)?.data ?? res;
  return { accessToken: raw.token } as AuthApi.LoginResult;
}

/**
 * 刷新accessToken — 暂不支持，直接返回空
 */
export async function refreshTokenApi() {
  return { data: '', status: 0 } as AuthApi.RefreshTokenResult;
}

/**
 * 退出登录 — 纯前端清除 token
 */
export async function logoutApi() {
  return Promise.resolve();
}

/**
 * 获取用户权限码 — 管理员默认拥有所有权限
 */
export async function getAccessCodesApi() {
  return ['AC_100100', 'AC_100110', 'AC_100120', 'AC_100010'] as string[];
}
