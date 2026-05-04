<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import {
  Badge,
  Button,
  Card,
  Dropdown,
  Form,
  Image,
  Input,
  InputNumber,
  Menu,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Upload,
} from 'ant-design-vue';

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  EyeOutlined,
  HeartOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StarFilled,
  StarOutlined,
  StopOutlined,
} from '@ant-design/icons-vue';

import {
  createInspiration,
  deleteInspiration,
  getInspirationList,
  toggleInspirationFeatured,
  updateInspiration,
  updateInspirationStatus,
} from '#/api/admin';

const loading = ref(false);
const dataSource = ref<any[]>([]);
const pagination = reactive({ current: 1, pageSize: 15, total: 0 });
const filterStatus = ref('');
const filterTag = ref('');
const searchText = ref('');
const selectedRowKeys = ref<number[]>([]);

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: '待审核', color: 'orange', icon: ClockCircleOutlined },
  approved: { label: '已通过', color: 'green', icon: CheckCircleOutlined },
  rejected: { label: '已拒绝', color: 'red', icon: CloseCircleOutlined },
  disabled: { label: '已禁用', color: 'default', icon: StopOutlined },
};

const tagOptions = ['电商', '美食', '人像', '建筑', '自然', '科技', '抽象', '插画', '3D', '海报', '摄影'];

const stats = computed(() => {
  const all = dataSource.value;
  return {
    total: pagination.total,
    pending: all.filter((r: any) => r.status === 'pending').length,
    approved: all.filter((r: any) => r.status === 'approved').length,
    featured: all.filter((r: any) => r.featured).length,
  };
});

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60, sorter: (a: any, b: any) => a.id - b.id },
  { title: '图片', dataIndex: 'image_url', width: 72, key: 'image' },
  { title: '标题', dataIndex: 'title', width: 160, key: 'title', ellipsis: true },
  { title: '标签', dataIndex: 'tag', width: 80, key: 'tag' },
  { title: '作者', dataIndex: 'author', width: 100, ellipsis: true },
  { title: '数据', key: 'metrics', width: 100 },
  { title: '推荐', dataIndex: 'featured', width: 64, key: 'featured', align: 'center' as const },
  { title: '排序', dataIndex: 'sort', width: 64, sorter: (a: any, b: any) => a.sort - b.sort },
  { title: '状态', dataIndex: 'status', width: 90, key: 'status', filters: [
    { text: '待审核', value: 'pending' },
    { text: '已通过', value: 'approved' },
    { text: '已拒绝', value: 'rejected' },
    { text: '已禁用', value: 'disabled' },
  ] },
  { title: '创建时间', dataIndex: 'created_at', width: 150, key: 'created_at', sorter: (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() },
  { title: '操作', key: 'action', width: 180, fixed: 'right' as const },
];

function formatDate(d: string) {
  if (!d) return '-';
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

async function fetchData() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: pagination.current,
      page_size: pagination.pageSize,
    };
    if (filterStatus.value) params.status = filterStatus.value;
    if (filterTag.value) params.tag = filterTag.value;
    if (searchText.value) params.search = searchText.value;

    const res: any = await getInspirationList(params);
    dataSource.value = res.data ?? [];
    pagination.total = res.total ?? 0;
  } catch {
    // handled
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag: any, _filters: any) {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  fetchData();
}

function handleSearch() {
  pagination.current = 1;
  fetchData();
}

function handleReset() {
  searchText.value = '';
  filterStatus.value = '';
  filterTag.value = '';
  pagination.current = 1;
  fetchData();
}

// Modal
const modalVisible = ref(false);
const editingId = ref<null | number>(null);
const saving = ref(false);
const form = reactive({
  title: '',
  description: '',
  image_url: '',
  tag: '电商',
  author: '官方',
  author_avatar: '',
  prompt: '',
  model_used: '',
  width: 0,
  height: 0,
  sort: 0,
  status: 'approved',
  featured: false,
});

function openCreateModal() {
  editingId.value = null;
  Object.assign(form, {
    title: '', description: '', image_url: '', tag: '电商',
    author: '官方', author_avatar: '', prompt: '', model_used: '',
    width: 0, height: 0, sort: 0, status: 'approved', featured: false,
  });
  modalVisible.value = true;
}

