import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      icon: 'lucide:users',
      order: 1,
      title: '用户管理',
    },
    name: 'UserManagement',
    path: '/user',
    children: [
      {
        name: 'UserList',
        path: '/user/list',
        component: () => import('#/views/user/list/index.vue'),
        meta: {
          icon: 'lucide:list',
          title: '用户列表',
        },
      },
    ],
  },
];

export default routes;
