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
  Progress,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import {
  ToolOutlined,
  SearchOutlined,
  SettingOutlined,
  InboxOutlined,
  CheckOutlined,
} from '@ant-design/icons-vue';

import {
  createModel,
  deleteModel,
  getModelConfig,
  getModelList,
  getUnlinkedModels,
  probeModel,
  seedImageModels,
  updateModel,
  updateModelConfig,
} from '#/api/admin';

// ─── Table ───
const loading = ref(false);
const dataSource = ref<any[]>([]);
const searchText = ref('');
const filterType = ref('');

const columns = [
  { title: 'ID', dataIndex: 'id', width: 50 },
  { title: '模型名称', dataIndex: 'name', width: 200, ellipsis: true },
  { title: '显示名称', dataIndex: 'display_name', width: 140 },
  { title: '标记', key: 'badge', width: 80 },
  { title: '描述', dataIndex: 'description', width: 200, ellipsis: true },
  { title: '类型', dataIndex: 'type', width: 80, key: 'type' },
  { title: '渠道', key: 'channels', width: 180 },
  { title: '价格(输入/输出)', key: 'price', width: 140 },
  { title: '状态', dataIndex: 'status', width: 80, key: 'status' },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
];

const typeColors: Record<string, string> = {
  chat: 'blue', image: 'purple', video: 'orange', voice: 'cyan', embedding: 'default',
};

async function fetchData() {
  loading.value = true;
  try {
    const res: any = await getModelList({ search: searchText.value, type: filterType.value });
    dataSource.value = res.data ?? res ?? [];
  } catch {
    // handled
  } finally {
    loading.value = false;
  }
}

// ─── Form Modal ───
const modalVisible = ref(false);
const editingId = ref<null | number>(null);
const form = reactive({
  name: '',
  display_name: '',
  type: 'chat',
  provider: '',
  description: '',
  badge: '',
  tags: '' as string | string[],
  icon: '',
  vip_only: false,
  price_input: 0,
  price_output: 0,
  price_per_call: 0,
  pricing_mode: 'per_token',
  sort: 0,
  status: 'active',
});

// ─── Unlinked Models (from channels but not in Model table) ───
const unlinkedModels = ref<Array<{ name: string; channels: string[] }>>([]);
const loadingUnlinked = ref(false);

async function loadUnlinkedModels() {
  loadingUnlinked.value = true;
  try {
    const res: any = await getUnlinkedModels();
    unlinkedModels.value = res.data ?? res ?? [];
  } catch {
    unlinkedModels.value = [];
  } finally {
    loadingUnlinked.value = false;
  }
}

function selectUnlinkedModel(name: string) {
  form.name = name;
  form.display_name = name;
}

function openCreateModal() {
  editingId.value = null;
  Object.assign(form, {
    name: '', display_name: '', type: 'chat', provider: '',
    description: '', badge: '', tags: '', icon: '', vip_only: false,
    price_input: 0, price_output: 0, price_per_call: 0,
    pricing_mode: 'per_token', sort: 0, status: 'active',
  });
  modalVisible.value = true;
  loadUnlinkedModels();
}

// Batch create selected unlinked models
const selectedUnlinked = ref<string[]>([]);
async function handleBatchCreate() {
  if (selectedUnlinked.value.length === 0) {
    message.warning('请选择要添加的模型');
    return;
  }
  let created = 0;
  for (const name of selectedUnlinked.value) {
    try {
      await createModel({ name, display_name: name, type: 'chat', status: 'active' });
      created++;
    } catch {
      // skip duplicates
    }
  }
  message.success(`已添加 ${created} 个模型`);
  selectedUnlinked.value = [];
  modalVisible.value = false;
  fetchData();
}

function openEditModal(record: any) {
  editingId.value = record.id;
  const tags = Array.isArray(record.tags) ? record.tags.join(', ') : (record.tags || '');
  Object.assign(form, {
    name: record.name,
    display_name: record.display_name,
    type: record.type,
    provider: record.provider || '',
    description: record.description || '',
    badge: record.badge || '',
    tags,
    icon: record.icon || '',
    vip_only: record.vip_only || false,
    price_input: record.price_input || 0,
    price_output: record.price_output || 0,
    price_per_call: record.price_per_call || 0,
    pricing_mode: record.pricing_mode || 'per_token',
    sort: record.sort || 0,
    status: record.status,
  });
  modalVisible.value = true;
}

