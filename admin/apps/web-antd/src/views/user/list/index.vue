<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import {
  Badge,
  Button,
  Card,
  Drawer,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  SelectOption,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  adjustUserCredits,
  getUserCreditLogs,
  getUserList,
  getPackageList,
  rechargePackage,
  updateUserStatus,
} from '#/api/admin';

const loading = ref(false);
const dataSource = ref<any[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const searchKeyword = ref('');

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '昵称', dataIndex: 'nickname', width: 110, ellipsis: true },
  { title: '邮箱', dataIndex: 'email', width: 180, ellipsis: true },
  { title: '手机', dataIndex: 'phone', width: 130 },
  { title: '积分余额', dataIndex: 'balance', width: 100, key: 'balance' },
  { title: '累计充值', dataIndex: 'total_recharged', width: 100, key: 'total_recharged' },
  { title: '累计消耗', dataIndex: 'total_consumed', width: 100, key: 'total_consumed' },
  { title: '状态', dataIndex: 'status', width: 80, key: 'status' },
  { title: '最近活跃', dataIndex: 'last_login_at', width: 160, key: 'last_login_at' },
  { title: '注册时间', dataIndex: 'created_at', width: 160, key: 'created_at' },
  { title: '操作', key: 'action', width: 280, fixed: 'right' },
];

