<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import {
  Button,
  Card,
  Divider,
  Form,
  Input,
  InputNumber,
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
    const res: any = await getSettingsByGroup('referral');
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
      'referral',
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
    <Card title="邀请奖励设置">
      <template #extra>
        <Button type="primary" :loading="saving" @click="handleSave">
          保存配置
        </Button>
      </template>

      <Spin :spinning="loading">
        <Form layout="vertical" class="max-w-2xl">
          <!-- Referral enabled -->
          <Form.Item label="邀请功能开关">
            <div class="flex items-center gap-3">
              <Switch
                :checked="getSettingValue('enabled') === 'true'"
                checked-children="开启"
                un-checked-children="关闭"
                @change="(checked: boolean) => toggleSwitch('enabled', checked)"
              />
              <span class="text-gray-400 text-sm">
                关闭后前端不展示邀请入口
              </span>
            </div>
          </Form.Item>

          <Divider>注册奖励</Divider>

          <Form.Item label="注册奖励积分">
            <Input
              :value="getSettingValue('registration_bonus')"
              placeholder="200"
              suffix="积分"
              @update:value="(v: string) => setSettingValue('registration_bonus', v)"
            />
            <div class="text-gray-400 text-xs mt-1">
              被邀请人成功注册后，邀请人和被邀请人各获得的积分数量
            </div>
          </Form.Item>

          <Divider>佣金设置</Divider>

          <!-- Commission enabled -->
          <Form.Item label="分佣功能开关">
            <div class="flex items-center gap-3">
              <Switch
                :checked="getSettingValue('commission_enabled') === 'true'"
                checked-children="开启"
                un-checked-children="关闭"
                @change="(checked: boolean) => toggleSwitch('commission_enabled', checked)"
              />
              <span class="text-gray-400 text-sm">
                开启后被邀请人消费时给邀请人分佣
              </span>
            </div>
          </Form.Item>

          <Form.Item label="佣金比例">
            <Input
              :value="getSettingValue('commission_rate')"
              placeholder="10"
              suffix="%"
              @update:value="(v: string) => setSettingValue('commission_rate', v)"
            />
            <div class="text-gray-400 text-xs mt-1">
              被邀请人支付金额的分佣比例，如 10 表示 10%
            </div>
          </Form.Item>

          <Form.Item label="分佣有效期">
            <Input
              :value="getSettingValue('commission_valid_days')"
              placeholder="365"
              suffix="天"
              @update:value="(v: string) => setSettingValue('commission_valid_days', v)"
            />
            <div class="text-gray-400 text-xs mt-1">
              被邀请人注册后多少天内消费可产生佣金
            </div>
          </Form.Item>

          <Divider>提现设置</Divider>

          <Form.Item label="最低提现金额">
            <Input
              :value="getSettingValue('min_withdraw_amount')"
              placeholder="10"
              suffix="元"
              @update:value="(v: string) => setSettingValue('min_withdraw_amount', v)"
            />
            <div class="text-gray-400 text-xs mt-1">
              佣金累计达到此金额后可申请提现
            </div>
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  </div>
</template>
