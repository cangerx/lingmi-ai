<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import { SyncOutlined } from '@ant-design/icons-vue';

import {
  addModelsFromChannel,
  createChannel,
  deleteChannel,
  fetchModelsFromProvider,
  getChannelList,
  updateChannel,
} from '#/api/admin';

// ─── Table ───
const loading = ref(false);
const dataSource = ref<any[]>([]);

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '渠道名称', dataIndex: 'name', width: 150 },
  { title: '类型', dataIndex: 'type', width: 100, key: 'type' },
  { title: 'Base URL', dataIndex: 'base_url', width: 200, ellipsis: true },
  { title: '模型数', key: 'model_count', width: 80 },
  { title: '状态', dataIndex: 'status', width: 90, key: 'status' },
  { title: '优先级', dataIndex: 'priority', width: 80 },
  { title: '权重', dataIndex: 'weight', width: 70 },
  { title: '操作', key: 'action', width: 240 },
];

async function fetchData() {
  loading.value = true;
  try {
    const res: any = await getChannelList();
    dataSource.value = res.data ?? res ?? [];
  } catch {
    // handled
  } finally {
    loading.value = false;
  }
}

// ─── Channel Form Modal ───
const modalVisible = ref(false);
const editingId = ref<null | number>(null);
const form = reactive({
  name: '',
  type: 'openai',
  base_url: '',
  api_key: '',
  status: 'enabled',
  priority: 0,
  weight: 1,
  rpm_limit: 0,
  tpm_limit: 0,
  timeout: 60,
  remark: '',
  models: [] as string[],
});

function resetForm() {
  Object.assign(form, {
    name: '', type: 'openai', base_url: '', api_key: '',
    status: 'enabled', priority: 0, weight: 1,
    rpm_limit: 0, tpm_limit: 0, timeout: 60, remark: '',
    models: [],
  });
  remoteModels.value = [];
  selectedRemoteModels.value = [];
}

function openCreateModal() {
  editingId.value = null;
  resetForm();
  modalVisible.value = true;
}

function openEditModal(record: any) {
  editingId.value = record.id;
  const models = Array.isArray(record.models) ? record.models : [];
  Object.assign(form, {
    name: record.name,
    type: record.type,
    base_url: record.base_url,
    api_key: record.api_key_masked || '',
    status: record.status,
    priority: record.priority,
    weight: record.weight || 1,
    rpm_limit: record.rpm_limit || 0,
    tpm_limit: record.tpm_limit || 0,
    timeout: record.timeout || 60,
    remark: record.remark || '',
    models,
  });
  remoteModels.value = [];
  selectedRemoteModels.value = [];
  modalVisible.value = true;
}

async function handleSave() {
  if (!form.name || !form.base_url) {
    message.warning('请填写渠道名称和 Base URL');
    return;
  }
  if (!editingId.value && !form.api_key) {
    message.warning('新建渠道需要填写 API Key');
    return;
  }
  try {
    if (editingId.value) {
      await updateChannel(editingId.value, { ...form });
      message.success('更新成功');
    } else {
      await createChannel({ ...form });
      message.success('创建成功');
    }
    modalVisible.value = false;
    fetchData();
  } catch {
    message.error('保存失败');
  }
}

async function handleDelete(id: number) {
  try {
    await deleteChannel(id);
    message.success('已删除');
    fetchData();
  } catch {
    // handled
  }
}

// ─── Fetch Remote Models ───
const fetchingModels = ref(false);
const remoteModels = ref<Array<{ id: string; owned_by: string }>>([]);
const selectedRemoteModels = ref<string[]>([]);

const canFetchModels = computed(() => form.base_url && (form.api_key || editingId.value));

async function handleFetchModels() {
  if (!form.base_url) {
    message.warning('请先填写 Base URL');
    return;
  }
  if (!form.api_key && !editingId.value) {
    message.warning('请先填写 API Key');
    return;
  }
  fetchingModels.value = true;
  remoteModels.value = [];
  selectedRemoteModels.value = [];
  try {
    const payload: any = {
      base_url: form.base_url,
      api_key: form.api_key,
    };
    if (editingId.value) {
      payload.channel_id = editingId.value;
    }
    const res: any = await fetchModelsFromProvider(payload);
    const data = res.data ?? res ?? [];
    remoteModels.value = Array.isArray(data) ? data : (data.data ?? []);
    if (remoteModels.value.length === 0) {
      message.info('未获取到模型');
    } else {
      message.success(`获取到 ${remoteModels.value.length} 个模型`);
    }
  } catch (e: any) {
    message.error(e?.response?.data?.error || e?.message || '获取模型列表失败');
  } finally {
    fetchingModels.value = false;
  }
}

