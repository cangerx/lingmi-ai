import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      icon: 'lucide:wallet',
      order: 3,
      title: '财务管理',
    },
    name: 'Finance',
    path: '/finance',
    children: [
      {
        name: 'OrderList',
        path: '/finance/orders',
        component: () => import('#/views/order/list/index.vue'),
        meta: {
          icon: 'lucide:receipt',
          title: '订单管理',
        },
      },
      {
        name: 'PackageList',
        path: '/finance/packages',
        component: () => import('#/views/package/list/index.vue'),
        meta: {
          icon: 'lucide:package',
          title: '套餐管理',
        },
      },
      {
        name: 'RedeemCodeList',
        path: '/finance/redeem-codes',
        component: () => import('#/views/redeem/list/index.vue'),
        meta: {
          icon: 'lucide:ticket',
          title: '兑换码管理',
        },
      },
    ],
  },
];

export default routes;
