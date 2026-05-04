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
  Textarea,
} from 'ant-design-vue';

import {
  createPackage,
  deletePackage,
  getPackageList,
  updatePackage,
} from '#/api/admin';

const loading = ref(false);
const dataSource = ref<any[]>([]);

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '名称', dataIndex: 'name', width: 120 },
  { title: '类型', dataIndex: 'type', width: 90, key: 'type' },
  { title: '原价', dataIndex: 'original_price', width: 90 },
  { title: '售价', dataIndex: 'price', width: 90 },
  { title: '积分', dataIndex: 'credits', width: 90 },
  { title: '日免费对话', dataIndex: 'daily_free_chat', width: 100 },
  { title: '日免费图片', dataIndex: 'daily_free_image', width: 100 },
  { title: '状态', dataIndex: 'status', width: 90, key: 'status' },
  { title: '排序', dataIndex: 'sort', width: 70 },
  { title: '操作', key: 'action', width: 160 },
];

async function fetchData() {
  loading.value = true;
  try {
    const res: any = await getPackageList();
    dataSource.value = res.data ?? res ?? [];
  } catch {
    // handled
  } finally {
    loading.value = false;
  }
}

const modalVisible = ref(false);
const editingId = ref<null | number>(null);
const form = reactive({
  name: '',
  type: 'monthly',
  original_price: 0,
  price: 0,
  credits: 0,
  daily_free_chat: 0,
  daily_free_image: 0,
  description: '',
  sort: 0,
  status: 'active',
});

function openCreateModal() {
  editingId.value = null;
  Object.assign(form, {
    name: '', type: 'monthly', original_price: 0, price: 0, credits: 0,
    daily_free_chat: 0, daily_free_image: 0, description: '', sort: 0, status: 'active',
  });
  modalVisible.value = true;
}

function openEditModal(record: any) {
  editingId.value = record.id;
  Object.assign(form, {
    name: record.name,
    type: record.type,
    original_price: record.original_price,
    price: record.price,
    credits: record.credits,
    daily_free_chat: record.daily_free_chat,
    daily_free_image: record.daily_free_image,
    description: record.description || '',
    sort: record.sort,
    status: record.status,
  });
  modalVisible.value = true;
}

async function handleSave() {
  try {
    if (editingId.value) {
      await updatePackage(editingId.value, form);
      message.success('更新成功');
    } else {
      await createPackage(form);
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
    await deletePackage(id);
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
    <Card title="套餐管理">
      <template #extra>
        <Button type="primary" @click="openCreateModal">新建套餐</Button>
      </template>

      <Table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :locale="{ emptyText: '暂无套餐数据' }"
        :pagination="false"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <Tag>{{ { monthly: '月付', quarterly: '季付', yearly: '年付' }[record.type as string] ?? record.type }}</Tag>
          </template>
          <template v-if="column.key === 'status'">
            <Tag :color="record.status === 'active' ? 'green' : 'default'">
              {{ record.status === 'active' ? '上架' : '下架' }}
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
      :title="editingId ? '编辑套餐' : '新建套餐'"
      width="600px"
      @ok="handleSave"
    >
      <Form layout="vertical" class="py-4">
        <Form.Item label="套餐名称">
          <Input v-model:value="form.name" placeholder="如 基础版" />
        </Form.Item>
        <Form.Item label="套餐类型">
          <Select v-model:value="form.type">
            <Select.Option value="monthly">月付</Select.Option>
            <Select.Option value="quarterly">季付</Select.Option>
            <Select.Option value="yearly">年付</Select.Option>
          </Select>
        </Form.Item>
        <div class="grid grid-cols-2 gap-4">
          <Form.Item label="原价 (元)">
            <InputNumber v-model:value="form.original_price" :min="0" :step="1" class="w-full" />
          </Form.Item>
          <Form.Item label="售价 (元)">
            <InputNumber v-model:value="form.price" :min="0" :step="1" class="w-full" />
          </Form.Item>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <Form.Item label="赠送积分">
            <InputNumber v-model:value="form.credits" :min="0" class="w-full" />
          </Form.Item>
          <Form.Item label="日免费对话">
            <InputNumber v-model:value="form.daily_free_chat" :min="0" class="w-full" />
          </Form.Item>
          <Form.Item label="日免费图片">
            <InputNumber v-model:value="form.daily_free_image" :min="0" class="w-full" />
          </Form.Item>
        </div>
        <Form.Item label="描述">
          <Textarea v-model:value="form.description" :rows="3" />
        </Form.Item>
        <div class="grid grid-cols-2 gap-4">
          <Form.Item label="排序">
            <InputNumber v-model:value="form.sort" :min="0" class="w-full" />
          </Form.Item>
          <Form.Item label="状态">
            <Switch
              :checked="form.status === 'active'"
              checked-children="上架"
              un-checked-children="下架"
              @change="(checked: any) => form.status = checked ? 'active' : 'inactive'"
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  </div>
</template>
