import { requestClient } from '#/api/request';

export function getChannelList(params?: Record<string, any>) {
  return requestClient.get('/admin/channels', { params });
}

export function createChannel(data: Record<string, any>) {
  return requestClient.post('/admin/channels', data);
}

export function updateChannel(id: number, data: Record<string, any>) {
  return requestClient.put(`/admin/channels/${id}`, data);
}

export function deleteChannel(id: number) {
  return requestClient.delete(`/admin/channels/${id}`);
}

export function fetchModelsFromProvider(data: { base_url: string; api_key: string; channel_id?: number }) {
  return requestClient.post('/admin/channels/fetch-models', data);
}

export function addModelsFromChannel(data: { models: Array<{ id: string; display_name?: string; type?: string; provider?: string }> }) {
  return requestClient.post('/admin/channels/add-models', data);
}
