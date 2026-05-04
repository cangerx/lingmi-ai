import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      icon: 'lucide:settings',
      order: 10,
      title: '系统设置',
    },
    name: 'System',
    path: '/system',
    children: [
      {
        name: 'SiteSettings',
        path: '/system/site',
        component: () => import('#/views/setting/site/index.vue'),
        meta: {
          icon: 'lucide:globe',
          title: '网站设置',
        },
      },
      {
        name: 'PaymentSettings',
        path: '/system/payment',
        component: () => import('#/views/setting/payment/index.vue'),
        meta: {
          icon: 'lucide:credit-card',
          title: '支付设置',
        },
      },
      {
        name: 'StorageSettings',
        path: '/system/storage',
        component: () => import('#/views/setting/storage/index.vue'),
        meta: {
          icon: 'lucide:hard-drive',
          title: '存储设置',
        },
      },
      {
        name: 'AppModules',
        path: '/system/modules',
        component: () => import('#/views/setting/modules/index.vue'),
        meta: {
          icon: 'lucide:layout-grid',
          title: '应用模块',
        },
      },
      {
        name: 'LoginSettings',
        path: '/system/login',
        component: () => import('#/views/setting/login/index.vue'),
        meta: {
          icon: 'lucide:log-in',
          title: '登录设置',
        },
      },
      {
        name: 'ModerationSettings',
        path: '/system/moderation',
        component: () => import('#/views/setting/moderation/index.vue'),
        meta: {
          icon: 'lucide:shield',
          title: '内容审核',
        },
      },
    ],
  },
];

export default routes;
