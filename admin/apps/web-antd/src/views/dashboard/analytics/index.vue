<script lang="ts" setup>
import type { AnalysisOverviewItem } from '@vben/common-ui';

import { onMounted, ref } from 'vue';

import { AnalysisOverview } from '@vben/common-ui';
import {
  SvgBellIcon,
  SvgCakeIcon,
  SvgCardIcon,
  SvgDownloadIcon,
} from '@vben/icons';

import { Card, Segmented, Spin, Statistic } from 'ant-design-vue';
import {
  TeamOutlined,
  ApiOutlined,
  RobotOutlined,
  BarChartOutlined,
} from '@ant-design/icons-vue';

import { getDashboardStats, getDashboardTrends } from '#/api/admin';

const loading = ref(true);
const overviewItems = ref<AnalysisOverviewItem[]>([
  { icon: SvgCardIcon, title: '今日新增用户', totalTitle: '总用户数', totalValue: 0, value: 0 },
  { icon: SvgCakeIcon, title: '今日收入', totalTitle: '总收入', totalValue: 0, value: 0 },
  { icon: SvgDownloadIcon, title: '今日生成次数', totalTitle: '总生成次数', totalValue: 0, value: 0 },
  { icon: SvgBellIcon, title: '今日活跃用户', totalTitle: '总订单数', totalValue: 0, value: 0 },
]);

const extraStats = ref<Record<string, number>>({});

async function fetchStats() {
  loading.value = true;
  try {
    const data: any = await getDashboardStats();
    overviewItems.value = [
      { icon: SvgCardIcon, title: '今日新增用户', totalTitle: '总用户数', totalValue: data.total_users ?? 0, value: data.today_users ?? 0 },
      { icon: SvgCakeIcon, title: '今日收入(¥)', totalTitle: '总收入(¥)', totalValue: data.total_revenue ?? 0, value: data.today_revenue ?? 0 },
      { icon: SvgDownloadIcon, title: '今日生成次数', totalTitle: '总生成次数', totalValue: data.total_generations ?? 0, value: data.today_generations ?? 0 },
      { icon: SvgBellIcon, title: '今日活跃用户', totalTitle: '总订单数', totalValue: data.total_orders ?? 0, value: data.active_users ?? 0 },
    ];
    extraStats.value = data;
  } catch (e) {
    console.error('Failed to fetch dashboard stats', e);
  } finally {
    loading.value = false;
  }
}

// Trend data
const trendDays = ref<number>(7);
const trendLoading = ref(false);
const trendData = ref<any>({});

async function fetchTrends() {
  trendLoading.value = true;
  try {
    const data: any = await getDashboardTrends(trendDays.value);
    trendData.value = data;
  } catch {
    // handled
  } finally {
    trendLoading.value = false;
  }
}

function handleDaysChange(val: any) {
  trendDays.value = val as number;
  fetchTrends();
}

