<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import {
  Alert,
  Badge,
  Button,
  Card,
  Form,
  FormItem,
  Input,
  InputPassword,
  message,
  Spin,
  Switch,
  Tabs,
  TabPane,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  CheckCircleOutlined,
  InfoCircleOutlined,
  KeyOutlined,
  LinkOutlined,
  MailOutlined,
  MessageOutlined,
  MobileOutlined,
  QqOutlined,
  SafetyCertificateOutlined,
  WechatOutlined,
  WeiboOutlined,
} from '@ant-design/icons-vue';

import { getSettingsByGroup, updateSettingsByGroup } from '#/api/admin';

interface SettingItem {
  key: string;
  value: string;
  label: string;
  remark: string;
  type: string;
}

const loading = ref(false);
const saving = ref(false);
const activeConfigTab = ref('sms');

const loginMethods = ref<SettingItem[]>([]);
const smsSettings = ref<SettingItem[]>([]);
const oauthSettings = ref<SettingItem[]>([]);

const loginMeta: Record<string, { icon: any; color: string; bg: string; desc: string }> = {
  email_password: {
    icon: MailOutlined,
    color: '#1677ff',
    bg: '#e6f4ff',
    desc: '用户通过邮箱和密码登录，支持注册新账号',
  },
  phone_sms: {
    icon: MobileOutlined,
    color: '#52c41a',
    bg: '#f6ffed',
    desc: '用户通过手机号和短信验证码登录，未注册自动创建账号',
  },
  wechat: {
    icon: WechatOutlined,
    color: '#07c160',
    bg: '#f0fff4',
    desc: '通过微信开放平台扫码登录，需配置 AppID 和 AppSecret',
  },
  weibo: {
    icon: WeiboOutlined,
    color: '#e6162d',
    bg: '#fff2f0',
    desc: '通过微博账号授权登录，需配置 App Key 和回调地址',
  },
  qq: {
    icon: QqOutlined,
    color: '#12b7f5',
    bg: '#e6f7ff',
    desc: '通过QQ账号授权登录，需配置 AppID 和回调地址',
  },
};

const isMethodEnabled = (key: string) => {
  const m = loginMethods.value.find((i) => i.key === key);
  return m?.value === 'true';
};

const enabledCount = computed(
  () => loginMethods.value.filter((m) => m.value === 'true').length,
);

const smsConfigured = computed(
  () => smsSettings.value.some((s) => s.value && s.type !== 'switch'),
);

const oauthHasAnyEnabled = computed(
  () => isMethodEnabled('wechat') || isMethodEnabled('weibo') || isMethodEnabled('qq'),
);

const oauthGroups = computed(() => [
  {
    key: 'wechat',
    title: '微信开放平台',
    icon: WechatOutlined,
    color: '#07c160',
    enabled: isMethodEnabled('wechat'),
    fields: oauthSettings.value.filter((s) => s.key.startsWith('wechat')),
  },
  {
    key: 'weibo',
    title: '微博',
    icon: WeiboOutlined,
    color: '#e6162d',
    enabled: isMethodEnabled('weibo'),
    fields: oauthSettings.value.filter((s) => s.key.startsWith('weibo')),
  },
  {
    key: 'qq',
    title: 'QQ',
    icon: QqOutlined,
    color: '#12b7f5',
    enabled: isMethodEnabled('qq'),
    fields: oauthSettings.value.filter((s) => s.key.startsWith('qq')),
  },
]);

async function fetchAll() {
  loading.value = true;
  try {
    const [loginRes, smsRes, oauthRes]: any[] = await Promise.all([
      getSettingsByGroup('login_methods'),
      getSettingsByGroup('sms'),
      getSettingsByGroup('oauth'),
    ]);
    const parseSettings = (res: any) => {
      const list = res?.data ?? res ?? [];
      return (Array.isArray(list) ? list : []).map((s: any) => ({
        key: s.key,
        value: s.value,
        label: s.label,
        remark: s.remark,
        type: s.type,
      }));
    };
    loginMethods.value = parseSettings(loginRes);
    smsSettings.value = parseSettings(smsRes);
    oauthSettings.value = parseSettings(oauthRes);
  } catch {
    message.error('加载登录配置失败');
  } finally {
    loading.value = false;
  }
}

