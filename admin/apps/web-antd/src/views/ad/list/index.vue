<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import { createAd, deleteAd, getAdList, updateAd } from '#/api/admin';

const loading = ref(false);
const dataSource = ref<any[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '名称', dataIndex: 'name', width: 120 },
  { title: '广告位', dataIndex: 'slot', width: 110, key: 'slot' },
  { title: '标题', dataIndex: 'title', width: 120, ellipsis: true },
  { title: '目标', dataIndex: 'target_users', width: 80 },
  { title: '排序', dataIndex: 'sort', width: 70 },
  { title: '状态', dataIndex: 'status', width: 90, key: 'status' },
  { title: '操作', key: 'action', width: 160 },
];

const slotLabels: Record<string, string> = {
  banner: '横幅',
  sidebar: '侧栏',
  popup: '弹窗',
  chat_card: '对话卡片',
  create_bottom: '创作底部',
};

async function fetchData() {
  loading.value = true;
  try {
    const res: any = await getAdList({
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
  name: '',
  slot: 'banner',
  image_url: '',
  title: '',
  description: '',
  link: '',
  link_type: 'external',
  target_users: 'all',
  sort: 0,
  status: 'enabled',
});

function openCreateModal() {
  editingId.value = null;
  Object.assign(form, {
    name: '', slot: 'banner', image_url: '', title: '', description: '',
    link: '', link_type: 'external', target_users: 'all', sort: 0, status: 'enabled',
  });
  modalVisible.value = true;
}

function openEditModal(record: any) {
  editingId.value = record.id;
  Object.assign(form, {
    name: record.name,
    slot: record.slot,
    image_url: record.image_url,
    title: record.title,
    description: record.description,
    link: record.link,
    link_type: record.link_type,
    target_users: record.target_users,
    sort: record.sort,
    status: record.status,
  });
  modalVisible.value = true;
}

async function handleSave() {
  try {
    if (editingId.value) {
      await updateAd(editingId.value, form);
      message.success('更新成功');
    } else {
      await createAd(form);
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
    await deleteAd(id);
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
    <Card title="广告管理">
      <template #extra>
        <Button type="primary" @click="openCreateModal">新建广告</Button>
      </template>

      <Table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :locale="{ emptyText: '暂无广告数据' }"
        :pagination="pagination"
        row-key="id"
        size="middle"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'slot'">
            <Tag>{{ slotLabels[record.slot] ?? record.slot }}</Tag>
          </template>
          <template v-if="column.key === 'status'">
            <Tag :color="record.status === 'enabled' ? 'green' : 'default'">
              {{ record.status === 'enabled' ? '启用' : '禁用' }}
            </Tag>
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
      :title="editingId ? '编辑广告' : '新建广告'"
      width="600px"
      @ok="handleSave"
    >
      <Form layout="vertical" class="py-4">
        <div class="grid grid-cols-2 gap-4">
          <Form.Item label="广告名称">
            <Input v-model:value="form.name" placeholder="内部名称" />
          </Form.Item>
          <Form.Item label="广告位">
            <Select v-model:value="form.slot">
              <Select.Option value="banner">横幅</Select.Option>
              <Select.Option value="sidebar">侧栏</Select.Option>
              <Select.Option value="popup">弹窗</Select.Option>
              <Select.Option value="chat_card">对话卡片</Select.Option>
              <Select.Option value="create_bottom">创作底部</Select.Option>
            </Select>
          </Form.Item>
        </div>
        <Form.Item label="图片URL">
          <Input v-model:value="form.image_url" placeholder="https://..." />
        </Form.Item>
        <div class="grid grid-cols-2 gap-4">
          <Form.Item label="标题">
            <Input v-model:value="form.title" />
          </Form.Item>
          <Form.Item label="跳转链接">
            <Input v-model:value="form.link" placeholder="https://..." />
          </Form.Item>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <Form.Item label="目标用户">
            <Select v-model:value="form.target_users">
              <Select.Option value="all">全部</Select.Option>
              <Select.Option value="free">免费</Select.Option>
              <Select.Option value="vip">VIP</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="排序">
            <InputNumber v-model:value="form.sort" :min="0" class="w-full" />
          </Form.Item>
          <Form.Item label="状态">
            <Switch
              :checked="form.status === 'enabled'"
              checked-children="启用"
              un-checked-children="禁用"
              @change="(checked: any) => form.status = checked ? 'enabled' : 'disabled'"
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  </div>
</template>
