<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  batchCreateRedeemCodes,
  deleteRedeemCode,
  getPackageList,
  getRedeemCodeList,
  getRedeemLogs,
  updateRedeemCodeStatus,
} from '#/api/admin';

const loading = ref(false);
const dataSource = ref<any[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const filterStatus = ref<string | undefined>(undefined);
const searchKeyword = ref('');
const summaryStats = ref<Record<string, number>>({});

const statusMap: Record<string, { color: string; label: string }> = {
  unused: { color: 'green', label: '未使用' },
  used: { color: 'blue', label: '已使用' },
  expired: { color: 'default', label: '已过期' },
  disabled: { color: 'red', label: '已禁用' },
};

function formatTime(t: string | null) {
  if (!t) return '-';
  return new Date(t).toLocaleString('zh-CN');
}

function isExpired(t: string | null) {
  if (!t) return false;
  return new Date(t).getTime() < Date.now();
}

function copyCode(code: string) {
  navigator.clipboard.writeText(code).then(() => message.success('已复制'));
}

// Package list for selector
const packageList = ref<any[]>([]);
async function loadPackages() {
  try {
    const res: any = await getPackageList();
    packageList.value = (res.data ?? res ?? []).filter((p: any) => p.status === 'active');
  } catch { /* handled */ }
}

const columns = [
  { title: 'ID', dataIndex: 'id', width: 50 },
  { title: '兑换码', dataIndex: 'code', width: 180, key: 'code' },
  { title: '类型', dataIndex: 'type', width: 90, key: 'type' },
  { title: '积分/套餐', key: 'content', width: 120 },
  { title: '状态', dataIndex: 'status', width: 80, key: 'status' },
  { title: '使用情况', key: 'usage', width: 120 },
  { title: '过期时间', dataIndex: 'expires_at', width: 140, key: 'expires_at' },
  { title: '备注', dataIndex: 'remark', width: 140, ellipsis: true },
  { title: '创建时间', dataIndex: 'created_at', width: 140, key: 'created_at' },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
];

async function fetchData() {
  loading.value = true;
  try {
    const res: any = await getRedeemCodeList({
      page: pagination.current,
      page_size: pagination.pageSize,
      status: filterStatus.value,
      keyword: searchKeyword.value || undefined,
    });
    dataSource.value = res.data ?? [];
    pagination.total = res.total ?? 0;
    summaryStats.value = {
      total_codes: res.total_codes ?? 0,
      unused_codes: res.unused_codes ?? 0,
      used_codes: res.used_codes ?? 0,
      total_credits: res.total_credits ?? 0,
    };
  } catch {
    // handled
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

// ── Batch create modal ──
const createModal = reactive({
  visible: false,
  type: 'credits' as 'credits' | 'package',
  prefix: 'LM',
  credits: 100,
  package_id: undefined as number | undefined,
  count: 10,
  max_uses: 1,
  expires_at: '',
  remark: '',
  loading: false,
});

function openCreateModal() {
  Object.assign(createModal, {
    visible: true, type: 'credits', prefix: 'LM', credits: 100, package_id: undefined,
    count: 10, max_uses: 1, expires_at: '', remark: '', loading: false,
  });
  loadPackages();
}

async function handleBatchCreate() {
  if (createModal.type === 'credits' && createModal.credits <= 0) {
    message.warning('请输入积分数量');
    return;
  }
  if (createModal.type === 'package' && !createModal.package_id) {
    message.warning('请选择套餐');
    return;
  }
  createModal.loading = true;
  try {
    const payload: any = {
      type: createModal.type,
      prefix: createModal.prefix,
      count: createModal.count,
      max_uses: createModal.max_uses,
      expires_at: createModal.expires_at || undefined,
      remark: createModal.remark,
    };
    if (createModal.type === 'credits') {
      payload.credits = createModal.credits;
    } else {
      payload.package_id = createModal.package_id;
    }
    const res: any = await batchCreateRedeemCodes(payload);
    message.success(res.message || `已创建 ${createModal.count} 个兑换码`);
    createModal.visible = false;
    fetchData();
  } catch {
    // handled
  } finally {
    createModal.loading = false;
  }
}

async function handleToggleStatus(record: any) {
  const newStatus = record.status === 'disabled' ? 'unused' : 'disabled';
  try {
    await updateRedeemCodeStatus(record.id, newStatus);
    message.success(newStatus === 'disabled' ? '已禁用' : '已启用');
    fetchData();
  } catch {
    // handled
  }
}

async function handleDelete(id: number) {
  try {
    await deleteRedeemCode(id);
    message.success('已删除');
    fetchData();
  } catch {
    // handled
  }
}

// ── Redeem logs drawer ──
const logsDrawer = reactive({ visible: false, codeId: 0, code: '', loading: false });
const redeemLogs = ref<any[]>([]);
const logsPagination = reactive({ current: 1, pageSize: 20, total: 0 });

const logColumns = [
  { title: '时间', dataIndex: 'redeemed_at', width: 160, key: 'log_time' },
  { title: '用户', dataIndex: 'nickname', width: 120, key: 'log_user' },
  { title: '兑换码', dataIndex: 'code', width: 180 },
  { title: '积分', dataIndex: 'credits', width: 80 },
  { title: 'IP', dataIndex: 'ip', width: 130 },
];

function openLogsDrawer(record: any) {
  logsDrawer.codeId = record.id;
  logsDrawer.code = record.code;
  logsDrawer.visible = true;
  logsPagination.current = 1;
  fetchRedeemLogs();
}

async function fetchRedeemLogs() {
  logsDrawer.loading = true;
  try {
    const res: any = await getRedeemLogs({
      code_id: logsDrawer.codeId,
      page: logsPagination.current,
      page_size: logsPagination.pageSize,
    });
    redeemLogs.value = res.data ?? [];
    logsPagination.total = res.total ?? 0;
  } catch { /* handled */ } finally {
    logsDrawer.loading = false;
  }
}

function handleLogsTableChange(pag: any) {
  logsPagination.current = pag.current;
  fetchRedeemLogs();
}

onMounted(() => {
  fetchData();
  loadPackages();
});
</script>

<template>
  <div class="p-5">
    <!-- Summary stats -->
    <div class="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card size="small">
        <Statistic title="总兑换码" :value="summaryStats.total_codes ?? 0" value-style="color: #1677ff; font-size: 20px" />
      </Card>
      <Card size="small">
        <Statistic title="未使用" :value="summaryStats.unused_codes ?? 0" value-style="color: #52c41a; font-size: 20px" />
      </Card>
      <Card size="small">
        <Statistic title="已使用" :value="summaryStats.used_codes ?? 0" value-style="color: #722ed1; font-size: 20px" />
      </Card>
      <Card size="small">
        <Statistic title="总积分面值" :value="summaryStats.total_credits ?? 0" :precision="0" value-style="color: #faad14; font-size: 20px" />
      </Card>
    </div>

    <Card title="兑换码管理">
      <template #extra>
        <Space>
          <Input
            v-model:value="searchKeyword"
            allow-clear
            placeholder="搜索兑换码/备注"
            style="width: 180px"
            @press-enter="handleSearch"
          />
          <Select
            v-model:value="filterStatus"
            allow-clear
            placeholder="状态筛选"
            style="width: 110px"
            @change="handleSearch"
          >
            <Select.Option value="unused">未使用</Select.Option>
            <Select.Option value="used">已使用</Select.Option>
            <Select.Option value="disabled">已禁用</Select.Option>
          </Select>
          <Button type="primary" @click="handleSearch">搜索</Button>
          <Button type="primary" @click="openCreateModal">批量生成</Button>
        </Space>
      </template>

      <Table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :locale="{ emptyText: '暂无兑换码数据' }"
        :pagination="pagination"
        row-key="id"
        size="middle"
        :scroll="{ x: 1200 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'code'">
            <Tooltip title="点击复制">
              <span
                class="cursor-pointer font-mono text-xs hover:text-blue-500"
                @click="copyCode(record.code)"
              >
                {{ record.code }}
              </span>
            </Tooltip>
          </template>
          <template v-if="column.key === 'type'">
            <Tag :color="record.type === 'package' ? 'purple' : 'blue'">
              {{ record.type === 'package' ? '套餐' : '积分' }}
            </Tag>
          </template>
          <template v-if="column.key === 'content'">
            <span v-if="record.type === 'package'" class="text-purple-600 font-medium">
              {{ record.package_name || `套餐#${record.package_id}` }}
            </span>
            <span v-else style="font-weight: 600; color: #faad14">{{ record.credits }} 积分</span>
          </template>
          <template v-if="column.key === 'status'">
            <Tag :color="statusMap[record.status]?.color ?? 'default'">
              {{ statusMap[record.status]?.label ?? record.status }}
            </Tag>
          </template>
          <template v-if="column.key === 'usage'">
            <div class="flex items-center gap-2">
              <Progress
                :percent="record.max_uses > 0 ? Math.round((record.used_count / record.max_uses) * 100) : 0"
                :size="'small'"
                :show-info="false"
                :stroke-color="record.used_count >= record.max_uses ? '#ff4d4f' : '#1677ff'"
                style="width: 60px"
              />
              <span class="text-xs text-gray-500">{{ record.used_count }}/{{ record.max_uses }}</span>
            </div>
          </template>
          <template v-if="column.key === 'expires_at'">
            <span v-if="record.expires_at" :style="{ color: isExpired(record.expires_at) ? '#ff4d4f' : undefined }">
              {{ formatTime(record.expires_at) }}
            </span>
            <span v-else class="text-gray-300">永久</span>
          </template>
          <template v-if="column.key === 'created_at'">
            {{ formatTime(record.created_at) }}
          </template>
          <template v-if="column.key === 'action'">
            <Space>
              <Button v-if="record.used_count > 0" size="small" @click="openLogsDrawer(record)">使用记录</Button>
              <Button
                v-if="record.status === 'unused' || record.status === 'disabled'"
                size="small"
                @click="handleToggleStatus(record)"
              >
                {{ record.status === 'disabled' ? '启用' : '禁用' }}
              </Button>
              <Popconfirm title="确认删除？" @confirm="handleDelete(record.id)">
                <Button size="small" danger>删除</Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- Batch create modal -->
    <Modal
      v-model:open="createModal.visible"
      title="批量生成兑换码"
      :confirm-loading="createModal.loading"
      @ok="handleBatchCreate"
    >
      <Form layout="vertical" class="py-4">
        <Form.Item label="兑换码类型">
          <Select v-model:value="createModal.type" style="width: 100%">
            <Select.Option value="credits">积分兑换码</Select.Option>
            <Select.Option value="package">套餐兑换码</Select.Option>
          </Select>
        </Form.Item>
        <div class="grid grid-cols-2 gap-4">
          <Form.Item label="前缀">
            <Input v-model:value="createModal.prefix" placeholder="LM" />
          </Form.Item>
          <Form.Item v-if="createModal.type === 'credits'" label="积分数量">
            <InputNumber v-model:value="createModal.credits" :min="1" class="w-full" />
          </Form.Item>
          <Form.Item v-else label="选择套餐">
            <Select v-model:value="createModal.package_id" placeholder="请选择套餐" style="width: 100%">
              <Select.Option v-for="pkg in packageList" :key="pkg.id" :value="pkg.id">
                {{ pkg.name }}(¥{{ pkg.price }}，{{ pkg.credits }}积分)
              </Select.Option>
            </Select>
          </Form.Item>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <Form.Item label="生成数量 (最多1000)">
            <InputNumber v-model:value="createModal.count" :min="1" :max="1000" class="w-full" />
          </Form.Item>
          <Form.Item label="每码可用次数">
            <InputNumber v-model:value="createModal.max_uses" :min="1" class="w-full" />
          </Form.Item>
        </div>
        <Form.Item label="过期日期 (可选，格式: YYYY-MM-DD)">
          <Input v-model:value="createModal.expires_at" placeholder="2026-12-31" />
        </Form.Item>
        <Form.Item label="备注">
          <Input v-model:value="createModal.remark" placeholder="用途说明（如：活动赠送）" />
        </Form.Item>
      </Form>
    </Modal>

    <!-- Redeem logs drawer -->
    <Drawer
      v-model:open="logsDrawer.visible"
      :title="`使用记录 - ${logsDrawer.code}`"
      width="650"
    >
      <Table
        :columns="logColumns"
        :data-source="redeemLogs"
        :loading="logsDrawer.loading"
        :pagination="logsPagination"
        row-key="id"
        size="small"
        @change="handleLogsTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'log_time'">
            {{ formatTime(record.redeemed_at) }}
          </template>
          <template v-if="column.key === 'log_user'">
            <Tooltip :title="`ID: ${record.user_id}`">
              <span>{{ record.nickname || record.user_id }}</span>
            </Tooltip>
          </template>
        </template>
      </Table>
    </Drawer>
  </div>
</template>
