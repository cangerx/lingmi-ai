import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      icon: 'lucide:megaphone',
      order: 4,
      title: '运营管理',
    },
    name: 'Operations',
    path: '/ops',
    children: [
      {
        name: 'NotificationList',
        path: '/ops/notifications',
        component: () => import('#/views/notification/list/index.vue'),
        meta: {
          icon: 'lucide:bell',
          title: '通知管理',
        },
      },
      {
        name: 'AdList',
        path: '/ops/ads',
        component: () => import('#/views/ad/list/index.vue'),
        meta: {
          icon: 'lucide:image',
          title: '广告管理',
        },
      },
      {
        name: 'InspirationList',
        path: '/ops/inspirations',
        component: () => import('#/views/inspiration/list/index.vue'),
        meta: {
          icon: 'lucide:lightbulb',
          title: '灵感库',
        },
      },
      {
        name: 'GenerationList',
        path: '/ops/generations',
        component: () => import('#/views/generation/list/index.vue'),
        meta: {
          icon: 'lucide:sparkles',
          title: '生成记录',
        },
      },
      {
        name: 'ModerationReview',
        path: '/ops/moderation',
        component: () => import('#/views/moderation/review/index.vue'),
        meta: {
          icon: 'lucide:shield-check',
          title: '内容审核',
        },
      },
      {
        name: 'ReferralSettings',
        path: '/ops/referral',
        component: () => import('#/views/setting/referral/index.vue'),
        meta: {
          icon: 'lucide:gift',
          title: '邀请奖励',
        },
      },
      {
        name: 'SensitiveWords',
        path: '/ops/sensitive-words',
        component: () => import('#/views/moderation/words/index.vue'),
        meta: {
          icon: 'lucide:shield-alert',
          title: '违禁词管理',
        },
      },
    ],
  },
];

export default routes;
