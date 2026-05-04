<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import {
  Button,
  Card,
  Divider,
  Form,
  Input,
  message,
  Select,
  Spin,
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
const selectedDriver = ref('local');

async function fetchSettings() {
  loading.value = true;
  try {
    const res: any = await getSettingsByGroup('storage');
    settings.value = res.data ?? res ?? [];
    const driverItem = settings.value.find((s) => s.key === 'driver');
    if (driverItem) {
      selectedDriver.value = driverItem.value || 'local';
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
    await updateSettingsByGroup(
      'storage',
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
    settings.value.push({ key, value: val, label: key, type: 'text', remark: '' });
  }
}

function onDriverChange(v: string) {
  selectedDriver.value = v;
  setVal('driver', v);
}

onMounted(fetchSettings);
</script>

<template>
  <div class="p-5">
    <Card title="存储设置">
      <template #extra>
        <Button type="primary" :loading="saving" @click="handleSave">
          保存配置
        </Button>
      </template>

      <Spin :spinning="loading">
        <Form layout="vertical" class="max-w-2xl">
          <Form.Item label="存储驱动">
            <Select
              :value="selectedDriver"
              @change="onDriverChange"
            >
              <Select.Option value="local">本地存储</Select.Option>
              <Select.Option value="oss">阿里云 OSS</Select.Option>
              <Select.Option value="cos">腾讯云 COS</Select.Option>
              <Select.Option value="r2">Cloudflare R2</Select.Option>
            </Select>
          </Form.Item>

          <!-- Local -->
          <template v-if="selectedDriver === 'local'">
            <Divider>本地存储</Divider>
            <Form.Item label="存储目录">
              <Input
                :value="getVal('local_dir')"
                placeholder="./uploads"
                @update:value="(v: string) => setVal('local_dir', v)"
              />
            </Form.Item>
            <Form.Item label="访问域名">
              <Input
                :value="getVal('local_domain')"
                placeholder="http://localhost:8080"
                @update:value="(v: string) => setVal('local_domain', v)"
              />
            </Form.Item>
          </template>

          <!-- OSS -->
          <template v-if="selectedDriver === 'oss'">
            <Divider>阿里云 OSS</Divider>
            <Form.Item label="Endpoint">
              <Input
                :value="getVal('oss_endpoint')"
                placeholder="oss-cn-hangzhou.aliyuncs.com"
                @update:value="(v: string) => setVal('oss_endpoint', v)"
              />
            </Form.Item>
            <Form.Item label="Bucket">
              <Input
                :value="getVal('oss_bucket')"
                placeholder="bucket-name"
                @update:value="(v: string) => setVal('oss_bucket', v)"
              />
            </Form.Item>
            <Form.Item label="AccessKey ID">
              <Input
                :value="getVal('oss_access_key_id')"
                @update:value="
                  (v: string) => setVal('oss_access_key_id', v)
                "
              />
            </Form.Item>
            <Form.Item label="AccessKey Secret">
              <Input.Password
                :value="getVal('oss_access_key_secret')"
                @update:value="
                  (v: string) => setVal('oss_access_key_secret', v)
                "
              />
            </Form.Item>
            <Form.Item label="自定义域名">
              <Input
                :value="getVal('oss_domain')"
                placeholder="https://cdn.example.com"
                @update:value="(v: string) => setVal('oss_domain', v)"
              />
            </Form.Item>
          </template>

          <!-- COS -->
          <template v-if="selectedDriver === 'cos'">
            <Divider>腾讯云 COS</Divider>
            <Form.Item label="Region">
              <Input
                :value="getVal('cos_region')"
                placeholder="ap-guangzhou"
                @update:value="(v: string) => setVal('cos_region', v)"
              />
            </Form.Item>
            <Form.Item label="Bucket">
              <Input
                :value="getVal('cos_bucket')"
                placeholder="bucket-name"
                @update:value="(v: string) => setVal('cos_bucket', v)"
              />
            </Form.Item>
            <Form.Item label="SecretId">
              <Input
                :value="getVal('cos_secret_id')"
                @update:value="(v: string) => setVal('cos_secret_id', v)"
              />
            </Form.Item>
            <Form.Item label="SecretKey">
              <Input.Password
                :value="getVal('cos_secret_key')"
                @update:value="(v: string) => setVal('cos_secret_key', v)"
              />
            </Form.Item>
            <Form.Item label="自定义域名">
              <Input
                :value="getVal('cos_domain')"
                placeholder="https://cdn.example.com"
                @update:value="(v: string) => setVal('cos_domain', v)"
              />
            </Form.Item>
          </template>

          <!-- R2 -->
          <template v-if="selectedDriver === 'r2'">
            <Divider>Cloudflare R2</Divider>
            <Form.Item label="Account ID">
              <Input
                :value="getVal('r2_account_id')"
                @update:value="(v: string) => setVal('r2_account_id', v)"
              />
            </Form.Item>
            <Form.Item label="Bucket">
              <Input
                :value="getVal('r2_bucket')"
                @update:value="(v: string) => setVal('r2_bucket', v)"
              />
            </Form.Item>
            <Form.Item label="Access Key ID">
              <Input
                :value="getVal('r2_access_key_id')"
                @update:value="
                  (v: string) => setVal('r2_access_key_id', v)
                "
              />
            </Form.Item>
            <Form.Item label="Secret Access Key">
              <Input.Password
                :value="getVal('r2_secret_access_key')"
                @update:value="
                  (v: string) => setVal('r2_secret_access_key', v)
                "
              />
            </Form.Item>
            <Form.Item label="自定义域名">
              <Input
                :value="getVal('r2_domain')"
                placeholder="https://files.example.com"
                @update:value="(v: string) => setVal('r2_domain', v)"
              />
            </Form.Item>
          </template>
        </Form>
      </Spin>
    </Card>
  </div>
</template>
