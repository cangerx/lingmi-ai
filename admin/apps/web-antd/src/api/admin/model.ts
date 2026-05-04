import { requestClient } from '#/api/request';

export function getModelList(params?: Record<string, any>) {
  return requestClient.get('/admin/models', { params });
}

export function createModel(data: Record<string, any>) {
  return requestClient.post('/admin/models', data);
}

export function updateModel(id: number, data: Record<string, any>) {
  return requestClient.put(`/admin/models/${id}`, data);
}

export function deleteModel(id: number) {
  return requestClient.delete(`/admin/models/${id}`);
}

export function probeModel(modelName: string) {
  return requestClient.post('/admin/models/probe', { model_name: modelName });
}

export function getUnlinkedModels() {
  return requestClient.get('/admin/models/unlinked');
}

export function seedImageModels() {
  return requestClient.post('/admin/models/seed-image');
}

export function getModelConfig(name: string) {
  return requestClient.get(`/admin/models/config/${name}`);
}

export function updateModelConfig(name: string, data: any[]) {
  return requestClient.put(`/admin/models/config/${name}`, data);
}
