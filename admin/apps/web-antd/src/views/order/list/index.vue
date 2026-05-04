<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import {
  Button,
  Card,
  Input,
  message,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { getOrderList, refundOrder } from '#/api/admin';

const loading = ref(false);
const dataSource = ref<any[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const searchKeyword = ref('');
const filterStatus = ref<string | undefined>(undefined);

const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待支付' },
  paid: { color: 'green', label: '已支付' },
  refunded: { color: 'red', label: '已退款' },
  expired: { color: 'default', label: '已过期' },
};

const payMethodMap: Record<string, string> = {
  wechat: '微信支付',
  alipay: '支付宝',
};

function formatTime(t: string | null) {
  if (!t) return '-';
  return new Date(t).toLocaleString('zh-CN');
}

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '订单号', dataIndex: 'order_no', width: 180, ellipsis: true },
  { title: '用户', dataIndex: 'nickname', width: 110, key: 'user' },
  { title: '类型', dataIndex: 'type', width: 80, key: 'type' },
  { title: '金额', dataIndex: 'amount', width: 100, key: 'amount' },
  { title: '实付', dataIndex: 'paid_amount', width: 100, key: 'paid_amount' },
  { title: '积分', dataIndex: 'credits', width: 80 },
  { title: '支付方式', dataIndex: 'payment_method', width: 90, key: 'pay_method' },
  { title: '状态', dataIndex: 'status', width: 90, key: 'status' },
  { title: '支付时间', dataIndex: 'paid_at', width: 160, key: 'paid_at' },
  { title: '创建时间', dataIndex: 'created_at', width: 160, key: 'created_at' },
  { title: '操作', key: 'action', width: 100, fixed: 'right' },
];

async function fetchData() {
  loading.value = true;
  try {
    const res: any = await getOrderList({
      page: pagination.current,
      page_size: pagination.pageSize,
      status: filterStatus.value,
      keyword: searchKeyword.value || undefined,
    });
    dataSource.value = res.data ?? [];
    pagination.total = res.total ?? 0;
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

async function handleRefund(id: number) {
  try {
    await refundOrder(id);
    message.success('退款成功');
    fetchData();
  } catch {
    // handled
  }
}

onMounted(fetchData);
</script>

<template>
  <div class="p-5">
    <Card title="订单管理">
      <template #extra>
        <Space>
          <Select
            v-model:value="filterStatus"
            allow-clear
            placeholder="订单状态"
            style="width: 120px"
            @change="handleSearch"
          >
            <Select.Option value="pending">待支付</Select.Option>
            <Select.Option value="paid">已支付</Select.Option>
            <Select.Option value="refunded">已退款</Select.Option>
            <Select.Option value="expired">已过期</Select.Option>
          </Select>
          <Input
            v-model:value="searchKeyword"
            allow-clear
            placeholder="搜索订单号/用户ID"
            style="width: 200px"
            @press-enter="handleSearch"
          />
          <Button type="primary" @click="handleSearch">搜索</Button>
        </Space>
      </template>

      <Table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :locale="{ emptyText: '暂无订单数据' }"
        :pagination="pagination"
        row-key="id"
        size="middle"
        :scroll="{ x: 1300 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'user'">
            <Tooltip :title="`ID: ${record.user_id}`">
              <span>{{ record.nickname || record.user_id }}</span>
            </Tooltip>
          </template>
          <template v-if="column.key === 'type'">
            <Tag>{{ record.type === 'recharge' ? '充值' : '订阅' }}</Tag>
          </template>
          <template v-if="column.key === 'amount'">
            <span style="font-weight: 600">¥{{ record.amount?.toFixed(2) }}</span>
          </template>
          <template v-if="column.key === 'paid_amount'">
            <span v-if="record.paid_amount" style="color: #52c41a; font-weight: 600">¥{{ record.paid_amount?.toFixed(2) }}</span>
            <span v-else class="text-gray-300">-</span>
          </template>
          <template v-if="column.key === 'pay_method'">
            <Tag v-if="record.payment_method" :color="record.payment_method === 'wechat' ? 'green' : 'blue'">
              {{ payMethodMap[record.payment_method] || record.payment_method }}
            </Tag>
            <span v-else class="text-gray-300">-</span>
          </template>
          <template v-if="column.key === 'status'">
            <Tag :color="statusMap[record.status]?.color ?? 'default'">
              {{ statusMap[record.status]?.label ?? record.status }}
            </Tag>
          </template>
          <template v-if="column.key === 'paid_at'">
            {{ formatTime(record.paid_at) }}
          </template>
          <template v-if="column.key === 'created_at'">
            {{ formatTime(record.created_at) }}
          </template>
          <template v-if="column.key === 'action'">
            <Popconfirm
              v-if="record.status === 'paid'"
              title="确认退款？退款将扣减对应积分"
              @confirm="handleRefund(record.id)"
            >
              <Button size="small" danger>退款</Button>
            </Popconfirm>
            <span v-else class="text-gray-400">-</span>
          </template>
        </template>
      </Table>
    </Card>
  </div>
</template>
