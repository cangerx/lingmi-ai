<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'ant-design-vue';

import {
  createSensitiveWord,
  deleteSensitiveWord,
  getSensitiveWords,
  importSensitiveWords,
  updateSensitiveWord,
} from '#/api/admin';

const loading = ref(false);
const dataSource = ref<any[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const searchKeyword = ref('');
const filterCategory = ref<string | undefined>(undefined);
const filterLevel = ref<string | undefined>(undefined);

const categoryMap: Record<string, { color: string; label: string }> = {
  porn: { color: 'red', label: '色情' },
  politics: { color: 'orange', label: '政治' },
  violence: { color: 'volcano', label: '暴力' },
  ad: { color: 'blue', label: '广告' },
  custom: { color: 'default', label: '自定义' },
};
const levelMap: Record<string, { color: string; label: string }> = {
  block: { color: 'red', label: '直接拦截' },
  review: { color: 'orange', label: '送审' },
};

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '词条', dataIndex: 'word', width: 160 },
  { title: '分类', dataIndex: 'category', width: 80, key: 'category' },
  { title: '级别', dataIndex: 'level', width: 90, key: 'level' },
  { title: '状态', dataIndex: 'status', width: 80, key: 'status' },
  { title: '创建时间', dataIndex: 'created_at', width: 150, key: 'created_at' },
  { title: '操作', key: 'action', width: 160, fixed: 'right' },
];

