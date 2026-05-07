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
  Spin,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  CheckCircleOutlined,
  CloudOutlined,
  CloseCircleOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  HddOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons-vue';

import { getSettingsByGroup, updateSettingsByGroup } from '#/api/admin';

interface SettingItem {
  key: string;
  value: string;
  label: string;
  type: string;
  remark: string;
}

interface DriverOption {
  key: string;
  name: string;
  description: string;
  icon: any;
  color: string;
}

const drivers: DriverOption[] = [
  { key: 'local', name: '本地存储', description: '文件存储在服务器本地磁盘', icon: HddOutlined, color: '#52c41a' },
  { key: 'oss', name: '阿里云 OSS', description: '对象存储，适合国内业务', icon: CloudOutlined, color: '#ff6a00' },
  { key: 'cos', name: '腾讯云 COS', description: '对象存储，适合国内业务', icon: CloudOutlined, color: '#006eff' },
  { key: 'r2', name: 'Cloudflare R2', description: '零出口费用，适合全球业务', icon: GlobalOutlined, color: '#f48120' },
];

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
    message.success('存储配置已保存');
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
    settings.value.push({ key, value: val, label: key, type: 'text', remark: '' });
  }
}

function selectDriver(key: string) {
  selectedDriver.value = key;
  setVal('driver', key);
}

// Config status per driver
const currentDriverConfigured = computed(() => {
  const d = selectedDriver.value;
  if (d === 'local') return !!getVal('local_dir') || !!getVal('local_domain');
  if (d === 'oss') return !!getVal('oss_endpoint') && !!getVal('oss_bucket') && !!getVal('oss_access_key_id');
  if (d === 'cos') return !!getVal('cos_region') && !!getVal('cos_bucket') && !!getVal('cos_secret_id');
  if (d === 'r2') return !!getVal('r2_account_id') && !!getVal('r2_bucket') && !!getVal('r2_access_key_id');
  return false;
});

const currentDriverInfo = computed(() => drivers.find((d) => d.key === selectedDriver.value));

onMounted(fetchSettings);
</script>