function toggleSelectAll() {
  if (selectedRemoteModels.value.length === remoteModels.value.length) {
    selectedRemoteModels.value = [];
  } else {
    selectedRemoteModels.value = remoteModels.value.map((m) => m.id);
  }
}

function applySelectedModels() {
  if (selectedRemoteModels.value.length === 0) {
    message.warning('请至少选择一个模型');
    return;
  }
  const existing = new Set(form.models);
  for (const id of selectedRemoteModels.value) {
    existing.add(id);
  }
  form.models = [...existing];
  message.success(`已选择 ${selectedRemoteModels.value.length} 个模型`);
}

function removeModel(id: string) {
  form.models = form.models.filter((m) => m !== id);
}

// ─── Batch Add to Model Table ───
const addingModels = ref(false);

async function handleAddToModelTable() {
  if (selectedRemoteModels.value.length === 0) {
    message.warning('请先选择要添加的模型');
    return;
  }
  addingModels.value = true;
  try {
    const models = selectedRemoteModels.value.map((id) => {
      const remote = remoteModels.value.find((m) => m.id === id);
      return {
        id,
        display_name: id,
        type: 'chat',
        provider: remote?.owned_by || form.type || '',
      };
    });
    const res: any = await addModelsFromChannel({ models });
    const data = res.data ?? res ?? {};
    message.success(data.message || `添加完成: 新增 ${data.created ?? 0}, 跳过 ${data.skipped ?? 0}`);
  } catch (e: any) {
    message.error(e?.response?.data?.error || '添加模型失败');
  } finally {
    addingModels.value = false;
  }
}

function getModelCount(record: any) {
  if (Array.isArray(record.models)) return record.models.length;
  return 0;
}

onMounted(fetchData);
</script>

