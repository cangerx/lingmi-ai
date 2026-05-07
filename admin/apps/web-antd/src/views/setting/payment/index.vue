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
  Radio,
  Spin,
  Switch,
  Tabs,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue';

import { getSettingsByGroup, updateSettingsByGroup } from '#/api/admin';

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
const activeTab = ref('tianque');

async function fetchSettings() {
  loading.value = true;
  try {
    const res: any = await getSettingsByGroup('payment');
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
      'payment',
      settings.value.map((s) => ({
        key: s.key,
        value: s.value,
        label: s.label,
        type: s.type,
        remark: s.remark,
      })),
    );
    message.success('支付配置已保存');
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

function getSettingValue(key: string): string {
  return settingsMap.value[key] ?? '';
}

function setSettingValue(key: string, val: string) {
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

function toggleSwitch(key: string, checked: boolean) {
  setSettingValue(key, checked ? 'true' : 'false');
}

// Status checks
const isMockMode = computed(
  () => getSettingValue('mock_enabled') === 'true',
);

const tianqueConfigured = computed(
  () =>
    !!getSettingValue('tianque_org_id') &&
    !!getSettingValue('tianque_mno') &&
    !!getSettingValue('tianque_private_key'),
);

const wechatConfigured = computed(
  () =>
    !!getSettingValue('wechat_app_id') && !!getSettingValue('wechat_mch_id'),
);

const alipayConfigured = computed(
  () => !!getSettingValue('alipay_app_id') && !!getSettingValue('alipay_private_key'),
);

const activeProvider = computed(() => {
  if (isMockMode.value) return 'mock';
  if (tianqueConfigured.value) return 'tianque';
  if (wechatConfigured.value || alipayConfigured.value) return 'direct';
  return 'none';
});

const tianqueEnv = computed(() => {
  const url = getSettingValue('tianque_base_url');
  if (url.includes('openapi-test')) return 'test';
  if (url.includes('openapi.')) return 'production';
  return 'unknown';
});

onMounted(fetchSettings);
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
              :class="
                activeProvider === 'mock'
                  ? 'text-orange-500'
                  : activeProvider === 'none'
                    ? 'text-gray-300'
                    : 'text-green-500'
              "
            />
            <div>
              <h3 class="text-base font-semibold m-0">支付渠道状态</h3>
              <div class="flex items-center gap-2 mt-1">
                <Tag
                  v-if="isMockMode"
                  color="orange"
                >
                  模拟模式
                </Tag>
                <Tag
                  v-else-if="activeProvider === 'tianque'"
                  color="green"
                >
                  随行付聚合支付
                </Tag>
                <Tag
                  v-else-if="activeProvider === 'direct'"
                  color="blue"
                >
                  直连模式
                </Tag>
                <Tag v-else color="default">
                  未配置
                </Tag>

                <Tag
                  v-if="tianqueConfigured && !isMockMode"
                  :color="tianqueEnv === 'production' ? 'red' : 'cyan'"
                >
                  {{ tianqueEnv === 'production' ? '生产环境' : '测试环境' }}
                </Tag>
              </div>
            </div>
          </div>
          <Button type="primary" :loading="saving" @click="handleSave">
            <template #icon><CheckCircleOutlined /></template>
            保存配置
          </Button>
        </div>
      </Card>

      <!-- Mode Switch -->
      <Card class="mb-4" size="small">
        <div class="flex items-center justify-between py-1">
          <div class="flex items-center gap-3">
            <ThunderboltOutlined class="text-lg text-orange-400" />
            <div>
              <span class="font-medium">模拟支付模式</span>
              <p class="text-xs text-gray-400 m-0 mt-0.5">
                开启后无需真实支付渠道，订单可通过测试按钮直接完成
              </p>
            </div>
          </div>
          <Switch
            :checked="isMockMode"
            checked-children="开启"
            un-checked-children="关闭"
            @change="(checked: boolean) => toggleSwitch('mock_enabled', checked)"
          />
        </div>
      </Card>

      <!-- Alert when mock mode enabled -->
      <Alert
        v-if="isMockMode"
        type="warning"
        show-icon
        class="mb-4"
        message="当前为模拟支付模式"
        description="所有支付订单将直接模拟成功，不会产生真实扣款。上线前请关闭此开关并配置真实支付渠道。"
      />

      <!-- Payment Provider Tabs -->
      <Card :body-style="{ padding: '16px 24px' }">
        <Tabs v-model:activeKey="activeTab" type="card">
          <!-- Tianque Tab -->
          <Tabs.TabPane key="tianque">
            <template #tab>
              <div class="flex items-center gap-2">
                <Badge
                  :status="tianqueConfigured ? 'success' : 'default'"
                />
                随行付聚合支付
                <Tag v-if="tianqueConfigured" color="green" class="ml-1 mr-0" style="margin-right: 0">
                  已配置
                </Tag>
              </div>
            </template>

            <Alert
              type="info"
              show-icon
              class="mb-5"
              message="推荐使用随行付聚合支付"
              description="随行付同时支持微信、支付宝、云闪付等多种收款方式，配置一次即可覆盖所有渠道。配置后无需再单独配置微信/支付宝直连。"
            />

            <Form layout="vertical" class="max-w-xl">
              <div class="grid grid-cols-2 gap-x-4">
                <Form.Item label="机构号 (orgId)" class="mb-4">
                  <Input
                    :value="getSettingValue('tianque_org_id')"
                    placeholder="如: 83751222"
                    :maxlength="10"
                    @update:value="(v: string) => setSettingValue('tianque_org_id', v)"
                  >
                    <template #suffix>
                      <Tooltip title="8位或10位纯数字，联系随行付获取">
                        <InfoCircleOutlined class="text-gray-300" />
                      </Tooltip>
                    </template>
                  </Input>
                </Form.Item>
                <Form.Item label="商户号 (mno)" class="mb-4">
                  <Input
                    :value="getSettingValue('tianque_mno')"
                    placeholder="如: 399230316322124"
                    :maxlength="15"
                    @update:value="(v: string) => setSettingValue('tianque_mno', v)"
                  >
                    <template #suffix>
                      <Tooltip title="399开头的15位纯数字">
                        <InfoCircleOutlined class="text-gray-300" />
                      </Tooltip>
                    </template>
                  </Input>
                </Form.Item>
              </div>

              <Form.Item label="商户私钥" class="mb-4">
                <Input.TextArea
                  :value="getSettingValue('tianque_private_key')"
                  placeholder="PKCS8格式RSA私钥内容（不含 BEGIN/END 头尾）"
                  :rows="4"
                  @update:value="(v: string) => setSettingValue('tianque_private_key', v)"
                />
                <p class="text-xs text-gray-400 mt-1 mb-0">
                  PKCS8格式，PEM头应为 <code>-----BEGIN PRIVATE KEY-----</code>（不含RSA字样）
                </p>
              </Form.Item>

              <Form.Item label="接口环境" class="mb-4">
                <Radio.Group
                  :value="getSettingValue('tianque_base_url')"
                  @change="(e: any) => setSettingValue('tianque_base_url', e.target.value)"
                >
                  <Radio.Button value="https://openapi-test.tianquetech.com">
                    <span class="flex items-center gap-1">
                      测试环境
                    </span>
                  </Radio.Button>
                  <Radio.Button value="https://openapi.tianquetech.com">
                    <span class="flex items-center gap-1">
                      生产环境
                    </span>
                  </Radio.Button>
                </Radio.Group>
                <Tag
                  :color="tianqueEnv === 'production' ? 'red' : 'cyan'"
                  class="ml-3"
                >
                  {{ tianqueEnv === 'production' ? '正式' : '测试' }}
                </Tag>
              </Form.Item>

              <Form.Item label="异步通知地址 (notifyUrl)" class="mb-4">
                <Input
                  :value="getSettingValue('tianque_notify_url')"
                  placeholder="https://your-domain.com/api/v1/payment/tianque/notify"
                  @update:value="(v: string) => setSettingValue('tianque_notify_url', v)"
                >
                  <template #suffix>
                    <Tooltip title="部署后需改为公网可访问地址">
                      <InfoCircleOutlined class="text-gray-300" />
                    </Tooltip>
                  </template>
                </Input>
              </Form.Item>

              <!-- Config status summary -->
              <div
                class="rounded-lg p-3 mt-2"
                :class="tianqueConfigured ? 'bg-green-50' : 'bg-gray-50'"
              >
                <div class="flex items-center gap-2 text-sm">
                  <CheckCircleOutlined
                    v-if="tianqueConfigured"
                    class="text-green-500"
                  />
                  <CloseCircleOutlined v-else class="text-gray-300" />
                  <span :class="tianqueConfigured ? 'text-green-700' : 'text-gray-500'">
                    {{
                      tianqueConfigured
                        ? '配置完整，关闭模拟模式即可生效'
                        : '请填写机构号、商户号和私钥以完成配置'
                    }}
                  </span>
                </div>
              </div>
            </Form>
          </Tabs.TabPane>

          <!-- Wechat Tab -->
          <Tabs.TabPane key="wechat">
            <template #tab>
              <div class="flex items-center gap-2">
                <Badge
                  :status="wechatConfigured ? 'success' : 'default'"
                />
                微信支付
                <Tag v-if="wechatConfigured" color="green" class="ml-1" style="margin-right: 0">
                  已配置
                </Tag>
              </div>
            </template>

            <Alert
              v-if="tianqueConfigured"
              type="info"
              show-icon
              class="mb-5"
              message="已配置随行付聚合支付"
              description="随行付已覆盖微信支付能力，无需再单独配置微信直连。如需使用微信直连，请先清除随行付配置。"
            />

            <Form layout="vertical" class="max-w-xl">
              <div class="grid grid-cols-2 gap-x-4">
                <Form.Item label="AppID" class="mb-4">
                  <Input
                    :value="getSettingValue('wechat_app_id')"
                    placeholder="wx..."
                    @update:value="(v: string) => setSettingValue('wechat_app_id', v)"
                  />
                </Form.Item>
                <Form.Item label="商户号 (MchID)" class="mb-4">
                  <Input
                    :value="getSettingValue('wechat_mch_id')"
                    placeholder="10位数字商户号"
                    @update:value="(v: string) => setSettingValue('wechat_mch_id', v)"
                  />
                </Form.Item>
              </div>

              <Form.Item label="API V3 密钥" class="mb-4">
                <Input.Password
                  :value="getSettingValue('wechat_api_key_v3')"
                  placeholder="32位密钥"
                  @update:value="(v: string) => setSettingValue('wechat_api_key_v3', v)"
                />
              </Form.Item>

              <Form.Item label="证书序列号" class="mb-4">
                <Input
                  :value="getSettingValue('wechat_serial_no')"
                  placeholder="商户API证书序列号"
                  @update:value="(v: string) => setSettingValue('wechat_serial_no', v)"
                />
              </Form.Item>

              <Form.Item label="异步通知地址" class="mb-4">
                <Input
                  :value="getSettingValue('wechat_notify_url')"
                  placeholder="https://your-domain.com/api/v1/payment/wechat/notify"
                  @update:value="(v: string) => setSettingValue('wechat_notify_url', v)"
                />
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <!-- Alipay Tab -->
          <Tabs.TabPane key="alipay">
            <template #tab>
              <div class="flex items-center gap-2">
                <Badge
                  :status="alipayConfigured ? 'success' : 'default'"
                />
                支付宝
                <Tag v-if="alipayConfigured" color="green" class="ml-1" style="margin-right: 0">
                  已配置
                </Tag>
              </div>
            </template>

            <Alert
              v-if="tianqueConfigured"
              type="info"
              show-icon
              class="mb-5"
              message="已配置随行付聚合支付"
              description="随行付已覆盖支付宝能力，无需再单独配置支付宝直连。如需使用支付宝直连，请先清除随行付配置。"
            />

            <Form layout="vertical" class="max-w-xl">
              <Form.Item label="AppID" class="mb-4">
                <Input
                  :value="getSettingValue('alipay_app_id')"
                  placeholder="支付宝应用 ID"
                  @update:value="(v: string) => setSettingValue('alipay_app_id', v)"
                />
              </Form.Item>

              <Form.Item label="应用私钥" class="mb-4">
                <Input.Password
                  :value="getSettingValue('alipay_private_key')"
                  placeholder="RSA2 应用私钥"
                  @update:value="(v: string) => setSettingValue('alipay_private_key', v)"
                />
              </Form.Item>

              <Form.Item label="支付宝公钥" class="mb-4">
                <Input.Password
                  :value="getSettingValue('alipay_public_key')"
                  placeholder="支付宝公钥（用于验签）"
                  @update:value="(v: string) => setSettingValue('alipay_public_key', v)"
                />
              </Form.Item>

              <Form.Item label="异步通知地址" class="mb-4">
                <Input
                  :value="getSettingValue('alipay_notify_url')"
                  placeholder="https://your-domain.com/api/v1/payment/alipay/notify"
                  @update:value="(v: string) => setSettingValue('alipay_notify_url', v)"
                />
              </Form.Item>

              <Form.Item label="沙箱模式" class="mb-4">
                <div class="flex items-center gap-3">
                  <Switch
                    :checked="getSettingValue('alipay_sandbox') === 'true'"
                    checked-children="开启"
                    un-checked-children="关闭"
                    @change="(checked: boolean) => toggleSwitch('alipay_sandbox', checked)"
                  />
                  <span class="text-xs text-gray-400">
                    开启后使用沙箱环境进行测试
                  </span>
                </div>
              </Form.Item>
            </Form>
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </Spin>
  </div>
</template>