function buildDates(days: number) {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function getTrendValues(key: string, field: 'count' | 'sum') {
  const dates = buildDates(trendDays.value);
  const items: any[] = trendData.value[key] ?? [];
  const map: Record<string, number> = {};
  for (const item of items) {
    map[item.date] = item[field] ?? 0;
  }
  return dates.map((d) => map[d] ?? 0);
}

onMounted(() => {
  fetchStats();
  fetchTrends();
});
</script>

<template>
  <div class="p-5">
    <Spin :spinning="loading">
      <AnalysisOverview :items="overviewItems" />
    </Spin>

    <!-- Extra stats row -->
    <div class="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card size="small">
        <Statistic title="今日积分消耗" :value="extraStats.today_credits_consumed ?? 0" :precision="1" value-style="color: #ff4d4f; font-size: 20px" />
        <div class="mt-1 text-xs text-gray-400">总消耗: {{ (extraStats.total_credits_consumed ?? 0).toFixed(1) }}</div>
      </Card>
      <Card size="small">
        <Statistic title="今日对话数" :value="extraStats.today_conversations ?? 0" value-style="color: #1677ff; font-size: 20px" />
        <div class="mt-1 text-xs text-gray-400">总对话: {{ extraStats.total_conversations ?? 0 }}</div>
      </Card>
      <Card size="small">
        <Statistic title="今日消息数" :value="extraStats.today_messages ?? 0" value-style="color: #722ed1; font-size: 20px" />
        <div class="mt-1 text-xs text-gray-400">总消息: {{ extraStats.total_messages ?? 0 }}</div>
      </Card>
      <Card size="small">
        <Statistic title="今日活跃用户" :value="extraStats.active_users ?? 0" value-style="color: #52c41a; font-size: 20px" />
        <div class="mt-1 text-xs text-gray-400">总用户: {{ extraStats.total_users ?? 0 }}</div>
      </Card>
    </div>

    <!-- Trends -->
    <Card class="mt-5">
      <template #title>
        <span>数据趋势</span>
      </template>
      <template #extra>
        <Segmented :value="trendDays" :options="[{ label: '近7天', value: 7 }, { label: '近30天', value: 30 }]" @change="handleDaysChange" />
      </template>
      <Spin :spinning="trendLoading">
        <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <h4 class="mb-3 text-sm font-medium text-gray-600">新增用户</h4>
            <div class="flex items-end gap-1" style="height: 120px">
              <div
                v-for="(val, idx) in getTrendValues('users', 'count')"
                :key="idx"
                :title="`${buildDates(trendDays)[idx]}: ${val}`"
                class="flex-1 rounded-t transition-all hover:opacity-80"
                :style="{
                  height: `${Math.max(4, (val / Math.max(...getTrendValues('users', 'count'), 1)) * 100)}%`,
                  backgroundColor: '#1677ff',
                  minWidth: '4px',
                }"
              />
            </div>
            <div class="mt-1 flex justify-between text-[10px] text-gray-400">
              <span>{{ buildDates(trendDays)[0] }}</span>
              <span>{{ buildDates(trendDays).at(-1) }}</span>
            </div>
          </div>
          <div>
            <h4 class="mb-3 text-sm font-medium text-gray-600">收入(¥)</h4>
            <div class="flex items-end gap-1" style="height: 120px">
              <div
                v-for="(val, idx) in getTrendValues('revenue', 'sum')"
                :key="idx"
                :title="`${buildDates(trendDays)[idx]}: ¥${val.toFixed(2)}`"
                class="flex-1 rounded-t transition-all hover:opacity-80"
                :style="{
                  height: `${Math.max(4, (val / Math.max(...getTrendValues('revenue', 'sum'), 1)) * 100)}%`,
                  backgroundColor: '#52c41a',
                  minWidth: '4px',
                }"
              />
            </div>
            <div class="mt-1 flex justify-between text-[10px] text-gray-400">
              <span>{{ buildDates(trendDays)[0] }}</span>
              <span>{{ buildDates(trendDays).at(-1) }}</span>
            </div>
          </div>
          <div>
            <h4 class="mb-3 text-sm font-medium text-gray-600">生成次数</h4>
            <div class="flex items-end gap-1" style="height: 120px">
              <div
                v-for="(val, idx) in getTrendValues('generations', 'count')"
                :key="idx"
                :title="`${buildDates(trendDays)[idx]}: ${val}`"
                class="flex-1 rounded-t transition-all hover:opacity-80"
                :style="{
                  height: `${Math.max(4, (val / Math.max(...getTrendValues('generations', 'count'), 1)) * 100)}%`,
                  backgroundColor: '#722ed1',
                  minWidth: '4px',
                }"
              />
            </div>
            <div class="mt-1 flex justify-between text-[10px] text-gray-400">
              <span>{{ buildDates(trendDays)[0] }}</span>
              <span>{{ buildDates(trendDays).at(-1) }}</span>
            </div>
          </div>
        </div>
      </Spin>
    </Card>

    <Card class="mt-5" title="快捷入口">
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <router-link
          class="flex flex-col items-center gap-2 rounded-lg border p-4 transition hover:shadow-md"
          to="/user/list"
        >
          <TeamOutlined :style="{ fontSize: '22px', color: '#1677ff' }" />
          <span class="text-sm">用户管理</span>
        </router-link>
        <router-link
          class="flex flex-col items-center gap-2 rounded-lg border p-4 transition hover:shadow-md"
          to="/ai/channels"
        >
          <ApiOutlined :style="{ fontSize: '22px', color: '#52c41a' }" />
          <span class="text-sm">渠道管理</span>
        </router-link>
        <router-link
          class="flex flex-col items-center gap-2 rounded-lg border p-4 transition hover:shadow-md"
          to="/ai/models"
        >
          <RobotOutlined :style="{ fontSize: '22px', color: '#722ed1' }" />
          <span class="text-sm">模型管理</span>
        </router-link>
        <router-link
          class="flex flex-col items-center gap-2 rounded-lg border p-4 transition hover:shadow-md"
          to="/analytics"
        >
          <BarChartOutlined :style="{ fontSize: '22px', color: '#fa8c16' }" />
          <span class="text-sm">数据概览</span>
        </router-link>
      </div>
    </Card>
  </div>
</template>
