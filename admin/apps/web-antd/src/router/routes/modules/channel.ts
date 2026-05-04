import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      icon: 'lucide:cable',
      order: 2,
      title: 'AI 配置',
    },
    name: 'AIConfig',
    path: '/ai',
    children: [
      {
        name: 'ChannelList',
        path: '/ai/channels',
        component: () => import('#/views/channel/list/index.vue'),
        meta: {
          icon: 'lucide:server',
          title: '渠道管理',
        },
      },
      {
        name: 'ModelList',
        path: '/ai/models',
        component: () => import('#/views/model/list/index.vue'),
        meta: {
          icon: 'lucide:brain',
          title: '模型管理',
        },
      },
    ],
  },
];

export default routes;