function openEditModal(record: any) {
  editingId.value = record.id;
  Object.assign(form, {
    title: record.title,
    description: record.description,
    image_url: record.image_url,
    tag: record.tag,
    author: record.author,
    author_avatar: record.author_avatar,
    prompt: record.prompt,
    model_used: record.model_used,
    width: record.width,
    height: record.height,
    sort: record.sort,
    status: record.status,
    featured: record.featured,
  });
  modalVisible.value = true;
}

async function handleSave() {
  if (!form.title.trim()) {
    message.warning('请输入标题');
    return;
  }
  saving.value = true;
  try {
    if (editingId.value) {
      await updateInspiration(editingId.value, form);
      message.success('更新成功');
    } else {
      await createInspiration(form);
      message.success('创建成功');
    }
    modalVisible.value = false;
    fetchData();
  } catch {
    message.error('操作失败');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(id: number) {
  try {
    await deleteInspiration(id);
    message.success('已删除');
    fetchData();
  } catch {
    // handled
  }
}

async function handleStatusChange(id: number, status: string) {
  try {
    await updateInspirationStatus(id, status);
    message.success('状态已更新');
    fetchData();
  } catch {
    // handled
  }
}

async function handleToggleFeatured(id: number) {
  try {
    await toggleInspirationFeatured(id);
    message.success('已更新');
    fetchData();
  } catch {
    // handled
  }
}

async function handleBatchApprove() {
  for (const id of selectedRowKeys.value) {
    await updateInspirationStatus(id, 'approved').catch(() => {});
  }
  message.success(`已批量通过 ${selectedRowKeys.value.length} 条`);
  selectedRowKeys.value = [];
  fetchData();
}

async function handleBatchDelete() {
  for (const id of selectedRowKeys.value) {
    await deleteInspiration(id).catch(() => {});
  }
  message.success(`已批量删除 ${selectedRowKeys.value.length} 条`);
  selectedRowKeys.value = [];
  fetchData();
}

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: number[]) => { selectedRowKeys.value = keys; },
}));

onMounted(fetchData);
</script>