<template>
  <div class="p-5">
    <Card title="渠道管理">
      <template #extra>
        <Button type="primary" @click="openCreateModal">新建渠道</Button>
      </template>

      <Table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :locale="{ emptyText: '暂无渠道数据' }"
        :pagination="false"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <Tag>{{ record.type }}</Tag>
          </template>
          <template v-if="column.key === 'model_count'">
            <Tooltip :title="Array.isArray(record.models) ? record.models.join(', ') : ''">
              <Tag color="blue">{{ getModelCount(record) }}</Tag>
            </Tooltip>
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

    <!-- Channel Form Modal -->
    <Modal
      v-model:open="modalVisible"
      :title="editingId ? '编辑渠道' : '新建渠道'"
      :width="680"
      @ok="handleSave"
    >
      <Form layout="vertical" class="py-4">
        <div class="grid grid-cols-2 gap-4">
          <Form.Item label="渠道名称" required>
            <Input v-model:value="form.name" placeholder="如 OpenAI-1" />
          </Form.Item>
          <Form.Item label="类型">
            <Select v-model:value="form.type">
              <Select.Option value="openai">OpenAI</Select.Option>
              <Select.Option value="azure">Azure</Select.Option>
              <Select.Option value="deepseek">DeepSeek</Select.Option>
              <Select.Option value="anthropic">Anthropic</Select.Option>
              <Select.Option value="google">Google</Select.Option>
              <Select.Option value="custom">自定义</Select.Option>
            </Select>
          </Form.Item>
        </div>
        <Form.Item label="Base URL" required>
          <Input v-model:value="form.base_url" placeholder="https://api.openai.com" />
        </Form.Item>
        <Form.Item :label="editingId ? 'API Key（留空则不修改）' : 'API Key'" :required="!editingId">
          <Input.Password v-model:value="form.api_key" :placeholder="editingId ? '留空不修改，输入新值覆盖' : 'sk-...'" />
        </Form.Item>

        <Divider style="margin: 12px 0">模型配置</Divider>

        <!-- Fetch Models Section -->
        <div class="mb-4">
          <div class="flex items-center gap-2 mb-3">
            <Button
              type="primary"
              ghost
              :loading="fetchingModels"
              :disabled="!canFetchModels"
              @click="handleFetchModels"
            >
              <template v-if="fetchingModels">拉取中...</template><template v-else><SyncOutlined /> 拉取模型列表</template>
            </Button>
            <span class="text-xs text-gray-400">
              填写 Base URL 和 API Key 后点击拉取
            </span>
          </div>

          <!-- Remote Models Selection -->
          <div v-if="remoteModels.length > 0" class="border rounded-lg p-3 bg-gray-50">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium">
                远程模型列表（{{ remoteModels.length }} 个）
              </span>
              <Space>
                <Button size="small" @click="toggleSelectAll">
                  {{ selectedRemoteModels.length === remoteModels.length ? '取消全选' : '全选' }}
                </Button>
                <Button size="small" type="primary" :disabled="selectedRemoteModels.length === 0" @click="applySelectedModels">
                  添加到渠道（{{ selectedRemoteModels.length }}）
                </Button>
                <Button
                  size="small"
                  :loading="addingModels"
                  :disabled="selectedRemoteModels.length === 0"
                  @click="handleAddToModelTable"
                >
                  同步到模型表（{{ selectedRemoteModels.length }}）
                </Button>
              </Space>
            </div>
            <div class="max-h-60 overflow-y-auto space-y-1">
              <div
                v-for="m in remoteModels"
                :key="m.id"
                class="flex items-center gap-2 px-2 py-1 rounded hover:bg-white cursor-pointer"
                @click="
                  selectedRemoteModels.includes(m.id)
                    ? (selectedRemoteModels = selectedRemoteModels.filter((x) => x !== m.id))
                    : selectedRemoteModels.push(m.id)
                "
              >
                <Checkbox :checked="selectedRemoteModels.includes(m.id)" />
                <span class="text-sm font-mono">{{ m.id }}</span>
                <span v-if="m.owned_by" class="text-xs text-gray-400">
                  ({{ m.owned_by }})
                </span>
              </div>
            </div>
          </div>

          <Spin v-if="fetchingModels" class="block text-center py-4" />
        </div>

        <!-- Current Channel Models -->
        <Form.Item label="当前渠道模型">
          <div v-if="form.models.length > 0" class="flex flex-wrap gap-1 mb-2">
            <Tag
              v-for="m in form.models"
              :key="m"
              closable
              color="blue"
              @close="removeModel(m)"
            >
              {{ m }}
            </Tag>
          </div>
          <Alert
            v-else
            type="info"
            message="暂无模型，请通过上方拉取或手动输入添加"
            show-icon
            class="mb-2"
          />
          <Input
            placeholder="手动输入模型ID，按回车添加"
            @pressEnter="(e: any) => {
              const val = e.target.value.trim();
              if (val && !form.models.includes(val)) {
                form.models.push(val);
              }
              e.target.value = '';
            }"
          />
        </Form.Item>

        <Divider style="margin: 12px 0">高级设置</Divider>

        <div class="grid grid-cols-3 gap-4">
          <Form.Item label="优先级">
            <InputNumber v-model:value="form.priority" :min="0" class="w-full" />
          </Form.Item>
          <Form.Item label="权重">
            <InputNumber v-model:value="form.weight" :min="1" class="w-full" />
          </Form.Item>
          <Form.Item label="超时(秒)">
            <InputNumber v-model:value="form.timeout" :min="5" :max="300" class="w-full" />
          </Form.Item>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <Form.Item label="RPM 限制（0=不限）">
            <InputNumber v-model:value="form.rpm_limit" :min="0" class="w-full" />
          </Form.Item>
          <Form.Item label="TPM 限制（0=不限）">
            <InputNumber v-model:value="form.tpm_limit" :min="0" class="w-full" />
          </Form.Item>
        </div>
        <Form.Item label="备注">
          <Input.TextArea v-model:value="form.remark" :rows="2" placeholder="可选备注" />
        </Form.Item>
        <Form.Item label="状态">
          <Switch
            :checked="form.status === 'enabled'"
            checked-children="启用"
            un-checked-children="禁用"
            @change="(checked: any) => form.status = checked ? 'enabled' : 'disabled'"
          />
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>
