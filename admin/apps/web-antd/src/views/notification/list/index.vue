<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Textarea,
} from 'ant-design-vue';

import {
  createNotification,
  deleteNotification,
  getNotificationList,
  updateNotification,
} from '#/api/admin';

const loading = ref(false);
const dataSource = ref<any[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });

const statusMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  published: { color: 'green', label: '已发布' },
};

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '标题', dataIndex: 'title', width: 200 },
  { title: '类型', dataIndex: 'type', width: 90, key: 'type' },
  { title: '目标', dataIndex: 'target', width: 80 },
  { title: '状态', dataIndex: 'status', width: 90, key: 'status' },
  { title: '弹窗', dataIndex: 'show_popup', width: 70, key: 'popup' },
  { title: '创建时间', dataIndex: 'created_at', width: 160 },
  { title: '操作', key: 'action', width: 200 },
];

async function fetchData() {
  loading.value = true;
  try {
    const res: any = await getNotificationList({
      page: pagination.current,
      page_size: pagination.pageSize,
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
  fetchData();
}

const modalVisible = ref(false);
const editingId = ref<null | number>(null);
const form = reactive({
  title: '',
  content: '',
  type: 'system',
  target: 'all',
  status: 'draft',
  show_popup: false,
});

function openCreateModal() {
  editingId.value = null;
  Object.assign(form, { title: '', content: '', type: 'system', target: 'all', status: 'draft', show_popup: false });
  modalVisible.value = true;
}

function openEditModal(record: any) {
  editingId.value = record.id;
  Object.assign(form, {
    title: record.title,
    content: record.content,
    type: record.type,
    target: record.target,
    status: record.status,
    show_popup: record.show_popup,
  });
  modalVisible.value = true;
}

async function handleSave() {
  try {
    if (editingId.value) {
      await updateNotification(editingId.value, form);
      message.success('更新成功');
    } else {
      await createNotification(form);
      message.success('创建成功');
    }
    modalVisible.value = false;
    fetchData();
  } catch {
    // handled
  }
}

async function handleDelete(id: number) {
  try {
    await deleteNotification(id);
    message.success('已删除');
    fetchData();
  } catch {
    // handled
  }
}

onMounted(fetchData);
</script>

<template>
  <div class="p-5">
    <Card title="通知管理">
      <template #extra>
        <Button type="primary" @click="openCreateModal">新建通知</Button>
      </template>

      <Table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :locale="{ emptyText: '暂无通知' }"
        :pagination="pagination"
        row-key="id"
        size="middle"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <Tag>{{ { system: '系统', activity: '活动', maintenance: '维护' }[record.type as string] ?? record.type }}</Tag>
          </template>
          <template v-if="column.key === 'status'">
            <Tag :color="statusMap[record.status]?.color">
              {{ statusMap[record.status]?.label ?? record.status }}
            </Tag>
          </template>
          <template v-if="column.key === 'popup'">
            {{ record.show_popup ? '是' : '否' }}
          </template>
          <template v-if="column.key === 'action'">
            <Space>
              <Button size="small" @click="openEditModal(record)">编辑</Button>
              <Popconfirm title="确认删除？" @confirm="handleDelete(record.id)">
                <Button size="small" danger>删除</Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <Modal
      v-model:open="modalVisible"
      :title="editingId ? '编辑通知' : '新建通知'"
      width="600px"
      @ok="handleSave"
    >
      <Form layout="vertical" class="py-4">
        <Form.Item label="标题">
          <Input v-model:value="form.title" placeholder="通知标题" />
        </Form.Item>
        <Form.Item label="内容">
          <Textarea v-model:value="form.content" :rows="4" placeholder="通知内容" />
        </Form.Item>
        <div class="grid grid-cols-2 gap-4">
          <Form.Item label="类型">
            <Select v-model:value="form.type">
              <Select.Option value="system">系统通知</Select.Option>
              <Select.Option value="activity">活动通知</Select.Option>
              <Select.Option value="maintenance">维护通知</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="目标用户">
            <Select v-model:value="form.target">
              <Select.Option value="all">全部用户</Select.Option>
              <Select.Option value="vip">VIP用户</Select.Option>
              <Select.Option value="free">免费用户</Select.Option>
            </Select>
          </Form.Item>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <Form.Item label="状态">
            <Select v-model:value="form.status">
              <Select.Option value="draft">草稿</Select.Option>
              <Select.Option value="published">发布</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="弹窗显示">
            <Switch v-model:checked="form.show_popup" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  </div>
</template>
