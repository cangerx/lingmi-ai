<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import {
  Button,
  Card,
  Image,
  Modal,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  message,
} from 'ant-design-vue';

import { getModerationLogs, getModerationStats, reviewModeration } from '#/api/admin';

const loading = ref(false);
const dataSource = ref<any[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const filterRiskLevel = ref<string | undefined>(undefined);
const filterStatus = ref<string | undefined>(undefined);
const filterContentType = ref<string | undefined>(undefined);
const filterSource = ref<string | undefined>(undefined);

const stats = ref<any>({});

const riskMap: Record<string, { color: string; label: string }> = {
  safe: { color: 'green', label: '安全' },
  suspect: { color: 'orange', label: '可疑' },
  block: { color: 'red', label: '违规' },
};
const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待审核' },
  approved: { color: 'green', label: '已通过' },
  rejected: { color: 'red', label: '已拒绝' },
};
const sourceMap: Record<string, string> = {
  chat: '聊天',
  prompt: '提示词',
  image_gen: '图片生成',
  profile: '个人资料',
};

function formatTime(t: string | null) {
  if (!t) return '-';
  return new Date(t).toLocaleString('zh-CN');
}

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '用户ID', dataIndex: 'user_id', width: 70 },
  { title: '类型', dataIndex: 'content_type', width: 70, key: 'content_type' },
  { title: '来源', dataIndex: 'source', width: 80, key: 'source' },
  { title: '内容', dataIndex: 'original_text', width: 200, ellipsis: true, key: 'content' },
  { title: '命中词', dataIndex: 'hit_words', width: 120, key: 'hit_words' },
  { title: '风险等级', dataIndex: 'risk_level', width: 80, key: 'risk_level' },
  { title: '状态', dataIndex: 'status', width: 80, key: 'status' },
  { title: '时间', dataIndex: 'created_at', width: 150, key: 'created_at' },
  { title: '操作', key: 'action', width: 140, fixed: 'right' },
];

async function fetchStats() {
  try {
    const res: any = await getModerationStats();
    stats.value = res;
  } catch {
    // handled
  }
}