async function toggleLogin(item: SettingItem, checked: boolean) {
  item.value = checked ? 'true' : 'false';
  saving.value = true;
  try {
    const payload = loginMethods.value.map((m) => ({
      key: m.key,
      value: m.value,
      label: m.label,
      type: 'switch',
      remark: m.remark,
    }));
    await updateSettingsByGroup('login_methods', payload);
    message.success(`${item.label} 已${checked ? '开启' : '关闭'}`);
  } catch {
    item.value = checked ? 'false' : 'true';
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

async function saveSmsSettings() {
  saving.value = true;
  try {
    const payload = smsSettings.value.map((m) => ({
      key: m.key,
      value: m.value,
      label: m.label,
      type: m.type,
      remark: m.remark,
    }));
    await updateSettingsByGroup('sms', payload);
    message.success('短信配置已保存');
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

async function saveOAuthSettings() {
  saving.value = true;
  try {
    const payload = oauthSettings.value.map((m) => ({
      key: m.key,
      value: m.value,
      label: m.label,
      type: m.type,
      remark: m.remark,
    }));
    await updateSettingsByGroup('oauth', payload);
    message.success('社交登录配置已保存');
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(fetchAll);
</script>

<template>
  <div class="p-5">
    <Spin :spinning="loading">
      <!-- Status Overview -->
      <Card class="mb-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <SafetyCertificateOutlined
              class="text-2xl"
              :class="enabledCount > 0 ? 'text-green-500' : 'text-gray-300'"
            />
            <div>
              <h3 class="text-base font-semibold m-0">登录方式管理</h3>
              <div class="flex items-center gap-2 mt-1">
                <Tag :color="enabledCount > 0 ? 'green' : 'default'">
                  {{ enabledCount }} 种方式已开启
                </Tag>
                <Tag v-if="isMethodEnabled('phone_sms') && smsConfigured" color="green">
                  短信已配置
                </Tag>
                <Tag v-else-if="isMethodEnabled('phone_sms')" color="orange">
                  短信待配置
                </Tag>
                <Tag v-if="oauthHasAnyEnabled" color="blue">
                  社交登录
                </Tag>
              </div>
            </div>
          </div>
          <Tooltip title="开关变更会实时生效，服务配置需手动保存">
            <InfoCircleOutlined class="text-gray-400 text-lg" />
          </Tooltip>
        </div>
      </Card>

      <!-- Login method toggles -->
      <Card class="mb-4" size="small">
        <template #title>
          <div class="flex items-center gap-2">
            <KeyOutlined class="text-blue-500" />
            <span>登录方式开关</span>
          </div>
        </template>
        <template #extra>
          <span class="text-xs text-gray-400">开关变更即时生效</span>
        </template>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="item in loginMethods"
            :key="item.key"
            class="rounded-lg border-2 p-4 transition-all duration-200 cursor-default"
            :class="
              item.value === 'true'
                ? 'border-blue-200 bg-blue-50/40 shadow-sm'
                : 'border-gray-100 bg-gray-50/30 hover:border-gray-200'
            "
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-9 w-9 items-center justify-center rounded-lg transition-transform"
                  :class="item.value === 'true' ? 'scale-105' : ''"
                  :style="{
                    backgroundColor: (loginMeta[item.key] || {}).bg || '#f5f5f5',
                    color: (loginMeta[item.key] || {}).color || '#999',
                  }"
                >
                  <component
                    :is="(loginMeta[item.key] || {}).icon || KeyOutlined"
                    :style="{ fontSize: '18px' }"
                  />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium">{{ item.label }}</span>
                    <Tag
                      v-if="item.value === 'true'"
                      color="blue"
                      :bordered="false"
                      class="text-[10px]"
                    >
                      已开启
                    </Tag>
                  </div>
                  <p class="mt-0.5 text-[11px] text-gray-400 leading-tight mb-0">
                    {{ (loginMeta[item.key] || {}).desc || item.remark }}
                  </p>
                </div>
              </div>
              <Switch
                :checked="item.value === 'true'"
                :loading="saving"
                size="small"
                @change="(checked: boolean) => toggleLogin(item, checked)"
              />
            </div>
          </div>
        </div>
      </Card>

      <!-- Service Config -->
      <Card :body-style="{ padding: '16px 24px' }">
        <template #title>
          <div class="flex items-center gap-2">
            <span>服务配置</span>
            <Tag color="orange" :bordered="false" class="text-[10px]">
              需手动保存
            </Tag>
          </div>
        </template>

        <Tabs v-model:activeKey="activeConfigTab" type="card">
          <!-- SMS Tab -->
          <TabPane key="sms">
            <template #tab>
              <div class="flex items-center gap-2">
                <Badge
                  :status="isMethodEnabled('phone_sms') && smsConfigured ? 'success' : isMethodEnabled('phone_sms') ? 'warning' : 'default'"
                />
                <MessageOutlined />
                短信服务
                <Tag v-if="smsConfigured && isMethodEnabled('phone_sms')" color="green" style="margin-right: 0">
                  已配置
                </Tag>
              </div>
            </template>

            <Alert
              v-if="!isMethodEnabled('phone_sms')"
              message="手机验证码登录未开启"
              description="请先在上方开启「手机验证码」登录方式，再配置短信服务。配置保存后需开启才会生效。"
              type="warning"
              show-icon
              class="mb-5"
            />
            <Alert
              v-else-if="!smsConfigured"
              message="请完成短信服务配置"
              description="手机验证码登录已开启，但短信服务尚未配置。请填写以下信息后保存。"
              type="info"
              show-icon
              class="mb-5"
            />

            <Form layout="vertical" class="max-w-lg">
              <FormItem
                v-for="item in smsSettings"
                :key="item.key"
                :label="item.label"
                class="mb-4"
              >
                <template #extra>
                  <span class="text-xs text-gray-400">{{ item.remark }}</span>
                </template>
                <Switch
                  v-if="item.type === 'switch'"
                  :checked="item.value === 'true'"
                  @change="
                    (checked: boolean) =>
                      (item.value = checked ? 'true' : 'false')
                  "
                />
                <InputPassword
                  v-else-if="item.type === 'password'"
                  v-model:value="item.value"
                  :placeholder="`请输入${item.label}`"
                  allow-clear
                />
                <Input
                  v-else
                  v-model:value="item.value"
                  :placeholder="`请输入${item.label}`"
                  allow-clear
                />
              </FormItem>
              <FormItem>
                <Button
                  type="primary"
                  :loading="saving"
                  @click="saveSmsSettings"
                >
                  <template #icon><CheckCircleOutlined /></template>
                  保存短信配置
                </Button>
              </FormItem>
            </Form>
          </TabPane>

          <!-- OAuth Tab -->
          <TabPane key="oauth">
            <template #tab>
              <div class="flex items-center gap-2">
                <Badge
                  :status="oauthHasAnyEnabled ? 'success' : 'default'"
                />
                <LinkOutlined />
                社交登录
                <Tag v-if="oauthHasAnyEnabled" color="green" style="margin-right: 0">
                  已启用
                </Tag>
              </div>
            </template>

            <Alert
              v-if="!oauthHasAnyEnabled"
              message="未开启任何社交登录方式"
              description="请先在上方开启微信/微博/QQ等社交登录方式，再配置对应的 AppID 和密钥。"
              type="info"
              show-icon
              class="mb-5"
            />

            <div class="space-y-5">
              <div
                v-for="group in oauthGroups"
                :key="group.key"
                class="rounded-lg border-2 p-5 transition-all"
                :class="
                  group.enabled
                    ? 'border-gray-200 bg-white'
                    : 'border-gray-100 bg-gray-50/50 opacity-60'
                "
              >
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2">
                    <div
                      class="flex h-7 w-7 items-center justify-center rounded"
                      :style="{ backgroundColor: group.color + '15', color: group.color }"
                    >
                      <component
                        :is="group.icon"
                        :style="{ fontSize: '14px' }"
                      />
                    </div>
                    <span class="font-medium text-sm">{{ group.title }}</span>
                    <Tag
                      v-if="group.enabled"
                      color="green"
                      :bordered="false"
                      class="text-[10px]"
                    >
                      已启用
                    </Tag>
                    <Tag v-else color="default" :bordered="false" class="text-[10px]">
                      未启用
                    </Tag>
                  </div>
                  <Tooltip v-if="!group.enabled" title="请先在上方开关中开启该登录方式">
                    <InfoCircleOutlined class="text-gray-300" />
                  </Tooltip>
                </div>

                <Form layout="vertical" class="max-w-lg">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    <FormItem
                      v-for="field in group.fields"
                      :key="field.key"
                      :label="field.label"
                      class="mb-3"
                    >
                      <template v-if="field.remark" #extra>
                        <span class="text-xs text-gray-400">{{ field.remark }}</span>
                      </template>
                      <InputPassword
                        v-if="field.type === 'password'"
                        v-model:value="field.value"
                        :placeholder="`请输入${field.label}`"
                        :disabled="!group.enabled"
                        allow-clear
                      />
                      <Input
                        v-else
                        v-model:value="field.value"
                        :placeholder="`请输入${field.label}`"
                        :disabled="!group.enabled"
                        allow-clear
                      />
                    </FormItem>
                  </div>
                </Form>
              </div>

              <div class="flex justify-end pt-2">
                <Button
                  type="primary"
                  :loading="saving"
                  :disabled="!oauthHasAnyEnabled"
                  @click="saveOAuthSettings"
                >
                  <template #icon><CheckCircleOutlined /></template>
                  保存社交登录配置
                </Button>
              </div>
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </Spin>
  </div>
</template>