<template>
  <div class="p-5 space-y-4">
    <!-- Stats -->
    <div class="grid grid-cols-4 gap-4">
      <Card size="small" class="!border-blue-100">
        <Statistic title="总作品数" :value="stats.total" class="!mb-0">
          <template #prefix><PictureOutlined style="color: #1677ff" /></template>
        </Statistic>
      </Card>
      <Card size="small" class="!border-orange-100">
        <Statistic title="待审核" :value="stats.pending" class="!mb-0" value-style="color: #fa8c16">
          <template #prefix><ClockCircleOutlined style="color: #fa8c16" /></template>
        </Statistic>
      </Card>
      <Card size="small" class="!border-green-100">
        <Statistic title="已上线" :value="stats.approved" class="!mb-0" value-style="color: #52c41a">
          <template #prefix><CheckCircleOutlined style="color: #52c41a" /></template>
        </Statistic>
      </Card>
      <Card size="small" class="!border-yellow-100">
        <Statistic title="推荐作品" :value="stats.featured" class="!mb-0" value-style="color: #faad14">
          <template #prefix><StarFilled style="color: #faad14" /></template>
        </Statistic>
      </Card>
    </div>

    <!-- Main card -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <PictureOutlined />
          <span>灵感库管理</span>
          <Badge :count="stats.pending" :offset="[6, -2]" :number-style="{ fontSize: '11px' }" />
        </div>
      </template>
      <template #extra>
        <Space>
          <Input
            v-model:value="searchText"
            placeholder="搜索标题/作者"
            allow-clear
            style="width: 180px"
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </Input>
          <Select
            v-model:value="filterStatus"
            placeholder="状态筛选"
            allow-clear
            style="width: 120px"
            @change="handleSearch"
          >
            <Select.Option value="">全部状态</Select.Option>
            <Select.Option value="pending">
              <Badge status="warning" text="待审核" />
            </Select.Option>
            <Select.Option value="approved">
              <Badge status="success" text="已通过" />
            </Select.Option>
            <Select.Option value="rejected">
              <Badge status="error" text="已拒绝" />
            </Select.Option>
            <Select.Option value="disabled">
              <Badge status="default" text="已禁用" />
            </Select.Option>
          </Select>
          <Select
            v-model:value="filterTag"
            placeholder="标签筛选"
            allow-clear
            style="width: 110px"
            @change="handleSearch"
          >
            <Select.Option value="">全部标签</Select.Option>
            <Select.Option v-for="t in tagOptions" :key="t" :value="t">
              {{ t }}
            </Select.Option>
          </Select>
          <Button @click="handleReset"><ReloadOutlined /> 重置</Button>
          <Button type="primary" @click="openCreateModal"><PlusOutlined /> 新增作品</Button>
        </Space>
      </template>

      <!-- Batch action bar -->
      <div v-if="selectedRowKeys.length > 0" class="mb-3 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
        <span class="text-sm text-blue-600">已选择 {{ selectedRowKeys.length }} 项</span>
        <Button size="small" type="primary" @click="handleBatchApprove">批量通过</Button>
        <Popconfirm title="确认批量删除？" @confirm="handleBatchDelete">
          <Button size="small" danger>批量删除</Button>
        </Popconfirm>
        <Button size="small" @click="selectedRowKeys = []">取消选择</Button>
      </div>

      <Table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :locale="{ emptyText: '暂无灵感数据' }"
        :pagination="{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (t: number) => `共 ${t} 条`,
          pageSizeOptions: ['10', '15', '20', '50'],
        }"
        :row-selection="rowSelection"
        :scroll="{ x: 1300 }"
        row-key="id"
        size="middle"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'image'">
            <Image
              v-if="record.image_url"
              :src="record.image_url"
              :width="48"
              :height="48"
              style="object-fit: cover; border-radius: 8px"
              :preview="{ src: record.image_url }"
            />
            <div
              v-else
              class="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center"
            >
              <PictureOutlined style="color: #d9d9d9; font-size: 18px" />
            </div>
          </template>
          <template v-if="column.key === 'title'">
            <div>
              <div class="font-medium text-gray-800 truncate">{{ record.title }}</div>
              <div v-if="record.description" class="text-xs text-gray-400 truncate mt-0.5">{{ record.description }}</div>
            </div>
          </template>
          <template v-if="column.key === 'tag'">
            <Tag v-if="record.tag" color="blue">{{ record.tag }}</Tag>
            <span v-else class="text-gray-300 text-xs">-</span>
          </template>
          <template v-if="column.key === 'metrics'">
            <div class="flex items-center gap-3 text-xs text-gray-400">
              <Tooltip title="浏览量">
                <span class="flex items-center gap-1"><EyeOutlined /> {{ record.views || 0 }}</span>
              </Tooltip>
              <Tooltip title="点赞数">
                <span class="flex items-center gap-1"><HeartOutlined /> {{ record.likes || 0 }}</span>
              </Tooltip>
            </div>
          </template>
          <template v-if="column.key === 'featured'">
            <Tooltip :title="record.featured ? '取消推荐' : '设为推荐'">
              <Button
                type="text"
                size="small"
                @click="handleToggleFeatured(record.id)"
              >
                <StarFilled
                  v-if="record.featured"
                  style="color: #faad14; font-size: 18px"
                />
                <StarOutlined v-else style="color: #d9d9d9; font-size: 18px" />
              </Button>
            </Tooltip>
          </template>
          <template v-if="column.key === 'status'">
            <Tag :color="statusMap[record.status]?.color ?? 'default'">
              <component :is="statusMap[record.status]?.icon" style="margin-right: 4px" />
              {{ statusMap[record.status]?.label ?? record.status }}
            </Tag>
          </template>
          <template v-if="column.key === 'created_at'">
            <span class="text-xs text-gray-400">{{ formatDate(record.created_at) }}</span>
          </template>
          <template v-if="column.key === 'action'">
            <Space :size="4">
              <Dropdown v-if="record.status === 'pending'">
                <Button size="small" type="primary" ghost>
                  审核 <DownOutlined />
                </Button>
                <template #overlay>
                  <Menu>
                    <Menu.Item key="approve" @click="handleStatusChange(record.id, 'approved')">
                      <CheckCircleOutlined style="color: #52c41a" /> 通过
                    </Menu.Item>
                    <Menu.Item key="reject" @click="handleStatusChange(record.id, 'rejected')">
                      <CloseCircleOutlined style="color: #ff4d4f" /> 拒绝
                    </Menu.Item>
                  </Menu>
                </template>
              </Dropdown>
              <Button
                v-if="record.status === 'approved'"
                size="small"
                @click="handleStatusChange(record.id, 'disabled')"
              >
                禁用
              </Button>
              <Button
                v-if="record.status === 'disabled' || record.status === 'rejected'"
                size="small"
                type="link"
                @click="handleStatusChange(record.id, 'approved')"
              >
                恢复
              </Button>
              <Button size="small" @click="openEditModal(record)">编辑</Button>
              <Popconfirm
                title="确认删除该作品？此操作不可恢复"
                ok-text="删除"
                ok-type="danger"
                @confirm="handleDelete(record.id)"
              >
                <Button size="small" danger type="text">删除</Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- Create / Edit Modal -->
    <Modal
      v-model:open="modalVisible"
      :title="editingId ? '编辑作品' : '新增作品'"
      width="680px"
      :confirm-loading="saving"
      ok-text="保存"
      @ok="handleSave"
    >
      <Form layout="vertical" class="py-4">
        <div class="grid grid-cols-2 gap-4">
          <Form.Item label="标题" required>
            <Input v-model:value="form.title" placeholder="作品标题" />
          </Form.Item>
          <Form.Item label="标签">
            <Select v-model:value="form.tag" placeholder="选择标签">
              <Select.Option v-for="t in tagOptions" :key="t" :value="t">
                {{ t }}
              </Select.Option>
            </Select>
          </Form.Item>
        </div>
        <Form.Item label="图片URL">
          <Input v-model:value="form.image_url" placeholder="https://..." />
          <div v-if="form.image_url" class="mt-2 p-2 bg-gray-50 rounded-lg inline-block">
            <img
              :src="form.image_url"
              class="h-28 rounded-lg object-cover"
              alt="预览"
            />
          </div>
        </Form.Item>
        <Form.Item label="描述">
          <Input.TextArea
            v-model:value="form.description"
            placeholder="作品描述"
            :auto-size="{ minRows: 2, maxRows: 4 }"
            show-count
            :maxlength="500"
          />
        </Form.Item>
        <Form.Item label="生成提示词">
          <Input.TextArea
            v-model:value="form.prompt"
            placeholder="用于生成该图片的 Prompt（可选）"
            :auto-size="{ minRows: 2, maxRows: 4 }"
          />
        </Form.Item>
        <div class="grid grid-cols-2 gap-4">
          <Form.Item label="作者">
            <Input v-model:value="form.author" placeholder="作者名" />
          </Form.Item>
          <Form.Item label="使用模型">
            <Input v-model:value="form.model_used" placeholder="如 gpt-image-2" />
          </Form.Item>
        </div>
        <div class="grid grid-cols-4 gap-4">
          <Form.Item label="宽度(px)">
            <InputNumber v-model:value="form.width" :min="0" class="w-full" />
          </Form.Item>
          <Form.Item label="高度(px)">
            <InputNumber v-model:value="form.height" :min="0" class="w-full" />
          </Form.Item>
          <Form.Item label="排序权重">
            <InputNumber v-model:value="form.sort" :min="0" class="w-full" />
          </Form.Item>
          <Form.Item label="状态">
            <Select v-model:value="form.status">
              <Select.Option value="pending">待审核</Select.Option>
              <Select.Option value="approved">已通过</Select.Option>
              <Select.Option value="rejected">已拒绝</Select.Option>
              <Select.Option value="disabled">已禁用</Select.Option>
            </Select>
          </Form.Item>
        </div>
        <Form.Item label="推荐展示">
          <Switch
            v-model:checked="form.featured"
            checked-children="推荐"
            un-checked-children="普通"
          />
          <span class="ml-3 text-xs text-gray-400">推荐作品将在灵感广场优先展示</span>
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>
