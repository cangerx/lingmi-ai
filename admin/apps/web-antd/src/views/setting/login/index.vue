<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import {
  Alert,
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
import { Button } from 'ant-design-vue';
import {
  KeyOutlined,
  MailOutlined,
  MobileOutlined,
  QqOutlined,
  WechatOutlined,
  WeiboOutlined,
  MessageOutlined,
  LinkOutlined,
  InfoCircleOutlined,
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
  <div class="p-6 max-w-5xl">
    <div class="mb-6">
      <h2 class="text-xl font-semibold">登录方式管理</h2>
      <p class="mt-1 text-sm text-gray-500">
        控制可用的登录方式，并配置短信和社交登录服务
      </p>
    </div>

    <Spin :spinning="loading">
      <!-- Login method toggles -->
      <Card title="登录方式开关" class="mb-6" :bordered="true">
        <template #extra>
          <Tooltip title="开启后用户可使用对应方式登录">
            <InfoCircleOutlined class="text-gray-400 cursor-help" />
          </Tooltip>
        </template>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="item in loginMethods"
            :key="item.key"
            :class="[
              'flex items-center justify-between rounded-lg border p-4 transition-all duration-200',
              item.value === 'true'
                ? 'border-blue-200 bg-blue-50/30'
                : 'border-gray-200 bg-gray-50/50',
            ]"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-lg"
                :style="{
                  backgroundColor: (loginMeta[item.key] || {}).bg || '#f5f5f5',
                  color: (loginMeta[item.key] || {}).color || '#999',
                }"
              >
                <component
                  :is="(loginMeta[item.key] || {}).icon || KeyOutlined"
                  :style="{ fontSize: '16px' }"
                />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">{{ item.label }}</span>
                  <Tag
                    v-if="item.value === 'true'"
                    color="blue"
                    :bordered="false"
                    class="text-xs"
                  >
                    已开启
                  </Tag>
                </div>
                <p class="mt-0.5 text-xs text-gray-400 leading-tight">
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
      </Card>

      <!-- Service Config -->
      <Card title="服务配置" :bordered="true">
        <template #extra>
          <Tag color="orange" :bordered="false" class="text-xs">
            开启对应登录方式后需配置
          </Tag>
        </template>
        <Tabs v-model:activeKey="activeConfigTab" type="card" size="small">
          <!-- SMS Tab -->
          <TabPane key="sms">
            <template #tab>
              <span class="flex items-center gap-1.5">
                <MessageOutlined /> 短信服务
              </span>
            </template>
            <div class="pt-2">
              <Alert
                v-if="!isMethodEnabled('phone_sms')"
                message="手机验证码登录未开启，配置保存后不会生效"
                type="warning"
                show-icon
                class="mb-4"
              />
              <Form layout="vertical" class="max-w-lg">
                <FormItem
                  v-for="item in smsSettings"
                  :key="item.key"
                  :label="item.label"
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
                    保存短信配置
                  </Button>
                </FormItem>
              </Form>
            </div>
          </TabPane>

          <!-- OAuth Tab -->
          <TabPane key="oauth">
            <template #tab>
              <span class="flex items-center gap-1.5">
                <LinkOutlined /> 社交登录
              </span>
            </template>
            <div class="pt-2 space-y-6">
              <div
                v-for="group in oauthGroups"
                :key="group.key"
                class="rounded-lg border p-4"
                :class="group.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'"
              >
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2">
                    <component
                      :is="group.icon"
                      :style="{ fontSize: '16px', color: group.color }"
                    />
                    <span class="font-medium text-sm">{{ group.title }}</span>
                    <Tag
                      v-if="group.enabled"
                      color="green"
                      :bordered="false"
                      class="text-xs"
                    >
                      已启用
                    </Tag>
                    <Tag v-else :bordered="false" class="text-xs">
                      未启用
                    </Tag>
                  </div>
                </div>
                <Form layout="vertical" class="max-w-lg">
                  <FormItem
                    v-for="field in group.fields"
                    :key="field.key"
                    :label="field.label"
                  >
                    <template v-if="field.remark" #extra>
                      <span class="text-xs text-gray-400">{{
                        field.remark
                      }}</span>
                    </template>
                    <InputPassword
                      v-if="field.type === 'password'"
                      v-model:value="field.value"
                      :placeholder="`请输入${field.label}`"
                      allow-clear
                    />
                    <Input
                      v-else
                      v-model:value="field.value"
                      :placeholder="`请输入${field.label}`"
                      allow-clear
                    />
                  </FormItem>
                </Form>
              </div>
              <div class="flex justify-end">
                <Button
                  type="primary"
                  :loading="saving"
                  @click="saveOAuthSettings"
                >
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