async function fetchData() {
  loading.value = true;
  try {
    const res: any = await getUserList({
      page: pagination.current,
      page_size: pagination.pageSize,
      keyword: searchKeyword.value || undefined,
    });
    dataSource.value = res.data ?? [];
    pagination.total = res.total ?? 0;
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag: any) {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  fetchData();
}

function handleSearch() {
  pagination.current = 1;
  fetchData();
}

function formatTime(t: string | null) {
  if (!t) return '-';
  return new Date(t).toLocaleString('zh-CN');
}

function timeAgo(t: string | null) {
  if (!t) return '从未登录';
  const diff = Date.now() - new Date(t).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return formatTime(t);
}

async function toggleStatus(record: any) {
  const newStatus = record.status === 'active' ? 'banned' : 'active';
  try {
    await updateUserStatus(record.id, newStatus);
    message.success(newStatus === 'banned' ? '已封禁' : '已解封');
    fetchData();
  } catch {
    // handled
  }
}

// ── Credits adjust modal ──
const creditsModal = reactive({ visible: false, userId: 0, nickname: '', amount: 0, reason: '' });

function openCreditsModal(record: any) {
  creditsModal.userId = record.id;
  creditsModal.nickname = record.nickname;
  creditsModal.amount = 0;
  creditsModal.reason = '';
  creditsModal.visible = true;
}

async function handleAdjustCredits() {
  if (!creditsModal.amount) return;
  try {
    await adjustUserCredits(creditsModal.userId, creditsModal.amount, creditsModal.reason);
    message.success('积分调整成功');
    creditsModal.visible = false;
    fetchData();
  } catch {
    // handled
  }
}

// ── Package recharge modal ──
const pkgModal = reactive({ visible: false, userId: 0, nickname: '', packageId: undefined as number | undefined, remark: '', loading: false });
const packages = ref<any[]>([]);

async function loadPackages() {
  try {
    const res: any = await getPackageList();
    packages.value = res.data ?? res ?? [];
  } catch { /* handled */ }
}

function openPkgModal(record: any) {
  pkgModal.userId = record.id;
  pkgModal.nickname = record.nickname;
  pkgModal.packageId = undefined;
  pkgModal.remark = '';
  pkgModal.visible = true;
  if (packages.value.length === 0) loadPackages();
}

async function handleRechargePackage() {
  if (!pkgModal.packageId) {
    message.warning('请选择套餐');
    return;
  }
  pkgModal.loading = true;
  try {
    const res: any = await rechargePackage(pkgModal.userId, pkgModal.packageId, pkgModal.remark);
    message.success(`充值成功：${res.package_name}，+${res.credits_added} 积分`);
    pkgModal.visible = false;
    fetchData();
  } catch {
    // handled
  } finally {
    pkgModal.loading = false;
  }
}

// ── Credit logs drawer ──
const logsDrawer = reactive({ visible: false, userId: 0, nickname: '', loading: false });
const creditLogs = ref<any[]>([]);
const logsPagination = reactive({ current: 1, pageSize: 20, total: 0 });

const logColumns = [
  { title: '时间', dataIndex: 'created_at', width: 160, key: 'log_time' },
  { title: '类型', dataIndex: 'type', width: 80, key: 'log_type' },
  { title: '变动', dataIndex: 'amount', width: 90, key: 'log_amount' },
  { title: '余额', dataIndex: 'balance', width: 90 },
  { title: '模型', dataIndex: 'model', width: 120 },
  { title: '详情', dataIndex: 'detail', ellipsis: true },
];

const typeLabels: Record<string, string> = {
  recharge: '充值',
  consume: '消费',
  gift: '赠送',
  invite: '邀请',
  sign_in: '签到',
  refund: '退款',
};

function openLogsDrawer(record: any) {
  logsDrawer.userId = record.id;
  logsDrawer.nickname = record.nickname;
  logsDrawer.visible = true;
  logsPagination.current = 1;
  fetchCreditLogs();
}

async function fetchCreditLogs() {
  logsDrawer.loading = true;
  try {
    const res: any = await getUserCreditLogs(logsDrawer.userId, {
      page: logsPagination.current,
      page_size: logsPagination.pageSize,
    });
    creditLogs.value = res.data ?? [];
    logsPagination.total = res.total ?? 0;
  } catch { /* handled */ } finally {
    logsDrawer.loading = false;
  }
}

function handleLogsTableChange(pag: any) {
  logsPagination.current = pag.current;
  fetchCreditLogs();
}

onMounted(fetchData);
</script>

<template>
  <div class="p-5">
    <Card title="用户管理">
      <template #extra>
        <Space>
          <Input
            v-model:value="searchKeyword"
            placeholder="搜索用户..."
            style="width: 200px"
            allow-clear
            @press-enter="handleSearch"
          />
          <Button type="primary" @click="handleSearch">搜索</Button>
        </Space>
      </template>

      <Table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :locale="{ emptyText: '暂无用户数据' }"
        :pagination="pagination"
        row-key="id"
        size="middle"
        :scroll="{ x: 1400 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'balance'">
            <span style="font-weight: 600; color: #1677ff">{{ record.balance?.toFixed(1) ?? '0' }}</span>
          </template>
          <template v-if="column.key === 'total_recharged'">
            <span style="color: #52c41a">{{ record.total_recharged?.toFixed(1) ?? '0' }}</span>
          </template>
          <template v-if="column.key === 'total_consumed'">
            <span style="color: #ff4d4f">{{ record.total_consumed?.toFixed(1) ?? '0' }}</span>
          </template>
          <template v-if="column.key === 'status'">
            <Badge :status="record.status === 'active' ? 'success' : 'error'" />
            <Tag :color="record.status === 'active' ? 'green' : 'red'">
              {{ record.status === 'active' ? '正常' : '封禁' }}
            </Tag>
          </template>
          <template v-if="column.key === 'last_login_at'">
            <Tooltip :title="formatTime(record.last_login_at)">
              <span>{{ timeAgo(record.last_login_at) }}</span>
            </Tooltip>
          </template>
          <template v-if="column.key === 'created_at'">
            {{ formatTime(record.created_at) }}
          </template>
          <template v-if="column.key === 'action'">
            <Space>
              <Button size="small" @click="openLogsDrawer(record)">消费记录</Button>
              <Button size="small" @click="openCreditsModal(record)">调整积分</Button>
              <Button size="small" type="primary" @click="openPkgModal(record)">充值套餐</Button>
              <Button
                size="small"
                :danger="record.status === 'active'"
                @click="toggleStatus(record)"
              >
                {{ record.status === 'active' ? '封禁' : '解封' }}
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- Adjust credits modal -->
    <Modal
      v-model:open="creditsModal.visible"
      :title="`调整积分 - ${creditsModal.nickname}`"
      @ok="handleAdjustCredits"
    >
      <div class="space-y-4 py-4">
        <div>
          <label class="mb-1 block text-sm">积分数量（正数增加，负数扣减）</label>
          <InputNumber v-model:value="creditsModal.amount" class="w-full" />
        </div>
        <div>
          <label class="mb-1 block text-sm">原因</label>
          <Input v-model:value="creditsModal.reason" placeholder="调整原因" />
        </div>
      </div>
    </Modal>

    <!-- Recharge package modal -->
    <Modal
      v-model:open="pkgModal.visible"
      :title="`充值套餐 - ${pkgModal.nickname}`"
      :confirm-loading="pkgModal.loading"
      @ok="handleRechargePackage"
    >
      <div class="space-y-4 py-4">
        <div>
          <label class="mb-1 block text-sm">选择套餐</label>
          <Select
            v-model:value="pkgModal.packageId"
            placeholder="请选择套餐"
            class="w-full"
          >
            <SelectOption v-for="pkg in packages" :key="pkg.id" :value="pkg.id">
              {{ pkg.name }} - ¥{{ pkg.price }} ({{ pkg.credits }}积分)
            </SelectOption>
          </Select>
        </div>
        <div>
          <label class="mb-1 block text-sm">备注</label>
          <Input v-model:value="pkgModal.remark" placeholder="充值备注（可选）" />
        </div>
      </div>
    </Modal>

    <!-- Credit logs drawer -->
    <Drawer
      v-model:open="logsDrawer.visible"
      :title="`消费记录 - ${logsDrawer.nickname}`"
      width="700"
    >
      <Table
        :columns="logColumns"
        :data-source="creditLogs"
        :loading="logsDrawer.loading"
        :pagination="logsPagination"
        row-key="id"
        size="small"
        @change="handleLogsTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'log_time'">
            {{ formatTime(record.created_at) }}
          </template>
          <template v-if="column.key === 'log_type'">
            <Tag :color="record.type === 'consume' ? 'red' : record.type === 'recharge' ? 'green' : 'blue'">
              {{ typeLabels[record.type] || record.type }}
            </Tag>
          </template>
          <template v-if="column.key === 'log_amount'">
            <span :style="{ color: record.amount >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }">
              {{ record.amount >= 0 ? '+' : '' }}{{ record.amount?.toFixed(1) }}
            </span>
          </template>
        </template>
      </Table>
    </Drawer>
  </div>
</template>