<template>
  <div class="p-5">
    <Spin :spinning="loading">
      <!-- Status Overview -->
      <Card class="mb-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <DatabaseOutlined
              class="text-2xl"
              :class="currentDriverConfigured ? 'text-green-500' : 'text-gray-300'"
            />
            <div>
              <h3 class="text-base font-semibold m-0">存储配置</h3>
              <div class="flex items-center gap-2 mt-1">
                <Tag :color="currentDriverConfigured ? 'green' : 'default'">
                  {{ currentDriverInfo?.name || '未选择' }}
                </Tag>
                <Tag v-if="currentDriverConfigured" color="green">
                  <CheckCircleOutlined /> 已配置
                </Tag>
                <Tag v-else color="orange">
                  待配置
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

      <!-- Driver Selection Cards -->
      <Card class="mb-4" size="small">
        <template #title>
          <div class="flex items-center gap-2">
            <CloudOutlined class="text-blue-500" />
            <span>选择存储驱动</span>
          </div>
        </template>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div
            v-for="driver in drivers"
            :key="driver.key"
            class="relative rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md"
            :class="
              selectedDriver === driver.key
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : 'border-gray-100 hover:border-gray-200 bg-white'
            "
            @click="selectDriver(driver.key)"
          >
            <div class="flex flex-col items-center text-center gap-2">
              <component :is="driver.icon" class="text-xl" :style="{ color: driver.color }" />
              <span
                class="text-sm font-medium"
                :class="selectedDriver === driver.key ? 'text-blue-700' : 'text-gray-700'"
              >
                {{ driver.name }}
              </span>
              <span class="text-[11px] text-gray-400 leading-tight">
                {{ driver.description }}
              </span>
            </div>
            <!-- Selected indicator -->
            <div
              v-if="selectedDriver === driver.key"
              class="absolute top-2 right-2"
            >
              <Badge status="processing" />
            </div>
          </div>
        </div>
      </Card>

      <!-- Driver Config -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <component :is="currentDriverInfo?.icon" :style="{ color: currentDriverInfo?.color, fontSize: '16px' }" />
            <span>{{ currentDriverInfo?.name }} 配置</span>
          </div>
        </template>

        <!-- Local -->
        <template v-if="selectedDriver === 'local'">
          <Alert
            type="info"
            show-icon
            class="mb-5"
            message="本地存储适合开发和小型部署"
            description="文件直接保存在服务器磁盘，通过指定域名提供访问。生产环境建议使用云存储以获得更好的可靠性和 CDN 加速。"
          />

          <Form layout="vertical" class="max-w-xl">
            <Form.Item class="mb-4">
              <template #label>
                <span>存储目录</span>
                <Tooltip title="上传文件保存的本地路径，相对于项目根目录">
                  <InfoCircleOutlined class="ml-1 text-gray-300" />
                </Tooltip>
              </template>
              <Input
                :value="getVal('local_dir')"
                placeholder="./uploads"
                @update:value="(v: string) => setVal('local_dir', v)"
              >
                <template #suffix>
                  <CheckCircleOutlined v-if="getVal('local_dir')" class="text-green-400" />
                </template>
              </Input>
            </Form.Item>

            <Form.Item class="mb-4">
              <template #label>
                <span>访问域名</span>
                <Tooltip title="文件通过该域名提供公开访问，拼接路径后形成完整 URL">
                  <InfoCircleOutlined class="ml-1 text-gray-300" />
                </Tooltip>
              </template>
              <Input
                :value="getVal('local_domain')"
                placeholder="http://localhost:8080"
                @update:value="(v: string) => setVal('local_domain', v)"
              >
                <template #suffix>
                  <CheckCircleOutlined v-if="getVal('local_domain')" class="text-green-400" />
                </template>
              </Input>
              <p class="text-xs text-gray-400 mt-1 mb-0">
                示例: 文件将通过 <code>{{ getVal('local_domain') || 'http://localhost:8080' }}/uploads/xxx.jpg</code> 访问
              </p>
            </Form.Item>
          </Form>
        </template>

        <!-- OSS -->
        <template v-if="selectedDriver === 'oss'">
          <Alert
            type="info"
            show-icon
            class="mb-5"
            message="阿里云 OSS 对象存储"
            description="高可靠、低成本的云存储服务，适合国内业务。建议绑定 CDN 自定义域名以加速访问。"
          />

          <Form layout="vertical" class="max-w-xl">
            <div class="grid grid-cols-2 gap-x-4">
              <Form.Item class="mb-4">
                <template #label>
                  <span>Endpoint</span>
                  <Tooltip title="OSS 服务接入地址，如 oss-cn-hangzhou.aliyuncs.com">
                    <InfoCircleOutlined class="ml-1 text-gray-300" />
                  </Tooltip>
                </template>
                <Input
                  :value="getVal('oss_endpoint')"
                  placeholder="oss-cn-hangzhou.aliyuncs.com"
                  @update:value="(v: string) => setVal('oss_endpoint', v)"
                />
              </Form.Item>

              <Form.Item class="mb-4">
                <template #label>
                  <span>Bucket</span>
                  <Tooltip title="存储桶名称">
                    <InfoCircleOutlined class="ml-1 text-gray-300" />
                  </Tooltip>
                </template>
                <Input
                  :value="getVal('oss_bucket')"
                  placeholder="my-bucket"
                  @update:value="(v: string) => setVal('oss_bucket', v)"
                />
              </Form.Item>
            </div>

            <div class="grid grid-cols-2 gap-x-4">
              <Form.Item class="mb-4">
                <template #label>
                  <span>AccessKey ID</span>
                </template>
                <Input
                  :value="getVal('oss_access_key_id')"
                  placeholder="LTAI..."
                  @update:value="(v: string) => setVal('oss_access_key_id', v)"
                />
              </Form.Item>

              <Form.Item class="mb-4">
                <template #label>
                  <span>AccessKey Secret</span>
                </template>
                <Input.Password
                  :value="getVal('oss_access_key_secret')"
                  placeholder="密钥"
                  @update:value="(v: string) => setVal('oss_access_key_secret', v)"
                />
              </Form.Item>
            </div>

            <Form.Item class="mb-4">
              <template #label>
                <span>自定义域名 (CDN)</span>
                <Tooltip title="绑定 CDN 加速域名后，文件将通过该域名访问">
                  <InfoCircleOutlined class="ml-1 text-gray-300" />
                </Tooltip>
              </template>
              <Input
                :value="getVal('oss_domain')"
                placeholder="https://cdn.example.com"
                @update:value="(v: string) => setVal('oss_domain', v)"
              />
              <p class="text-xs text-gray-400 mt-1 mb-0">可选，不填则使用 OSS 默认域名</p>
            </Form.Item>
          </Form>
        </template>

        <!-- COS -->
        <template v-if="selectedDriver === 'cos'">
          <Alert
            type="info"
            show-icon
            class="mb-5"
            message="腾讯云 COS 对象存储"
            description="腾讯云对象存储服务，与腾讯云 CDN 深度集成，适合微信生态和国内业务。"
          />

          <Form layout="vertical" class="max-w-xl">
            <div class="grid grid-cols-2 gap-x-4">
              <Form.Item class="mb-4">
                <template #label>
                  <span>Region</span>
                  <Tooltip title="存储桶所在地域，如 ap-guangzhou">
                    <InfoCircleOutlined class="ml-1 text-gray-300" />
                  </Tooltip>
                </template>
                <Input
                  :value="getVal('cos_region')"
                  placeholder="ap-guangzhou"
                  @update:value="(v: string) => setVal('cos_region', v)"
                />
              </Form.Item>

              <Form.Item class="mb-4">
                <template #label>
                  <span>Bucket</span>
                  <Tooltip title="存储桶名称（含 AppID 后缀）">
                    <InfoCircleOutlined class="ml-1 text-gray-300" />
                  </Tooltip>
                </template>
                <Input
                  :value="getVal('cos_bucket')"
                  placeholder="bucket-1250000000"
                  @update:value="(v: string) => setVal('cos_bucket', v)"
                />
              </Form.Item>
            </div>

            <div class="grid grid-cols-2 gap-x-4">
              <Form.Item class="mb-4">
                <template #label>
                  <span>SecretId</span>
                </template>
                <Input
                  :value="getVal('cos_secret_id')"
                  placeholder="AKIDxxxxxxxx"
                  @update:value="(v: string) => setVal('cos_secret_id', v)"
                />
              </Form.Item>

              <Form.Item class="mb-4">
                <template #label>
                  <span>SecretKey</span>
                </template>
                <Input.Password
                  :value="getVal('cos_secret_key')"
                  placeholder="密钥"
                  @update:value="(v: string) => setVal('cos_secret_key', v)"
                />
              </Form.Item>
            </div>

            <Form.Item class="mb-4">
              <template #label>
                <span>自定义域名 (CDN)</span>
                <Tooltip title="绑定自定义加速域名">
                  <InfoCircleOutlined class="ml-1 text-gray-300" />
                </Tooltip>
              </template>
              <Input
                :value="getVal('cos_domain')"
                placeholder="https://cdn.example.com"
                @update:value="(v: string) => setVal('cos_domain', v)"
              />
              <p class="text-xs text-gray-400 mt-1 mb-0">可选，不填则使用 COS 默认域名</p>
            </Form.Item>
          </Form>
        </template>

        <!-- R2 -->
        <template v-if="selectedDriver === 'r2'">
          <Alert
            type="info"
            show-icon
            class="mb-5"
            message="Cloudflare R2 对象存储"
            description="零出口带宽费用、S3 兼容 API、全球边缘缓存。适合面向全球用户的业务，性价比极高。"
          />

          <Form layout="vertical" class="max-w-xl">
            <Form.Item class="mb-4">
              <template #label>
                <span>Account ID</span>
                <Tooltip title="Cloudflare 账户 ID，在 Dashboard 右侧可找到">
                  <InfoCircleOutlined class="ml-1 text-gray-300" />
                </Tooltip>
              </template>
              <Input
                :value="getVal('r2_account_id')"
                placeholder="32位字符串"
                @update:value="(v: string) => setVal('r2_account_id', v)"
              />
            </Form.Item>

            <div class="grid grid-cols-2 gap-x-4">
              <Form.Item class="mb-4">
                <template #label>
                  <span>Bucket</span>
                </template>
                <Input
                  :value="getVal('r2_bucket')"
                  placeholder="my-bucket"
                  @update:value="(v: string) => setVal('r2_bucket', v)"
                />
              </Form.Item>

              <Form.Item class="mb-4">
                <template #label>
                  <span>Access Key ID</span>
                </template>
                <Input
                  :value="getVal('r2_access_key_id')"
                  @update:value="(v: string) => setVal('r2_access_key_id', v)"
                />
              </Form.Item>
            </div>

            <Form.Item class="mb-4">
              <template #label>
                <span>Secret Access Key</span>
              </template>
              <Input.Password
                :value="getVal('r2_secret_access_key')"
                placeholder="密钥"
                @update:value="(v: string) => setVal('r2_secret_access_key', v)"
              />
            </Form.Item>

            <Form.Item class="mb-4">
              <template #label>
                <span>公开访问域名</span>
                <Tooltip title="R2 自定义域名或 Workers 域名，用于公开访问文件">
                  <InfoCircleOutlined class="ml-1 text-gray-300" />
                </Tooltip>
              </template>
              <Input
                :value="getVal('r2_domain')"
                placeholder="https://files.example.com"
                @update:value="(v: string) => setVal('r2_domain', v)"
              />
              <p class="text-xs text-gray-400 mt-1 mb-0">在 R2 设置中绑定自定义域名或启用 r2.dev 子域名</p>
            </Form.Item>
          </Form>
        </template>

        <!-- Config Status -->
        <div
          class="rounded-lg p-3 mt-4"
          :class="currentDriverConfigured ? 'bg-green-50' : 'bg-orange-50'"
        >
          <div class="flex items-center gap-2 text-sm">
            <CheckCircleOutlined v-if="currentDriverConfigured" class="text-green-500" />
            <CloseCircleOutlined v-else class="text-orange-400" />
            <span :class="currentDriverConfigured ? 'text-green-700' : 'text-orange-600'">
              {{
                currentDriverConfigured
                  ? `${currentDriverInfo?.name} 配置完成`
                  : `请填写 ${currentDriverInfo?.name} 必要参数`
              }}
            </span>
          </div>
        </div>
      </Card>
    </Spin>
  </div>
</template>
