<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import {
  Button,
  Card,
  Image,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { getGenerationList } from '#/api/admin';

const loading = ref(false);
const dataSource = ref<any[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const filterType = ref<string | undefined>(undefined);
const filterStatus = ref<string | undefined>(undefined);
const searchUserId = ref('');

const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '等待中' },
  processing: { color: 'blue', label: '处理中' },
  completed: { color: 'green', label: '已完成' },
  failed: { color: 'red', label: '失败' },
};

function formatTime(t: string | null) {
  if (!t) return '-';
  return new Date(t).toLocaleString('zh-CN');
}

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '用户', dataIndex: 'nickname', width: 100, key: 'user' },
  { title: '类型', dataIndex: 'type', width: 70, key: 'type' },
  { title: '模型', dataIndex: 'model', width: 120, ellipsis: true },
  { title: '预览', key: 'preview', width: 70 },
  { title: '提示词', dataIndex: 'prompt', width: 200, ellipsis: true },
  { title: '消耗积分', dataIndex: 'credits_cost', width: 80, key: 'credits' },
  { title: '状态', dataIndex: 'status', width: 80, key: 'status' },
  { title: '创建时间', dataIndex: 'created_at', width: 150, key: 'created_at' },
  { title: '操作', key: 'action', width: 80, fixed: 'right' },
];

async function fetchData() {
  loading.value = true;
  try {
    const res: any = await getGenerationList({
      page: pagination.current,
      page_size: pagination.pageSize,
      type: filterType.value,
      status: filterStatus.value,
      user_id: searchUserId.value || undefined,
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

// Detail modal
const detailModal = reactive({ visible: false, record: null as any });

function showDetail(record: any) {
  detailModal.record = record;
  detailModal.visible = true;
}

onMounted(fetchData);
</script>

<template>
  <div class="p-5">
    <Card title="生成记录">
      <template #extra>
        <Space>
          <Select
            v-model:value="filterType"
            allow-clear
            placeholder="类型"
            style="width: 100px"
            @change="handleSearch"
          >
            <Select.Option value="image">图片</Select.Option>
            <Select.Option value="video">视频</Select.Option>
            <Select.Option value="music">音乐</Select.Option>
          </Select>
          <Select
            v-model:value="filterStatus"
            allow-clear
            placeholder="状态"
            style="width: 100px"
            @change="handleSearch"
          >
            <Select.Option value="pending">等待中</Select.Option>
            <Select.Option value="processing">处理中</Select.Option>
            <Select.Option value="completed">已完成</Select.Option>
            <Select.Option value="failed">失败</Select.Option>
          </Select>
          <Input
            v-model:value="searchUserId"
            allow-clear
            placeholder="用户ID"
            style="width: 120px"
            @press-enter="handleSearch"
          />
          <Button type="primary" @click="handleSearch">搜索</Button>
        </Space>
      </template>

      <Table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :locale="{ emptyText: '暂无生成记录' }"
        :pagination="pagination"
        row-key="id"
        size="middle"
        :scroll="{ x: 1100 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'user'">
            <Tooltip :title="`ID: ${record.user_id}`">
              <span>{{ record.nickname || record.user_id }}</span>
            </Tooltip>
          </template>
          <template v-if="column.key === 'type'">
            <Tag>{{ { image: '图片', video: '视频', music: '音乐' }[record.type as string] ?? record.type }}</Tag>
          </template>
          <template v-if="column.key === 'preview'">
            <Image
              v-if="record.result_url"
              :src="record.result_url"
              :width="40"
              :height="40"
              style="border-radius: 4px; object-fit: cover"
              :preview-group-id="'gen-preview'"
            />
            <span v-else class="text-gray-300">-</span>
          </template>
          <template v-if="column.key === 'credits'">
            <span v-if="record.credits_cost" style="color: #ff4d4f; font-weight: 600">-{{ record.credits_cost?.toFixed(1) }}</span>
            <span v-else class="text-gray-300">0</span>
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
            <Button size="small" @click="showDetail(record)">详情</Button>
          </template>
        </template>
      </Table>
    </Card>

    <Modal
      v-model:open="detailModal.visible"
      title="生成详情"
      :footer="null"
      width="600px"
    >
      <div v-if="detailModal.record" class="space-y-3 py-2">
        <div class="grid grid-cols-2 gap-x-4 gap-y-2">
          <p><strong>ID:</strong> {{ detailModal.record.id }}</p>
          <p><strong>用户:</strong> {{ detailModal.record.nickname || detailModal.record.user_id }}</p>
          <p><strong>类型:</strong> {{ { image: '图片', video: '视频', music: '音乐' }[detailModal.record.type as string] ?? detailModal.record.type }}</p>
          <p><strong>模型:</strong> {{ detailModal.record.model }}</p>
          <p><strong>消耗积分:</strong> <span style="color: #ff4d4f">{{ detailModal.record.credits_cost?.toFixed(1) ?? '0' }}</span></p>
          <p>
            <strong>状态:</strong>
            <Tag :color="statusMap[detailModal.record.status]?.color ?? 'default'" style="margin-left: 4px">
              {{ statusMap[detailModal.record.status]?.label ?? detailModal.record.status }}
            </Tag>
          </p>
        </div>
        <p><strong>提示词:</strong> {{ detailModal.record.prompt }}</p>
        <p v-if="detailModal.record.error_msg"><strong>错误:</strong> <span class="text-red-500">{{ detailModal.record.error_msg }}</span></p>
        <div v-if="detailModal.record.result_url">
          <strong>结果:</strong>
          <Image :src="detailModal.record.result_url" class="mt-2" style="max-width: 100%; border-radius: 8px" />
        </div>
        <p class="text-gray-400 text-xs">创建时间: {{ formatTime(detailModal.record.created_at) }}</p>
      </div>
    </Modal>
  </div>
</template>
