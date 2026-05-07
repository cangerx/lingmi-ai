<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import {
  Alert,
  Badge,
  Button,
  Card,
  Form,
  Input,
  message,
  Progress,
  Select,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  Upload,
} from 'ant-design-vue';

import {
  CheckCircleOutlined,
  FileImageOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  PlusOutlined,
  SearchOutlined,
  ShareAltOutlined,
} from '@ant-design/icons-vue';

import { getSettingsByGroup, updateSettingsByGroup, adminUpload } from '#/api/admin';

interface SettingItem {
  key: string;
  value: string;
  label: string;
  type: string;
  remark: string;
}

const loading = ref(false);
const saving = ref(false);
const settings = ref<SettingItem[]>([]);
const activeTab = ref('basic');
const uploading = ref<Record<string, boolean>>({});

async function fetchSettings() {
  loading.value = true;
  try {
    const res: any = await getSettingsByGroup('site');
    settings.value = res.data ?? res ?? [];
  } catch {
    // handled
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  try {
    await updateSettingsByGroup(
      'site',
      settings.value.map((s) => ({
        key: s.key,
        value: s.value,
        label: s.label,
        type: s.type,
        remark: s.remark,
      })),
    );
    message.success('网站配置已保存');
  } catch {
    message.error('保存失败，请重试');
  } finally {
    saving.value = false;
  }
}

const settingsMap = computed(() => {
  const map: Record<string, string> = {};
  for (const s of settings.value) {
    map[s.key] = s.value;
  }
  return map;
});

function getVal(key: string): string {
  return settingsMap.value[key] ?? '';
}

function setVal(key: string, val: string) {
  const idx = settings.value.findIndex((s) => s.key === key);
  if (idx >= 0) {
    settings.value[idx] = { ...settings.value[idx]!, value: val };
  } else {
    settings.value.push({
      key,
      value: val,
      label: key,
      type: 'text',
      remark: '',
    });
  }
}

async function handleUpload(key: string, file: File) {
  uploading.value = { ...uploading.value, [key]: true };
  try {
    const res: any = await adminUpload(file);
    const url = res?.data?.url ?? res?.url ?? '';
    if (url) {
      setVal(key, url);
      message.success('上传成功');
    } else {
      message.error('上传失败：未返回文件地址');
    }
  } catch {
    message.error('上传失败');
  } finally {
    uploading.value = { ...uploading.value, [key]: false };
  }
  return false;
}

// Completeness checks
const basicComplete = computed(() => !!getVal('site_name'));
const logoComplete = computed(
  () => !!getVal('site_logo') && !!getVal('site_favicon'),
);
const seoComplete = computed(
  () => !!getVal('site_description') && !!getVal('site_keywords'),
);
const socialComplete = computed(() => !!getVal('site_og_image'));

const completedCount = computed(() => {
  let count = 0;
  if (basicComplete.value) count++;
  if (logoComplete.value) count++;
  if (seoComplete.value) count++;
  if (socialComplete.value) count++;
  return count;
});

const completionPercent = computed(() => Math.round((completedCount.value / 4) * 100));

onMounted(fetchSettings);
</script>

<template>
  <div class="p-5">
    <Spin :spinning="loading">
      <!-- Status Overview -->
      <Card class="mb-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <GlobalOutlined
              class="text-2xl"
              :class="completedCount >= 3 ? 'text-green-500' : completedCount >= 1 ? 'text-blue-500' : 'text-gray-300'"
            />
            <div>
              <h3 class="text-base font-semibold m-0">网站配置</h3>
              <div class="flex items-center gap-3 mt-1">
                <Progress
                  :percent="completionPercent"
                  :size="[120, 6]"
                  :show-info="false"
                  :stroke-color="completionPercent === 100 ? '#52c41a' : '#1677ff'"
                />
                <span class="text-xs text-gray-400">
                  {{ completedCount }}/4 模块已配置
                </span>
              </div>
            </div>
          </div>
          <Button type="primary" :loading="saving" @click="handleSave">
            <template #icon><CheckCircleOutlined /></template>
            保存配置
          </Button>
        </div>
      </Card>

      <!-- Alert -->
      <Alert
        v-if="completedCount < 2"
        type="info"
        show-icon
        class="mb-4"
        message="完善网站配置以获得更好的展示效果"
        description="建议至少完成「基本信息」和「Logo 与图标」的配置，前端页面将实时展示您的设置。"
      />

      <!-- Main Tabs -->
      <Card :body-style="{ padding: '16px 24px' }">
        <Tabs v-model:activeKey="activeTab" type="card">
          <!-- Basic Info Tab -->
          <Tabs.TabPane key="basic">
            <template #tab>
              <div class="flex items-center gap-2">
                <Badge :status="basicComplete ? 'success' : 'default'" />
                基本信息
                <Tag v-if="basicComplete" color="green" style="margin-right: 0">
                  已完成
                </Tag>
              </div>
            </template>

            <Form layout="vertical" class="max-w-xl">
              <Form.Item class="mb-4">
                <template #label>
                  <span>网站名称</span>
                  <Tooltip title="显示在浏览器标签、导航栏和页面标题中">
                    <InfoCircleOutlined class="ml-1 text-gray-300" />
                  </Tooltip>
                </template>
                <Input
                  :value="getVal('site_name')"
                  placeholder="如: 灵觅AI"
                  @update:value="(v: string) => setVal('site_name', v)"
                >
                  <template #suffix>
                    <CheckCircleOutlined v-if="getVal('site_name')" class="text-green-400" />
                  </template>
                </Input>
              </Form.Item>

              <div class="grid grid-cols-2 gap-x-4">
                <Form.Item class="mb-4">
                  <template #label>
                    <span>版权信息</span>
                    <Tooltip title="页面底部显示的版权文字">
                      <InfoCircleOutlined class="ml-1 text-gray-300" />
                    </Tooltip>
                  </template>
                  <Input
                    :value="getVal('site_copyright')"
                    placeholder="© 2024 Company"
                    @update:value="(v: string) => setVal('site_copyright', v)"
                  />
                </Form.Item>

                <Form.Item class="mb-4">
                  <template #label>
                    <span>ICP 备案号</span>
                    <Tooltip title="网站底部显示的 ICP 备案号">
                      <InfoCircleOutlined class="ml-1 text-gray-300" />
                    </Tooltip>
                  </template>
                  <Input
                    :value="getVal('site_icp')"
                    placeholder="京ICP备xxxxxxxx号"
                    @update:value="(v: string) => setVal('site_icp', v)"
                  />
                </Form.Item>
              </div>

              <!-- Preview Card -->
              <div class="rounded-lg border border-gray-100 bg-gray-50 p-4 mt-2">
                <p class="text-xs text-gray-400 mb-2">预览效果</p>
                <div class="text-center">
                  <p class="text-sm font-medium text-gray-700 mb-1">
                    {{ getVal('site_name') || '网站名称' }}
                  </p>
                  <p class="text-[11px] text-gray-400">
                    {{ getVal('site_copyright') || '© Company' }}
                    <span v-if="getVal('site_icp')" class="ml-2">{{ getVal('site_icp') }}</span>
                  </p>
                </div>
              </div>
            </Form>
          </Tabs.TabPane>

          <!-- Logo Tab -->
          <Tabs.TabPane key="logo">
            <template #tab>
              <div class="flex items-center gap-2">
                <Badge :status="logoComplete ? 'success' : 'default'" />
                Logo 与图标
                <Tag v-if="logoComplete" color="green" style="margin-right: 0">
                  已完成
                </Tag>
              </div>
            </template>

            <Form layout="vertical" class="max-w-xl">
              <!-- Logo Light -->
              <Form.Item class="mb-5">
                <template #label>
                  <span>网站 Logo（浅色版）</span>
                  <Tooltip title="用于深色背景（如登录弹窗左侧）。推荐 200×50 px，SVG/PNG 透明底">
                    <InfoCircleOutlined class="ml-1 text-gray-300" />
                  </Tooltip>
                </template>
                <div class="flex items-start gap-4">
                  <Upload
                    :show-upload-list="false"
                    accept="image/*"
                    :before-upload="(file: File) => handleUpload('site_logo', file)"
                  >
                    <div
                      class="w-36 h-20 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-800 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-md"
                    >
                      <template v-if="getVal('site_logo')">
                        <img
                          :src="getVal('site_logo')"
                          alt="Logo"
                          class="max-h-14 max-w-32 object-contain"
                        />
                      </template>
                      <template v-else>
                        <LoadingOutlined v-if="uploading['site_logo']" style="color: #fff" />
                        <PlusOutlined v-else style="color: #666; font-size: 20px" />
                        <span class="text-[10px] text-gray-500 mt-1">深色背景预览</span>
                      </template>
                    </div>
                  </Upload>
                  <div class="flex-1">
                    <Input
                      :value="getVal('site_logo')"
                      placeholder="/logo-full.svg 或 https://..."
                      @update:value="(v: string) => setVal('site_logo', v)"
                    >
                      <template #suffix>
                        <CheckCircleOutlined v-if="getVal('site_logo')" class="text-green-400" />
                      </template>
                    </Input>
                    <p class="text-xs text-gray-400 mt-1 mb-0">推荐 200×50 px，SVG / PNG 透明底</p>
                  </div>
                </div>
              </Form.Item>

              <!-- Logo Dark -->
              <Form.Item class="mb-5">
                <template #label>
                  <span>网站 Logo（深色版）</span>
                  <Tooltip title="用于浅色背景（如侧边栏顶部）。推荐 200×50 px，SVG/PNG 透明底">
                    <InfoCircleOutlined class="ml-1 text-gray-300" />
                  </Tooltip>
                </template>
                <div class="flex items-start gap-4">
                  <Upload
                    :show-upload-list="false"
                    accept="image/*"
                    :before-upload="(file: File) => handleUpload('site_logo_dark', file)"
                  >
                    <div
                      class="w-36 h-20 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 bg-white flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-md"
                    >
                      <template v-if="getVal('site_logo_dark')">
                        <img
                          :src="getVal('site_logo_dark')"
                          alt="Logo Dark"
                          class="max-h-14 max-w-32 object-contain"
                        />
                      </template>
                      <template v-else>
                        <LoadingOutlined v-if="uploading['site_logo_dark']" />
                        <PlusOutlined v-else style="color: #999; font-size: 20px" />
                        <span class="text-[10px] text-gray-400 mt-1">浅色背景预览</span>
                      </template>
                    </div>
                  </Upload>
                  <div class="flex-1">
                    <Input
                      :value="getVal('site_logo_dark')"
                      placeholder="/logo-dark.svg 或 https://..."
                      @update:value="(v: string) => setVal('site_logo_dark', v)"
                    />
                    <p class="text-xs text-gray-400 mt-1 mb-0">推荐 200×50 px，SVG / PNG 透明底</p>
                  </div>
                </div>
              </Form.Item>

              <!-- Favicon -->
              <Form.Item class="mb-5">
                <template #label>
                  <span>Favicon 图标</span>
                  <Tooltip title="浏览器标签页小图标。推荐 32×32 或 64×64 px，支持 .ico / .svg / .png">
                    <InfoCircleOutlined class="ml-1 text-gray-300" />
                  </Tooltip>
                </template>
                <div class="flex items-start gap-4">
                  <Upload
                    :show-upload-list="false"
                    accept="image/*,.ico"
                    :before-upload="(file: File) => handleUpload('site_favicon', file)"
                  >
                    <div
                      class="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-md"
                    >
                      <template v-if="getVal('site_favicon')">
                        <img
                          :src="getVal('site_favicon')"
                          alt="Favicon"
                          class="w-8 h-8 object-contain"
                        />
                      </template>
                      <template v-else>
                        <LoadingOutlined v-if="uploading['site_favicon']" />
                        <PlusOutlined v-else style="color: #999; font-size: 16px" />
                      </template>
                    </div>
                  </Upload>
                  <div class="flex-1">
                    <Input
                      :value="getVal('site_favicon')"
                      placeholder="/favicon.ico 或 https://..."
                      @update:value="(v: string) => setVal('site_favicon', v)"
                    >
                      <template #suffix>
                        <CheckCircleOutlined v-if="getVal('site_favicon')" class="text-green-400" />
                      </template>
                    </Input>
                    <p class="text-xs text-gray-400 mt-1 mb-0">推荐 32×32 px，ICO / SVG / PNG</p>
                  </div>
                </div>
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <!-- SEO Tab -->
          <Tabs.TabPane key="seo">
            <template #tab>
              <div class="flex items-center gap-2">
                <Badge :status="seoComplete ? 'success' : 'default'" />
                SEO 优化
                <Tag v-if="seoComplete" color="green" style="margin-right: 0">
                  已完成
                </Tag>
              </div>
            </template>

            <Alert
              type="info"
              show-icon
              class="mb-5"
              message="SEO 配置有助于提升搜索引擎排名"
              description="完善 Meta 描述和关键词后，搜索引擎将更准确地展示您的网站信息。"
            />

            <Form layout="vertical" class="max-w-xl">
              <Form.Item class="mb-4">
                <template #label>
                  <span>Meta 描述</span>
                  <Tooltip title="搜索引擎结果中展示的网站描述，建议 80-160 字">
                    <InfoCircleOutlined class="ml-1 text-gray-300" />
                  </Tooltip>
                </template>
                <Input.TextArea
                  :value="getVal('site_description')"
                  placeholder="请输入网站描述，建议 80-160 字"
                  :auto-size="{ minRows: 3, maxRows: 5 }"
                  show-count
                  :maxlength="200"
                  @update:value="(v: string) => setVal('site_description', v)"
                />
              </Form.Item>

              <Form.Item class="mb-4">
                <template #label>
                  <span>Meta 关键词</span>
                  <Tooltip title="搜索引擎优化关键词，英文逗号分隔">
                    <InfoCircleOutlined class="ml-1 text-gray-300" />
                  </Tooltip>
                </template>
                <Input
                  :value="getVal('site_keywords')"
                  placeholder="AI, 人工智能, AI绘画, AI聊天"
                  @update:value="(v: string) => setVal('site_keywords', v)"
                />
                <p class="text-xs text-gray-400 mt-1 mb-0">多个关键词用英文逗号分隔</p>
              </Form.Item>

              <div class="grid grid-cols-2 gap-x-4">
                <Form.Item class="mb-4">
                  <template #label>
                    <span>规范化 URL</span>
                    <Tooltip title="网站主域名，用于 canonical 标签">
                      <InfoCircleOutlined class="ml-1 text-gray-300" />
                    </Tooltip>
                  </template>
                  <Input
                    :value="getVal('site_canonical_url')"
                    placeholder="https://example.com"
                    @update:value="(v: string) => setVal('site_canonical_url', v)"
                  />
                </Form.Item>

                <Form.Item class="mb-4">
                  <template #label>
                    <span>统计代码 ID</span>
                    <Tooltip title="百度统计或 Google Analytics 跟踪 ID">
                      <InfoCircleOutlined class="ml-1 text-gray-300" />
                    </Tooltip>
                  </template>
                  <Input
                    :value="getVal('site_analytics_id')"
                    placeholder="G-XXXXXXXXXX"
                    @update:value="(v: string) => setVal('site_analytics_id', v)"
                  />
                </Form.Item>
              </div>

              <!-- SEO Preview -->
              <div class="rounded-lg border border-gray-100 bg-gray-50 p-4 mt-2">
                <p class="text-xs text-gray-400 mb-2">搜索结果预览</p>
                <div class="bg-white rounded-md p-3 shadow-sm border border-gray-100">
                  <p class="text-blue-600 text-sm font-medium mb-0.5 truncate">
                    {{ getVal('site_name') || '网站名称' }} - {{ getVal('site_description')?.slice(0, 30) || '网站描述' }}
                  </p>
                  <p class="text-green-700 text-xs mb-0.5">
                    {{ getVal('site_canonical_url') || 'https://example.com' }}
                  </p>
                  <p class="text-xs text-gray-500 mb-0 line-clamp-2">
                    {{ getVal('site_description') || '这里是网站的 Meta 描述内容，将展示在搜索结果中...' }}
                  </p>
                </div>
              </div>
            </Form>
          </Tabs.TabPane>

          <!-- Social Share Tab -->
          <Tabs.TabPane key="social">
            <template #tab>
              <div class="flex items-center gap-2">
                <Badge :status="socialComplete ? 'success' : 'default'" />
                社交分享
                <Tag v-if="socialComplete" color="green" style="margin-right: 0">
                  已完成
                </Tag>
              </div>
            </template>

            <Alert
              type="info"
              show-icon
              class="mb-5"
              message="社交分享优化"
              description="配置 OG 信息后，用户在微信、微博、Twitter 等平台分享您的网站时将展示精美的卡片样式。"
            />

            <Form layout="vertical" class="max-w-xl">
              <!-- OG Image -->
              <Form.Item class="mb-5">
                <template #label>
                  <span>分享封面图 (OG Image)</span>
                  <Tooltip title="在社交平台分享时展示的封面图片，推荐 1200×630 px">
                    <InfoCircleOutlined class="ml-1 text-gray-300" />
                  </Tooltip>
                </template>
                <div class="flex items-start gap-4">
                  <Upload
                    :show-upload-list="false"
                    accept="image/*"
                    :before-upload="(file: File) => handleUpload('site_og_image', file)"
                  >
                    <div
                      class="w-48 h-[100px] rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-md overflow-hidden"
                    >
                      <template v-if="getVal('site_og_image')">
                        <img
                          :src="getVal('site_og_image')"
                          alt="OG Image"
                          class="w-full h-full object-cover"
                        />
                      </template>
                      <template v-else>
                        <LoadingOutlined v-if="uploading['site_og_image']" />
                        <PlusOutlined v-else style="color: #999; font-size: 20px" />
                        <span class="text-[10px] text-gray-400 mt-1">1200 × 630 px</span>
                      </template>
                    </div>
                  </Upload>
                  <div class="flex-1">
                    <Input
                      :value="getVal('site_og_image')"
                      placeholder="上传图片或填入 URL"
                      @update:value="(v: string) => setVal('site_og_image', v)"
                    >
                      <template #suffix>
                        <CheckCircleOutlined v-if="getVal('site_og_image')" class="text-green-400" />
                      </template>
                    </Input>
                    <p class="text-xs text-gray-400 mt-1 mb-0">推荐 1200×630 px，JPG / PNG</p>
                  </div>
                </div>
              </Form.Item>

              <div class="grid grid-cols-2 gap-x-4">
                <Form.Item class="mb-4">
                  <template #label>
                    <span>OG 类型</span>
                    <Tooltip title="Open Graph 内容类型">
                      <InfoCircleOutlined class="ml-1 text-gray-300" />
                    </Tooltip>
                  </template>
                  <Select
                    :value="getVal('site_og_type') || 'website'"
                    @change="(v: any) => setVal('site_og_type', String(v))"
                  >
                    <Select.Option value="website">website</Select.Option>
                    <Select.Option value="article">article</Select.Option>
                    <Select.Option value="product">product</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item class="mb-4">
                  <template #label>
                    <span>Twitter Card</span>
                    <Tooltip title="Twitter/X 卡片展示样式">
                      <InfoCircleOutlined class="ml-1 text-gray-300" />
                    </Tooltip>
                  </template>
                  <Select
                    :value="getVal('site_twitter_card') || 'summary_large_image'"
                    @change="(v: any) => setVal('site_twitter_card', String(v))"
                  >
                    <Select.Option value="summary">summary（小图）</Select.Option>
                    <Select.Option value="summary_large_image">summary_large_image（大图）</Select.Option>
                  </Select>
                </Form.Item>
              </div>

              <!-- Social Preview -->
              <div class="rounded-lg border border-gray-100 bg-gray-50 p-4 mt-2">
                <p class="text-xs text-gray-400 mb-2">社交分享预览</p>
                <div class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden max-w-xs">
                  <div class="h-24 bg-gray-200 flex items-center justify-center">
                    <img
                      v-if="getVal('site_og_image')"
                      :src="getVal('site_og_image')"
                      class="w-full h-full object-cover"
                    />
                    <ShareAltOutlined v-else class="text-gray-300 text-2xl" />
                  </div>
                  <div class="p-3">
                    <p class="text-xs text-gray-400 mb-0.5">
                      {{ getVal('site_canonical_url')?.replace('https://', '') || 'example.com' }}
                    </p>
                    <p class="text-sm font-medium text-gray-800 mb-0.5 truncate">
                      {{ getVal('site_name') || '网站名称' }}
                    </p>
                    <p class="text-xs text-gray-500 mb-0 line-clamp-2">
                      {{ getVal('site_description')?.slice(0, 60) || '网站描述...' }}
                    </p>
                  </div>
                </div>
              </div>
            </Form>
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </Spin>
  </div>
</template>
