<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import {
  Button,
  Card,
  Form,
  message,
  Select,
  Spin,
  Switch,
  Tooltip,
} from 'ant-design-vue';

import { InfoCircleOutlined } from '@ant-design/icons-vue';

import { getModelList, getSettingsByGroup, updateSettingsByGroup } from '#/api/admin';

interface SettingItem {
  key: string;
  value: string;
  label: string;
  type: string;
  remark: string;
}

const loading = ref(false);
const saving = ref(false);
const rawSettings = ref<SettingItem[]>([]);

const modelOptions = ref<{ label: string; value: string }[]>([]);

const form = reactive({
  moderation_enabled: false,
  moderation_text_enabled: true,
  moderation_image_enabled: true,
  moderation_ai_review_enabled: true,
  moderation_ai_model: '',
});

async function fetchModels() {
  try {
    const res: any = await getModelList({ page_size: 200 });
    const list: any[] = res.data ?? res ?? [];
    modelOptions.value = list
      .filter((m: any) => m.type === 'chat' && m.status === 'active')
      .map((m: any) => ({ label: `${m.display_name || m.name} (${m.name})`, value: m.name }));
  } catch {
    // handled
  }
}

async function fetchSettings() {
  loading.value = true;
  try {
    const res: any = await getSettingsByGroup('content_moderation');
    const list: SettingItem[] = res.data ?? res ?? [];
    rawSettings.value = list;
    for (const item of list) {
      if (item.key === 'moderation_enabled') form.moderation_enabled = item.value === 'true';
      if (item.key === 'moderation_text_enabled') form.moderation_text_enabled = item.value === 'true';
      if (item.key === 'moderation_image_enabled') form.moderation_image_enabled = item.value === 'true';
      if (item.key === 'moderation_ai_review_enabled') form.moderation_ai_review_enabled = item.value === 'true';
      if (item.key === 'moderation_ai_model') form.moderation_ai_model = item.value ?? '';
    }
  } catch {
    // handled
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  try {
    const payload = rawSettings.value.map((s) => {
      const key = s.key as keyof typeof form;
      let val = s.value;
      if (key in form) {
        const v = form[key];
        val = typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v);
      }
      return { key: s.key, value: val, label: s.label, type: s.type, remark: s.remark };
    });
    await updateSettingsByGroup('content_moderation', payload);
    message.success('保存成功');
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  fetchSettings();
  fetchModels();
});
</script>

<template>
  <div class="p-6">
    <div class="mb-6">
      <h2 class="text-xl font-semibold">内容审核设置</h2>
      <p class="mt-1 text-sm text-gray-500">
        配置内容安全审核开关，控制文本、图片和 AI 二次审核的启用状态
      </p>
    </div>

    <Spin :spinning="loading">
      <Card class="max-w-2xl">
        <Form layout="vertical">
          <Form.Item>
            <div class="flex items-center justify-between">
              <div>
                <span class="font-medium">内容审核总开关</span>
                <Tooltip title="开启后系统将对用户发送的文本和生成的图片进行安全审核">
                  <InfoCircleOutlined class="ml-1 text-gray-400" />
                </Tooltip>
                <p class="mt-0.5 text-xs text-gray-400">关闭后所有审核功能将停用</p>
              </div>
              <Switch v-model:checked="form.moderation_enabled" />
            </div>
          </Form.Item>

          <Form.Item>
            <div class="flex items-center justify-between">
              <div>
                <span class="font-medium">文本审核</span>
                <p class="mt-0.5 text-xs text-gray-400">对聊天消息、图片提示词、昵称等进行违禁词检测</p>
              </div>
              <Switch v-model:checked="form.moderation_text_enabled" :disabled="!form.moderation_enabled" />
            </div>
          </Form.Item>

          <Form.Item>
            <div class="flex items-center justify-between">
              <div>
                <span class="font-medium">图片审核</span>
                <p class="mt-0.5 text-xs text-gray-400">对AI生成的图片进行NSFW/违规检测</p>
              </div>
              <Switch v-model:checked="form.moderation_image_enabled" :disabled="!form.moderation_enabled" />
            </div>
          </Form.Item>

          <Form.Item>
            <div class="flex items-center justify-between">
              <div>
                <span class="font-medium">AI 二次审核</span>
                <Tooltip title="当本地违禁词命中『送审』级别时，自动调用LLM做二次判断">
                  <InfoCircleOutlined class="ml-1 text-gray-400" />
                </Tooltip>
                <p class="mt-0.5 text-xs text-gray-400">可疑内容触发LLM二次判断，提高审核准确度</p>
              </div>
              <Switch v-model:checked="form.moderation_ai_review_enabled" :disabled="!form.moderation_enabled" />
            </div>
          </Form.Item>

          <Form.Item label="审核用模型">
            <Select
              v-model:value="form.moderation_ai_model"
              :options="modelOptions"
              allow-clear
              show-search
              option-filter-prop="label"
              placeholder="自动选择（留空使用第一个可用 chat 模型）"
              :disabled="!form.moderation_enabled"
              style="width: 100%"
            />
            <p class="mt-1 text-xs text-gray-400">选择用于文本/图片审核的AI模型，留空则自动选择</p>
          </Form.Item>

          <Form.Item>
            <Button type="primary" :loading="saving" @click="handleSave">保存设置</Button>
          </Form.Item>
        </Form>
      </Card>
    </Spin>
  </div>
</template>
