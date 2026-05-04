<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Input,
  message,
  Select,
  Spin,
  Tooltip,
  Upload,
} from 'ant-design-vue';

import {
  GlobalOutlined,
  FileImageOutlined,
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
    message.success('保存成功');
  } catch {
    message.error('保存失败');
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
    settings.value[idx] = { ...settings.value[idx], value: val };
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

onMounted(fetchSettings);
</script>

<template>
  <div class="p-5">
    <Card title="网站设置">
      <template #extra>
        <Button type="primary" :loading="saving" @click="handleSave">
          保存配置
        </Button>
      </template>

      <Spin :spinning="loading">
        <Alert
          class="mb-6"
          message="修改网站设置后，前端页面将实时更新网站名称、Logo、SEO 信息和版权等内容。"
          type="info"
          show-icon
        />

        <Form layout="vertical" class="max-w-2xl">
          <!-- ═══ 基本信息 ═══ -->
          <div class="flex items-center gap-2 mb-4">
            <GlobalOutlined style="font-size: 16px; color: #1677ff" />
            <span class="text-base font-medium">基本信息</span>
          </div>

          <Form.Item>
            <template #label>
              <span>网站名称</span>
              <Tooltip title="显示在浏览器标签和页面标题中">
                <InfoCircleOutlined class="ml-1 text-gray-400" />
              </Tooltip>
            </template>
            <Input
              :value="getVal('site_name')"
              placeholder="请输入网站名称"
              @update:value="(v: string) => setVal('site_name', v)"
            />
          </Form.Item>

          <Form.Item>
            <template #label>
              <span>版权信息</span>
              <Tooltip title="页面底部显示的版权文字">
                <InfoCircleOutlined class="ml-1 text-gray-400" />
              </Tooltip>
            </template>
            <Input
              :value="getVal('site_copyright')"
              placeholder="© 2024 Your Company. All rights reserved."
              @update:value="(v: string) => setVal('site_copyright', v)"
            />
          </Form.Item>

          <Form.Item>
            <template #label>
              <span>ICP 备案号</span>
              <Tooltip title="网站底部显示的 ICP 备案号">
                <InfoCircleOutlined class="ml-1 text-gray-400" />
              </Tooltip>
            </template>
            <Input
              :value="getVal('site_icp')"
              placeholder="京ICP备xxxxxxxx号"
              @update:value="(v: string) => setVal('site_icp', v)"
            />
          </Form.Item>

          <Divider />

          <!-- ═══ Logo 与图标（上传） ═══ -->
          <div class="flex items-center gap-2 mb-4">
            <FileImageOutlined style="font-size: 16px; color: #1677ff" />
            <span class="text-base font-medium">Logo 与图标</span>
          </div>

          <!-- Logo 浅色 -->
          <Form.Item>
            <template #label>
              <span>网站 Logo（浅色）</span>
              <Tooltip title="用于深色背景（如登录弹窗左侧）。推荐尺寸 200×50 px，支持 SVG / PNG 透明底">
                <InfoCircleOutlined class="ml-1 text-gray-400" />
              </Tooltip>
            </template>
            <div class="flex items-start gap-4">
              <Upload
                :show-upload-list="false"
                accept="image/*"
                :before-upload="(file: File) => handleUpload('site_logo', file)"
              >
                <div
                  class="w-32 h-20 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-800 flex flex-col items-center justify-center cursor-pointer transition-colors"
                >
                  <template v-if="getVal('site_logo')">
                    <img
                      :src="getVal('site_logo')"
                      alt="Logo"
                      class="max-h-14 max-w-28 object-contain"
                    />
                  </template>
                  <template v-else>
                    <LoadingOutlined v-if="uploading['site_logo']" style="color: #fff" />
                    <PlusOutlined v-else style="color: #999; font-size: 20px" />
                    <span class="text-[10px] text-gray-400 mt-1">点击上传</span>
                  </template>
                </div>
              </Upload>
              <div class="flex-1">
                <Input
                  :value="getVal('site_logo')"
                  placeholder="/logo-full.svg 或 https://..."
                  @update:value="(v: string) => setVal('site_logo', v)"
                />
                <div class="text-xs text-gray-400 mt-1">推荐 200×50 px，SVG / PNG 透明底</div>
              </div>
            </div>
          </Form.Item>

          <!-- Logo 深色 -->
          <Form.Item>
            <template #label>
              <span>网站 Logo（深色）</span>
              <Tooltip title="用于浅色背景（如侧边栏）。推荐尺寸 200×50 px，支持 SVG / PNG 透明底">
                <InfoCircleOutlined class="ml-1 text-gray-400" />
              </Tooltip>
            </template>
            <div class="flex items-start gap-4">
              <Upload
                :show-upload-list="false"
                accept="image/*"
                :before-upload="(file: File) => handleUpload('site_logo_dark', file)"
              >
                <div
                  class="w-32 h-20 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 bg-white flex flex-col items-center justify-center cursor-pointer transition-colors"
                >
                  <template v-if="getVal('site_logo_dark')">
                    <img
                      :src="getVal('site_logo_dark')"
                      alt="Logo Dark"
                      class="max-h-14 max-w-28 object-contain"
                    />
                  </template>
                  <template v-else>
                    <LoadingOutlined v-if="uploading['site_logo_dark']" />
                    <PlusOutlined v-else style="color: #999; font-size: 20px" />
                    <span class="text-[10px] text-gray-400 mt-1">点击上传</span>
                  </template>
                </div>
              </Upload>
              <div class="flex-1">
                <Input
                  :value="getVal('site_logo_dark')"
                  placeholder="/logo-dark.svg 或 https://..."
                  @update:value="(v: string) => setVal('site_logo_dark', v)"
                />
                <div class="text-xs text-gray-400 mt-1">推荐 200×50 px，SVG / PNG 透明底</div>
              </div>
            </div>
          </Form.Item>

          <!-- Favicon -->
          <Form.Item>
            <template #label>
              <span>Favicon</span>
              <Tooltip title="浏览器标签页图标。推荐 32×32 或 64×64 px，支持 .ico / .svg / .png">
                <InfoCircleOutlined class="ml-1 text-gray-400" />
              </Tooltip>
            </template>
            <div class="flex items-start gap-4">
              <Upload
                :show-upload-list="false"
                accept="image/*,.ico"
                :before-upload="(file: File) => handleUpload('site_favicon', file)"
              >
                <div
                  class="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition-colors"
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
                  placeholder="/logo-icon.svg 或 https://..."
                  @update:value="(v: string) => setVal('site_favicon', v)"
                />
                <div class="text-xs text-gray-400 mt-1">推荐 32×32 或 64×64 px，ICO / SVG / PNG</div>
              </div>
            </div>
          </Form.Item>

          <Divider />

          <!-- ═══ SEO 设置 ═══ -->
          <div class="flex items-center gap-2 mb-4">
            <SearchOutlined style="font-size: 16px; color: #1677ff" />
            <span class="text-base font-medium">SEO 设置</span>
          </div>

          <Form.Item>
            <template #label>
              <span>Meta 描述</span>
              <Tooltip title="搜索引擎结果中展示的网站描述，建议 80-160 字">
                <InfoCircleOutlined class="ml-1 text-gray-400" />
              </Tooltip>
            </template>
            <Input.TextArea
              :value="getVal('site_description')"
              placeholder="请输入网站描述"
              :auto-size="{ minRows: 2, maxRows: 4 }"
              show-count
              :maxlength="200"
              @update:value="(v: string) => setVal('site_description', v)"
            />
          </Form.Item>

          <Form.Item>
            <template #label>
              <span>Meta 关键词</span>
              <Tooltip title="搜索引擎优化关键词，英文逗号分隔">
                <InfoCircleOutlined class="ml-1 text-gray-400" />
              </Tooltip>
            </template>
            <Input
              :value="getVal('site_keywords')"
              placeholder="AI,人工智能,AI绘画,AI聊天"
              @update:value="(v: string) => setVal('site_keywords', v)"
            />
          </Form.Item>

          <Form.Item>
            <template #label>
              <span>规范化 URL</span>
              <Tooltip title="网站主域名，用于 canonical 标签和 sitemap 生成">
                <InfoCircleOutlined class="ml-1 text-gray-400" />
              </Tooltip>
            </template>
            <Input
              :value="getVal('site_canonical_url')"
              placeholder="https://example.com"
              @update:value="(v: string) => setVal('site_canonical_url', v)"
            />
          </Form.Item>

          <Form.Item>
            <template #label>
              <span>统计代码 ID</span>
              <Tooltip title="百度统计或 Google Analytics 的跟踪 ID">
                <InfoCircleOutlined class="ml-1 text-gray-400" />
              </Tooltip>
            </template>
            <Input
              :value="getVal('site_analytics_id')"
              placeholder="G-XXXXXXXXXX 或百度统计 ID"
              @update:value="(v: string) => setVal('site_analytics_id', v)"
            />
          </Form.Item>

          <Divider />

          <!-- ═══ 社交分享 (OG / Twitter) ═══ -->
          <div class="flex items-center gap-2 mb-4">
            <ShareAltOutlined style="font-size: 16px; color: #1677ff" />
            <span class="text-base font-medium">社交分享</span>
          </div>

          <!-- OG Image Upload -->
          <Form.Item>
            <template #label>
              <span>OG 分享图</span>
              <Tooltip title="在微信、微博、Facebook 等平台分享时展示的封面图片，推荐 1200×630">
                <InfoCircleOutlined class="ml-1 text-gray-400" />
              </Tooltip>
            </template>
            <div class="flex items-start gap-4">
              <Upload
                :show-upload-list="false"
                accept="image/*"
                :before-upload="(file: File) => handleUpload('site_og_image', file)"
              >
                <div
                  class="w-40 h-[84px] rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden"
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
                    <span class="text-[10px] text-gray-400 mt-1">1200×630</span>
                  </template>
                </div>
              </Upload>
              <div class="flex-1">
                <Input
                  :value="getVal('site_og_image')"
                  placeholder="https://... 或上传图片自动填入"
                  @update:value="(v: string) => setVal('site_og_image', v)"
                />
                <div class="text-xs text-gray-400 mt-1">推荐 1200×630 px，JPG / PNG，用于社交平台分享封面</div>
              </div>
            </div>
          </Form.Item>

          <div class="grid grid-cols-2 gap-4">
            <Form.Item>
              <template #label>
                <span>OG 类型</span>
                <Tooltip title="Open Graph 类型，一般为 website">
                  <InfoCircleOutlined class="ml-1 text-gray-400" />
                </Tooltip>
              </template>
              <Select
                :value="getVal('site_og_type') || 'website'"
                @change="(v: string) => setVal('site_og_type', v)"
              >
                <Select.Option value="website">website</Select.Option>
                <Select.Option value="article">article</Select.Option>
                <Select.Option value="product">product</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <template #label>
                <span>Twitter Card</span>
                <Tooltip title="Twitter 卡片样式">
                  <InfoCircleOutlined class="ml-1 text-gray-400" />
                </Tooltip>
              </template>
              <Select
                :value="getVal('site_twitter_card') || 'summary_large_image'"
                @change="(v: string) => setVal('site_twitter_card', v)"
              >
                <Select.Option value="summary">summary</Select.Option>
                <Select.Option value="summary_large_image">summary_large_image</Select.Option>
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Spin>
    </Card>
  </div>
</template>