async function fetchData() {
  loading.value = true;
  try {
    const res: any = await getSensitiveWords({
      page: pagination.current,
      page_size: pagination.pageSize,
      keyword: searchKeyword.value || undefined,
      category: filterCategory.value,
      level: filterLevel.value,
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

function formatTime(t: string | null) {
  if (!t) return '-';
  return new Date(t).toLocaleString('zh-CN');
}

// --- Create / Edit Modal ---
const editModal = reactive({
  visible: false,
  isEdit: false,
  id: 0,
  form: { word: '', category: 'custom', level: 'block' },
  saving: false,
});

function showCreateModal() {
  editModal.isEdit = false;
  editModal.id = 0;
  editModal.form = { word: '', category: 'custom', level: 'block' };
  editModal.visible = true;
}

function showEditModal(record: any) {
  editModal.isEdit = true;
  editModal.id = record.id;
  editModal.form = { word: record.word, category: record.category, level: record.level };
  editModal.visible = true;
}

async function handleSaveWord() {
  if (!editModal.form.word.trim()) {
    message.warning('请输入词条');
    return;
  }
  editModal.saving = true;
  try {
    if (editModal.isEdit) {
      await updateSensitiveWord(editModal.id, editModal.form);
      message.success('更新成功');
    } else {
      await createSensitiveWord(editModal.form);
      message.success('添加成功');
    }
    editModal.visible = false;
    fetchData();
  } catch (e: any) {
    message.error(e?.response?.data?.error || '操作失败');
  } finally {
    editModal.saving = false;
  }
}

async function handleDelete(id: number) {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除该违禁词吗？',
    okType: 'danger',
    async onOk() {
      try {
        await deleteSensitiveWord(id);
        message.success('删除成功');
        fetchData();
      } catch {
        message.error('删除失败');
      }
    },
  });
}

async function handleToggleStatus(record: any) {
  const newStatus = record.status === 'active' ? 'disabled' : 'active';
  try {
    await updateSensitiveWord(record.id, { status: newStatus });
    message.success(newStatus === 'active' ? '已启用' : '已禁用');
    fetchData();
  } catch {
    message.error('操作失败');
  }
}

// --- Import Modal ---
const importModal = reactive({ visible: false, text: '', category: 'custom', level: 'block', saving: false });

function showImportModal() {
  importModal.text = '';
  importModal.category = 'custom';
  importModal.level = 'block';
  importModal.visible = true;
}

async function handleImport() {
  if (!importModal.text.trim()) {
    message.warning('请输入要导入的词条');
    return;
  }
  importModal.saving = true;
  try {
    const res: any = await importSensitiveWords({
      text: importModal.text,
      category: importModal.category,
      level: importModal.level,
    });
    message.success(`导入完成：新增 ${res.added} 条，跳过 ${res.skipped} 条`);
    importModal.visible = false;
    fetchData();
  } catch {
    message.error('导入失败');
  } finally {
    importModal.saving = false;
  }
}

onMounted(fetchData);
</script>

<template>
  <div class="p-5">
    <Card title="违禁词管理">
      <template #extra>
        <Space>
          <Input
            v-model:value="searchKeyword"
            allow-clear
            placeholder="搜索词条"
            style="width: 140px"
            @press-enter="handleSearch"
          />
          <Select
            v-model:value="filterCategory"
            allow-clear
            placeholder="分类"
            style="width: 100px"
            @change="handleSearch"
          >
            <Select.Option value="porn">色情</Select.Option>
            <Select.Option value="politics">政治</Select.Option>
            <Select.Option value="violence">暴力</Select.Option>
            <Select.Option value="ad">广告</Select.Option>
            <Select.Option value="custom">自定义</Select.Option>
          </Select>
          <Select
            v-model:value="filterLevel"
            allow-clear
            placeholder="级别"
            style="width: 100px"
            @change="handleSearch"
          >
            <Select.Option value="block">直接拦截</Select.Option>
            <Select.Option value="review">送审</Select.Option>
          </Select>
          <Button @click="handleSearch">搜索</Button>
          <Button type="primary" @click="showCreateModal">添加</Button>
          <Button @click="showImportModal">批量导入</Button>
        </Space>
      </template>

      <Table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :locale="{ emptyText: '暂无违禁词数据' }"
        :pagination="pagination"
        row-key="id"
        size="middle"
        :scroll="{ x: 800 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'category'">
            <Tag :color="categoryMap[record.category]?.color ?? 'default'">
              {{ categoryMap[record.category]?.label ?? record.category }}
            </Tag>
          </template>
          <template v-if="column.key === 'level'">
            <Tag :color="levelMap[record.level]?.color ?? 'default'">
              {{ levelMap[record.level]?.label ?? record.level }}
            </Tag>
          </template>
          <template v-if="column.key === 'status'">
            <Tag :color="record.status === 'active' ? 'green' : 'default'">
              {{ record.status === 'active' ? '启用' : '禁用' }}
            </Tag>
          </template>
          <template v-if="column.key === 'created_at'">
            {{ formatTime(record.created_at) }}
          </template>
          <template v-if="column.key === 'action'">
            <Space>
              <Button size="small" @click="showEditModal(record)">编辑</Button>
              <Button size="small" @click="handleToggleStatus(record)">
                {{ record.status === 'active' ? '禁用' : '启用' }}
              </Button>
              <Button size="small" danger @click="handleDelete(record.id)">删除</Button>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- Create / Edit Modal -->
    <Modal
      v-model:open="editModal.visible"
      :title="editModal.isEdit ? '编辑违禁词' : '添加违禁词'"
      :confirm-loading="editModal.saving"
      @ok="handleSaveWord"
    >
      <Form layout="vertical" class="mt-4">
        <Form.Item label="词条" required>
          <Input v-model:value="editModal.form.word" placeholder="输入违禁词" />
        </Form.Item>
        <Form.Item label="分类">
          <Select v-model:value="editModal.form.category" style="width: 100%">
            <Select.Option value="porn">色情</Select.Option>
            <Select.Option value="politics">政治</Select.Option>
            <Select.Option value="violence">暴力</Select.Option>
            <Select.Option value="ad">广告</Select.Option>
            <Select.Option value="custom">自定义</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="级别">
          <Select v-model:value="editModal.form.level" style="width: 100%">
            <Select.Option value="block">直接拦截</Select.Option>
            <Select.Option value="review">送审（触发 AI 二次审核）</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>

    <!-- Import Modal -->
    <Modal
      v-model:open="importModal.visible"
      title="批量导入违禁词"
      :confirm-loading="importModal.saving"
      @ok="handleImport"
    >
      <Form layout="vertical" class="mt-4">
        <Form.Item label="词条列表（每行一个）" required>
          <Input.TextArea
            v-model:value="importModal.text"
            :rows="8"
            placeholder="每行一个违禁词&#10;例如：&#10;违禁词1&#10;违禁词2&#10;违禁词3"
          />
        </Form.Item>
        <Form.Item label="分类">
          <Select v-model:value="importModal.category" style="width: 100%">
            <Select.Option value="porn">色情</Select.Option>
            <Select.Option value="politics">政治</Select.Option>
            <Select.Option value="violence">暴力</Select.Option>
            <Select.Option value="ad">广告</Select.Option>
            <Select.Option value="custom">自定义</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="级别">
          <Select v-model:value="importModal.level" style="width: 100%">
            <Select.Option value="block">直接拦截</Select.Option>
            <Select.Option value="review">送审</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>
