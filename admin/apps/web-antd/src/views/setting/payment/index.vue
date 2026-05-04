<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import {
  Button,
  Card,
  Divider,
  Form,
  Input,
  message,
  Spin,
  Switch,
} from 'ant-design-vue';

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

function getSettingValue(key: string): string {
  return settingsMap.value[key] ?? '';
}

function setSettingValue(key: string, val: string) {
  const idx = settings.value.findIndex((s) => s.key === key);
  if (idx >= 0) {
    settings.value[idx] = { ...settings.value[idx], value: val };
  } else {
    settings.value.push({ key, value: val, label: key, type: 'text', remark: '' });
  }
}

function toggleSwitch(key: string, checked: boolean) {
  setSettingValue(key, checked ? 'true' : 'false');
}

onMounted(fetchSettings);
</script>

<template>
  <div class="p-5">
    <Card title="支付设置">
      <template #extra>
        <Button type="primary" :loading="saving" @click="handleSave">
          保存配置
        </Button>
      </template>

      <Spin :spinning="loading">
        <Form layout="vertical" class="max-w-2xl">
          <!-- Mock mode -->
          <Form.Item label="模拟支付模式">
            <div class="flex items-center gap-3">
              <Switch
                :checked="getSettingValue('mock_enabled') === 'true'"
                checked-children="开启"
                un-checked-children="关闭"
                @change="(checked: boolean) => toggleSwitch('mock_enabled', checked)"
              />
              <span class="text-gray-400 text-sm">
                开启后使用模拟支付，无需配置真实支付渠道
              </span>
            </div>
          </Form.Item>

          <Divider>微信支付</Divider>

          <Form.Item label="微信 AppID">
            <Input
              :value="getSettingValue('wechat_app_id')"
              placeholder="wx..."
              @update:value="(v: string) => setSettingValue('wechat_app_id', v)"
            />
          </Form.Item>
          <Form.Item label="微信商户号">
            <Input
              :value="getSettingValue('wechat_mch_id')"
              placeholder="商户号"
              @update:value="(v: string) => setSettingValue('wechat_mch_id', v)"
            />
          </Form.Item>
          <Form.Item label="微信 API V3 密钥">
            <Input.Password
              :value="getSettingValue('wechat_api_key_v3')"
              placeholder="密钥"
              @update:value="
                (v: string) => setSettingValue('wechat_api_key_v3', v)
              "
            />
          </Form.Item>
          <Form.Item label="微信证书序列号">
            <Input
              :value="getSettingValue('wechat_serial_no')"
              placeholder="证书序列号"
              @update:value="
                (v: string) => setSettingValue('wechat_serial_no', v)
              "
            />
          </Form.Item>
          <Form.Item label="微信回调地址">
            <Input
              :value="getSettingValue('wechat_notify_url')"
              placeholder="https://your-domain.com/api/v1/payment/wechat/notify"
              @update:value="
                (v: string) => setSettingValue('wechat_notify_url', v)
              "
            />
          </Form.Item>

          <Divider>支付宝</Divider>

          <Form.Item label="支付宝 AppID">
            <Input
              :value="getSettingValue('alipay_app_id')"
              placeholder="支付宝应用 ID"
              @update:value="(v: string) => setSettingValue('alipay_app_id', v)"
            />
          </Form.Item>
          <Form.Item label="支付宝私钥">
            <Input.Password
              :value="getSettingValue('alipay_private_key')"
              placeholder="应用私钥"
              @update:value="
                (v: string) => setSettingValue('alipay_private_key', v)
              "
            />
          </Form.Item>
          <Form.Item label="支付宝公钥">
            <Input.Password
              :value="getSettingValue('alipay_public_key')"
              placeholder="支付宝公钥"
              @update:value="
                (v: string) => setSettingValue('alipay_public_key', v)
              "
            />
          </Form.Item>
          <Form.Item label="支付宝回调地址">
            <Input
              :value="getSettingValue('alipay_notify_url')"
              placeholder="https://your-domain.com/api/v1/payment/alipay/notify"
              @update:value="
                (v: string) => setSettingValue('alipay_notify_url', v)
              "
            />
          </Form.Item>
          <Form.Item label="支付宝沙箱模式">
            <Switch
              :checked="getSettingValue('alipay_sandbox') === 'true'"
              checked-children="开启"
              un-checked-children="关闭"
              @change="(checked: boolean) => toggleSwitch('alipay_sandbox', checked)"
            />
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  </div>
</template>
