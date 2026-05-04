<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Card, message, Spin, Switch, Tag } from 'ant-design-vue';
import {
  MessageOutlined,
  HighlightOutlined,
  CameraOutlined,
  ScissorOutlined,
  ClearOutlined,
  ExpandOutlined,
  ThunderboltOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  CustomerServiceOutlined,
  AppstoreOutlined,
} from '@ant-design/icons-vue';

import { getSettingsByGroup, updateSettingsByGroup } from '#/api/admin';

interface ModuleItem {
  key: string;
  value: string;
  label: string;
  remark: string;
}

const loading = ref(false);
const saving = ref(false);
const modules = ref<ModuleItem[]>([]);

const iconMap: Record<string, { icon: any; color: string; bg: string }> = {
  chat: { icon: MessageOutlined, color: '#1677ff', bg: '#e6f4ff' },
  image_generate: { icon: HighlightOutlined, color: '#722ed1', bg: '#f9f0ff' },
  product_photo: { icon: CameraOutlined, color: '#eb2f96', bg: '#fff0f6' },
  cutout: { icon: ScissorOutlined, color: '#fa8c16', bg: '#fff7e6' },
  eraser: { icon: ClearOutlined, color: '#13c2c2', bg: '#e6fffb' },
  expand: { icon: ExpandOutlined, color: '#52c41a', bg: '#f6ffed' },
  upscale: { icon: ThunderboltOutlined, color: '#faad14', bg: '#fffbe6' },
  poster: { icon: PictureOutlined, color: '#2f54eb', bg: '#f0f5ff' },
  video: { icon: VideoCameraOutlined, color: '#f5222d', bg: '#fff1f0' },
  music: { icon: CustomerServiceOutlined, color: '#eb2f96', bg: '#fff0f6' },
};
const defaultIcon = { icon: AppstoreOutlined, color: '#999', bg: '#f5f5f5' };

async function fetchModules() {
  loading.value = true;
  try {
    const res: any = await getSettingsByGroup('app_modules');
    modules.value = (res.data ?? []).map((s: any) => ({
      key: s.key,
      value: s.value,
      label: s.label,
      remark: s.remark,
    }));
  } catch {
    message.error('加载模块配置失败');
  } finally {
    loading.value = false;
  }
}

async function toggleModule(mod: ModuleItem, checked: boolean) {
  mod.value = checked ? 'true' : 'false';
  saving.value = true;
  try {
    const payload = modules.value.map((m) => ({
      key: m.key,
      value: m.value,
      label: m.label,
      type: 'switch',
      remark: m.remark,
    }));
    await updateSettingsByGroup('app_modules', payload);
    message.success(`${mod.label} 已${checked ? '开启' : '关闭'}`);
  } catch {
    mod.value = checked ? 'false' : 'true';
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(fetchModules);
</script>

<template>
  <div class="p-6">
    <div class="mb-6">
      <h2 class="text-xl font-semibold">应用模块管理</h2>
      <p class="mt-1 text-sm text-gray-500">
        控制各功能模块的开启/关闭状态，关闭后用户端将不再显示对应功能入口
      </p>
    </div>

    <Spin :spinning="loading">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          v-for="mod in modules"
          :key="mod.key"
          size="small"
          :class="[
            'transition-all duration-200',
            mod.value === 'true'
              ? 'border-blue-200 shadow-sm'
              : 'border-gray-100 opacity-70',
          ]"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <div
                class="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg"
                :style="{
                  backgroundColor: (iconMap[mod.key] || defaultIcon).bg,
                  color: (iconMap[mod.key] || defaultIcon).color,
                }"
              >
                <component :is="(iconMap[mod.key] || defaultIcon).icon" :style="{ fontSize: '16px' }" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ mod.label }}</span>
                  <Tag
                    v-if="mod.value === 'false'"
                    color="default"
                    class="text-xs"
                  >
                    未开放
                  </Tag>
                  <Tag v-else color="blue" class="text-xs">已开启</Tag>
                </div>
                <p class="mt-1 text-xs text-gray-400">{{ mod.remark }}</p>
              </div>
            </div>
            <Switch
              :checked="mod.value === 'true'"
              :loading="saving"
              @change="(checked: boolean) => toggleModule(mod, checked)"
            />
          </div>
        </Card>
      </div>
    </Spin>
  </div>
</template>