async function handleSave() {
  if (!form.name) {
    message.warning('请填写模型名称');
    return;
  }
  // Convert tags string to array
  const payload: any = { ...form };
  if (typeof payload.tags === 'string') {
    payload.tags = payload.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  }
  try {
    if (editingId.value) {
      await updateModel(editingId.value, payload);
      message.success('更新成功');
    } else {
      await createModel(payload);
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
    await deleteModel(id);
    message.success('已删除');
    fetchData();
  } catch {
    // handled
  }
}

// ─── Probe / Health Check ───
const probeVisible = ref(false);
const probing = ref(false);
const probeModelName = ref('');
const probeResults = ref<any[]>([]);

async function handleProbe(record: any) {
  probeModelName.value = record.name;
  probeResults.value = [];
  probeVisible.value = true;
  probing.value = true;
  try {
    const res: any = await probeModel(record.name);
    probeResults.value = res.data ?? res ?? [];
    if (probeResults.value.length === 0) {
      message.info('没有渠道支持该模型');
    }
  } catch (e: any) {
    message.error(e?.response?.data?.error || '探测失败');
  } finally {
    probing.value = false;
  }
}

function latencyColor(ms: number) {
  if (ms < 1000) return '#52c41a';
  if (ms < 3000) return '#faad14';
  return '#ff4d4f';
}

function statusTag(status: string) {
  if (status === 'ok') return { color: 'green', text: '正常' };
  if (status === 'timeout') return { color: 'orange', text: '超时' };
  return { color: 'red', text: '异常' };
}

// ─── Config Modal ───
const configVisible = ref(false);
const configModelName = ref('');
const configLoading = ref(false);
const configData = reactive<Record<string, { values: string[]; default_value: string }>>({});

const configKeys = [
  { key: 'resolutions', label: '分辨率', options: ['1K', '2K', '4K'] },
  { key: 'ratios', label: '出图尺寸', options: ['auto', '1:1', '2:3', '3:4', '4:5', '9:16', '3:2', '4:3', '5:4', '16:9', '21:9'] },
  { key: 'qualities', label: '质量', options: ['low', 'medium', 'high', 'standard', 'hd'] },
  { key: 'max_count', label: '最大数量', options: ['1', '2', '3', '4', '8'] },
  { key: 'formats', label: '输出格式', options: ['png', 'jpeg', 'webp'] },
  { key: 'backgrounds', label: '背景', options: ['auto', 'transparent', 'opaque'] },
];

async function openConfigModal(record: any) {
  configModelName.value = record.name;
  configLoading.value = true;
  configVisible.value = true;
  // Reset
  for (const k of configKeys) {
    configData[k.key] = { values: [], default_value: '' };
  }
  try {
    const res: any = await getModelConfig(record.name);
    const items = res.data ?? res ?? [];
    for (const item of items) {
      if (configData[item.param_key]) {
        let vals = item.param_values;
        if (typeof vals === 'string') vals = JSON.parse(vals);
        configData[item.param_key] = { values: vals || [], default_value: item.default_value || '' };
      }
    }
  } catch { /* empty */ }
  configLoading.value = false;
}

function toggleConfigValue(key: string, val: string) {
  const arr = configData[key].values;
  const idx = arr.indexOf(val);
  if (idx >= 0) {
    arr.splice(idx, 1);
    if (configData[key].default_value === val) configData[key].default_value = arr[0] || '';
  } else {
    arr.push(val);
  }
}

async function saveConfig() {
  const payload = Object.entries(configData)
    .filter(([, v]) => v.values.length > 0)
    .map(([key, v]) => ({
      param_key: key,
      param_values: v.values,
      default_value: v.default_value || v.values[0] || '',
    }));
  try {
    await updateModelConfig(configModelName.value, payload);
    message.success('配置已保存');
    configVisible.value = false;
  } catch {
    message.error('保存失败');
  }
}

// ─── Seed Image Models ───
const seeding = ref(false);
async function handleSeedImage() {
  seeding.value = true;
  try {
    const res: any = await seedImageModels();
    message.success(res.message || '预填完成');
    fetchData();
  } catch {
    message.error('预填失败');
  } finally {
    seeding.value = false;
  }
}

onMounted(fetchData);
</script>

<template>
  <div class="p-5">
    <Card title="模型管理">
      <template #extra>
        <Space>
          <Input.Search
            v-model:value="searchText"
            placeholder="搜索模型名称"
            style="width: 200px"
            allow-clear
            @search="fetchData"
          />
          <Select
            v-model:value="filterType"
            placeholder="类型"
            allow-clear
            style="width: 100px"
            @change="fetchData"
          >
            <Select.Option value="">全部</Select.Option>
            <Select.Option value="chat">对话</Select.Option>
            <Select.Option value="image">图片</Select.Option>
            <Select.Option value="video">视频</Select.Option>
            <Select.Option value="voice">语音</Select.Option>
          </Select>
          <Button :loading="seeding" @click="handleSeedImage"><ToolOutlined /> 预填图片模型</Button>
          <Button type="primary" @click="openCreateModal">新建模型</Button>
        </Space>
      </template>

      <Table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :locale="{ emptyText: '暂无模型数据' }"
        :pagination="{ pageSize: 50, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }"
        row-key="id"
        size="middle"
        :scroll="{ x: 1400 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'badge'">
            <Tag v-if="record.badge === 'Hot'" color="red">Hot</Tag>
            <Tag v-else-if="record.badge === 'New'" color="green">New</Tag>
            <Tag v-else-if="record.badge === 'Pro'" color="purple">Pro</Tag>
            <span v-else class="text-gray-300">—</span>
          </template>

          <template v-if="column.key === 'type'">
            <Tag :color="typeColors[record.type] || 'default'">{{ record.type }}</Tag>
          </template>

          <template v-if="column.key === 'channels'">
            <template v-if="record.channel_count > 0">
              <Tooltip :title="(record.channels || []).map((c: any) => c.name).join(', ')">
                <Space :size="2" wrap>
                  <Tag v-for="ch in (record.channels || []).slice(0, 3)" :key="ch.id" color="blue" style="margin: 0">
                    {{ ch.name }}
                  </Tag>
                  <Tag v-if="record.channel_count > 3" color="default" style="margin: 0">
                    +{{ record.channel_count - 3 }}
                  </Tag>
                </Space>
              </Tooltip>
            </template>
            <span v-else class="text-gray-300">无渠道</span>
          </template>

          <template v-if="column.key === 'price'">
            <span class="text-xs font-mono">
              {{ record.price_input?.toFixed(2) || '0' }} / {{ record.price_output?.toFixed(2) || '0' }}
            </span>
          </template>

          <template v-if="column.key === 'status'">
            <Tag :color="record.status === 'active' ? 'green' : 'default'">
              {{ record.status === 'active' ? '启用' : '禁用' }}
            </Tag>
          </template>

          <template v-if="column.key === 'action'">
            <Space>
              <Tooltip title="线路观测">
                <Button size="small" :disabled="record.channel_count === 0" @click="handleProbe(record)">
                  <SearchOutlined /> 探测
                </Button>
              </Tooltip>
              <Button v-if="record.type === 'image'" size="small" @click="openConfigModal(record)"><SettingOutlined /> 配置</Button>
              <Button size="small" @click="openEditModal(record)">编辑</Button>
              <Popconfirm title="确认删除？" @confirm="handleDelete(record.id)">
                <Button size="small" danger>删除</Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- Edit/Create Modal -->
    <Modal
      v-model:open="modalVisible"
      :title="editingId ? '编辑模型' : '新建模型'"
      :width="640"
      @ok="handleSave"
    >
      <Form layout="vertical" class="py-4">
        <!-- Unlinked models from channels (only on create) -->
        <div v-if="!editingId && unlinkedModels.length > 0" class="mb-4">
          <div class="border rounded-lg p-3 bg-blue-50">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium"><InboxOutlined /> 渠道中待添加的模型（{{ unlinkedModels.length }}）</span>
              <Space>
                <Button
                  size="small"
                  @click="selectedUnlinked.length === unlinkedModels.length ? (selectedUnlinked = []) : (selectedUnlinked = unlinkedModels.map(m => m.name))"
                >
                  {{ selectedUnlinked.length === unlinkedModels.length ? '取消全选' : '全选' }}
                </Button>
                <Button size="small" type="primary" :disabled="selectedUnlinked.length === 0" @click="handleBatchCreate">
                  批量添加（{{ selectedUnlinked.length }}）
                </Button>
              </Space>
            </div>
            <div class="max-h-48 overflow-y-auto space-y-1">
              <div
                v-for="m in unlinkedModels"
                :key="m.name"
                class="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-white"
                @click="
                  selectedUnlinked.includes(m.name)
                    ? (selectedUnlinked = selectedUnlinked.filter(x => x !== m.name))
                    : selectedUnlinked.push(m.name)
                "
              >
                <input type="checkbox" :checked="selectedUnlinked.includes(m.name)" class="pointer-events-none" />
                <span class="text-sm font-mono flex-1">{{ m.name }}</span>
                <Tag v-for="ch in m.channels" :key="ch" color="blue" style="margin:0">{{ ch }}</Tag>
                <Button size="small" type="link" @click.stop="selectUnlinkedModel(m.name)">单独配置</Button>
              </div>
            </div>
          </div>
          <div class="text-xs text-gray-400 mt-1">点击「单独配置」可编辑详细信息后添加，或勾选后「批量添加」</div>
        </div>
        <Spin v-if="!editingId && loadingUnlinked" class="block text-center py-2" size="small" />

        <div class="grid grid-cols-2 gap-4">
          <Form.Item label="模型名称（ID）" required>
            <Input v-model:value="form.name" placeholder="gpt-4o" :disabled="!!editingId" />
          </Form.Item>
          <Form.Item label="显示名称">
            <Input v-model:value="form.display_name" placeholder="GPT-4o" />
          </Form.Item>
        </div>
        <Form.Item label="模型描述">
          <Input.TextArea v-model:value="form.description" placeholder="模型能力简介，将展示在前端模型选择器中" :rows="3" show-count :maxlength="500" />
        </Form.Item>
        <div class="grid grid-cols-2 gap-4">
          <Form.Item label="类型">
            <Select v-model:value="form.type">
              <Select.Option value="chat">对话</Select.Option>
              <Select.Option value="image">图片</Select.Option>
              <Select.Option value="video">视频</Select.Option>
              <Select.Option value="voice">语音</Select.Option>
              <Select.Option value="embedding">嵌入</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="供应商">
            <Input v-model:value="form.provider" placeholder="openai" />
          </Form.Item>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <Form.Item label="标记徽章">
            <Select v-model:value="form.badge" allow-clear placeholder="无">
              <Select.Option value="">无</Select.Option>
              <Select.Option value="Hot"><Tag color="red">Hot</Tag> 热门</Select.Option>
              <Select.Option value="New"><Tag color="green">New</Tag> 最新</Select.Option>
              <Select.Option value="Pro"><Tag color="purple">Pro</Tag> 专业</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="标签（逗号分隔）">
            <Input v-model:value="form.tags" placeholder="推荐, 高清, 文字渲染" />
          </Form.Item>
          <Form.Item label="VIP 专属">
            <Switch
              :checked="form.vip_only"
              checked-children="是"
              un-checked-children="否"
              @change="(checked: any) => form.vip_only = !!checked"
            />
          </Form.Item>
        </div>
        <Form.Item label="图标 URL">
          <Input v-model:value="form.icon" placeholder="https://..." />
        </Form.Item>
        <Form.Item label="计费模式">
          <Select v-model:value="form.pricing_mode">
            <Select.Option value="per_token">按 Token</Select.Option>
            <Select.Option value="per_call">按次</Select.Option>
          </Select>
        </Form.Item>
        <div v-if="form.pricing_mode === 'per_token'" class="grid grid-cols-2 gap-4">
          <Form.Item label="输入价格（积分/1K tokens）">
            <InputNumber v-model:value="form.price_input" :min="0" :step="0.01" class="w-full" />
          </Form.Item>
          <Form.Item label="输出价格（积分/1K tokens）">
            <InputNumber v-model:value="form.price_output" :min="0" :step="0.01" class="w-full" />
          </Form.Item>
        </div>
        <div v-else>
          <Form.Item label="每次调用价格（积分）">
            <InputNumber v-model:value="form.price_per_call" :min="0" :step="0.1" class="w-full" />
          </Form.Item>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <Form.Item label="排序（越小越靠前）">
            <InputNumber v-model:value="form.sort" :min="0" class="w-full" />
          </Form.Item>
          <Form.Item label="状态">
            <Switch
              :checked="form.status === 'active'"
              checked-children="启用"
              un-checked-children="禁用"
              @change="(checked: any) => form.status = checked ? 'active' : 'inactive'"
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>

    <!-- Config Modal -->
    <Modal
      v-model:open="configVisible"
      :title="`参数配置 — ${configModelName}`"
      :width="640"
      @ok="saveConfig"
    >
      <Spin v-if="configLoading" class="block text-center py-8" />
      <div v-else class="space-y-4 py-4">
        <div v-for="ck in configKeys" :key="ck.key">
          <div class="text-sm font-medium mb-2">{{ ck.label }}</div>
          <div class="flex flex-wrap gap-2">
            <Tag
              v-for="opt in ck.options"
              :key="opt"
              :color="configData[ck.key]?.values?.includes(opt) ? 'blue' : 'default'"
              class="cursor-pointer select-none"
              @click="toggleConfigValue(ck.key, opt)"
            >
              {{ opt }}
              <CheckOutlined v-if="configData[ck.key]?.default_value === opt" class="ml-1 text-xs" />
            </Tag>
          </div>
          <div v-if="configData[ck.key]?.values?.length" class="mt-1">
            <span class="text-xs text-gray-400 mr-2">默认值:</span>
            <Select
              :value="configData[ck.key]?.default_value"
              size="small"
              style="width: 120px"
              @change="(v: any) => configData[ck.key].default_value = v"
            >
              <Select.Option v-for="v in configData[ck.key]?.values" :key="v" :value="v">{{ v }}</Select.Option>
            </Select>
          </div>
        </div>
      </div>
    </Modal>

    <!-- Probe Result Modal -->
    <Modal
      v-model:open="probeVisible"
      :title="`线路观测 — ${probeModelName}`"
      :footer="null"
      :width="640"
    >
      <Spin v-if="probing" class="block text-center py-8" tip="正在探测各渠道..." />
      <div v-else-if="probeResults.length > 0" class="space-y-3">
        <div
          v-for="(r, idx) in probeResults"
          :key="idx"
          class="border rounded-lg p-4"
          :class="r.status === 'ok' ? 'border-green-200 bg-green-50' : r.status === 'timeout' ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <Tag :color="statusTag(r.status).color">{{ statusTag(r.status).text }}</Tag>
              <span class="font-medium">{{ r.channel_name }}</span>
              <Tag>{{ r.channel_type }}</Tag>
            </div>
            <span class="text-sm font-mono" :style="{ color: latencyColor(r.latency_ms) }">
              {{ r.latency_ms }}ms
            </span>
          </div>
          <Progress
            :percent="Math.min(100, (r.latency_ms / 50))"
            :stroke-color="latencyColor(r.latency_ms)"
            :show-info="false"
            size="small"
          />
          <div v-if="r.status === 'ok' && r.first_token" class="mt-2 text-xs text-gray-500">
            响应: <code class="bg-white px-1 py-0.5 rounded">{{ r.first_token }}</code>
          </div>
          <div v-if="r.error" class="mt-2 text-xs text-red-500 break-all">
            {{ r.error }}
          </div>
        </div>
      </div>
      <div v-else class="text-center py-8 text-gray-400">
        没有渠道支持该模型
      </div>
    </Modal>
  </div>
</template>