async function fetchData() {
  loading.value = true;
  try {
    const res: any = await getModerationLogs({
      page: pagination.current,
      page_size: pagination.pageSize,
      risk_level: filterRiskLevel.value,
      status: filterStatus.value,
      content_type: filterContentType.value,
      source: filterSource.value,
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

async function handleReview(id: number, action: 'approve' | 'reject') {
  try {
    await reviewModeration(id, action);
    message.success(action === 'approve' ? '已通过' : '已拒绝');
    fetchData();
    fetchStats();
  } catch {
    message.error('操作失败');
  }
}

// Detail modal
const detailModal = reactive({ visible: false, record: null as any });
function showDetail(record: any) {
  detailModal.record = record;
  detailModal.visible = true;
}

function parseHitWords(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

onMounted(() => {
  fetchData();
  fetchStats();
});
</script>

<template>
  <div class="p-5">
    <!-- Stats cards -->
    <div class="mb-4 grid grid-cols-4 gap-4">
      <Card>
        <Statistic title="今日拦截" :value="stats.today_blocked ?? 0" value-style="color: #cf1322" />
      </Card>
      <Card>
        <Statistic title="待审核" :value="stats.pending ?? 0" value-style="color: #fa8c16" />
      </Card>
      <Card>
        <Statistic title="已通过" :value="stats.total_approved ?? 0" value-style="color: #3f8600" />
      </Card>
      <Card>
        <Statistic title="已拒绝" :value="stats.total_rejected ?? 0" value-style="color: #cf1322" />
      </Card>
    </div>

    <Card title="审核记录">
      <template #extra>
        <Space>
          <Select
            v-model:value="filterContentType"
            allow-clear
            placeholder="内容类型"
            style="width: 100px"
            @change="handleSearch"
          >
            <Select.Option value="text">文本</Select.Option>
            <Select.Option value="image">图片</Select.Option>
          </Select>
          <Select
            v-model:value="filterSource"
            allow-clear
            placeholder="来源"
            style="width: 100px"
            @change="handleSearch"
          >
            <Select.Option value="chat">聊天</Select.Option>
            <Select.Option value="prompt">提示词</Select.Option>
            <Select.Option value="image_gen">图片生成</Select.Option>
            <Select.Option value="profile">个人资料</Select.Option>
          </Select>
          <Select
            v-model:value="filterRiskLevel"
            allow-clear
            placeholder="风险等级"
            style="width: 100px"
            @change="handleSearch"
          >
            <Select.Option value="safe">安全</Select.Option>
            <Select.Option value="suspect">可疑</Select.Option>
            <Select.Option value="block">违规</Select.Option>
          </Select>
          <Select
            v-model:value="filterStatus"
            allow-clear
            placeholder="审核状态"
            style="width: 100px"
            @change="handleSearch"
          >
            <Select.Option value="pending">待审核</Select.Option>
            <Select.Option value="approved">已通过</Select.Option>
            <Select.Option value="rejected">已拒绝</Select.Option>
          </Select>
          <Button type="primary" @click="handleSearch">搜索</Button>
        </Space>
      </template>

      <Table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :locale="{ emptyText: '暂无审核记录' }"
        :pagination="pagination"
        row-key="id"
        size="middle"
        :scroll="{ x: 1100 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'content_type'">
            <Tag>{{ record.content_type === 'text' ? '文本' : '图片' }}</Tag>
          </template>
          <template v-if="column.key === 'source'">
            {{ sourceMap[record.source] ?? record.source }}
          </template>
          <template v-if="column.key === 'content'">
            <Tooltip :title="record.original_text || record.image_url">
              <span v-if="record.original_text">{{ record.original_text }}</span>
              <Image
                v-else-if="record.image_url"
                :src="record.image_url"
                :width="40"
                :height="40"
                style="border-radius: 4px; object-fit: cover"
              />
              <span v-else class="text-gray-300">-</span>
            </Tooltip>
          </template>
          <template v-if="column.key === 'hit_words'">
            <Tag v-for="w in parseHitWords(record.hit_words)" :key="w" color="red" class="mb-1">{{ w }}</Tag>
            <span v-if="parseHitWords(record.hit_words).length === 0" class="text-gray-300">-</span>
          </template>
          <template v-if="column.key === 'risk_level'">
            <Tag :color="riskMap[record.risk_level]?.color ?? 'default'">
              {{ riskMap[record.risk_level]?.label ?? record.risk_level }}
            </Tag>
          </template>
          <template v-if="column.key === 'status'">
            <Tag :color="statusMap[record.status]?.color ?? 'default'">
              {{ statusMap[record.status]?.label ?? record.status }}
            </Tag>
          </template>
          <template v-if="column.key === 'created_at'">
            {{ formatTime(record.created_at) }}
          </template>
          <template v-if="column.key === 'action'">
            <Space>
              <Button
                v-if="record.status === 'pending'"
                size="small"
                type="primary"
                @click="handleReview(record.id, 'approve')"
              >通过</Button>
              <Button
                v-if="record.status === 'pending'"
                size="small"
                danger
                @click="handleReview(record.id, 'reject')"
              >拒绝</Button>
              <Button size="small" @click="showDetail(record)">详情</Button>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <Modal
      v-model:open="detailModal.visible"
      title="审核详情"
      :footer="null"
      width="640px"
    >
      <div v-if="detailModal.record" class="space-y-3 py-2">
        <div class="grid grid-cols-2 gap-x-4 gap-y-2">
          <p><strong>ID:</strong> {{ detailModal.record.id }}</p>
          <p><strong>用户ID:</strong> {{ detailModal.record.user_id }}</p>
          <p><strong>类型:</strong> {{ detailModal.record.content_type === 'text' ? '文本' : '图片' }}</p>
          <p><strong>来源:</strong> {{ sourceMap[detailModal.record.source] ?? detailModal.record.source }}</p>
          <p>
            <strong>风险等级:</strong>
            <Tag :color="riskMap[detailModal.record.risk_level]?.color" style="margin-left: 4px">
              {{ riskMap[detailModal.record.risk_level]?.label ?? detailModal.record.risk_level }}
            </Tag>
          </p>
          <p>
            <strong>状态:</strong>
            <Tag :color="statusMap[detailModal.record.status]?.color" style="margin-left: 4px">
              {{ statusMap[detailModal.record.status]?.label ?? detailModal.record.status }}
            </Tag>
          </p>
        </div>
        <div v-if="detailModal.record.original_text">
          <strong>原始文本:</strong>
          <p class="mt-1 rounded bg-gray-50 p-2 text-sm">{{ detailModal.record.original_text }}</p>
        </div>
        <div v-if="detailModal.record.image_url">
          <strong>图片:</strong>
          <Image :src="detailModal.record.image_url" class="mt-2" style="max-width: 100%; border-radius: 8px" />
        </div>
        <div v-if="parseHitWords(detailModal.record.hit_words).length > 0">
          <strong>命中词:</strong>
          <Tag v-for="w in parseHitWords(detailModal.record.hit_words)" :key="w" color="red" class="ml-1">{{ w }}</Tag>
        </div>
        <div v-if="detailModal.record.ai_result">
          <strong>AI 审核结果:</strong>
          <p class="mt-1 rounded bg-gray-50 p-2 text-sm">{{ detailModal.record.ai_result }}</p>
        </div>
        <p class="text-xs text-gray-400">创建时间: {{ formatTime(detailModal.record.created_at) }}</p>
      </div>
    </Modal>
  </div>
</template>
