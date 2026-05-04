import { requestClient } from '#/api/request';

// --- Moderation Logs ---
export function getModerationLogs(params?: Record<string, any>) {
  return requestClient.get('/admin/moderation/logs', { params });
}

export function reviewModeration(id: number, action: 'approve' | 'reject') {
  return requestClient.put(`/admin/moderation/${id}/review`, { action });
}

export function getModerationStats() {
  return requestClient.get('/admin/moderation/stats');
}

// --- Sensitive Words ---
export function getSensitiveWords(params?: Record<string, any>) {
  return requestClient.get('/admin/moderation/words', { params });
}

export function createSensitiveWord(data: {
  word: string;
  category?: string;
  level?: string;
}) {
  return requestClient.post('/admin/moderation/words', data);
}

export function updateSensitiveWord(
  id: number,
  data: { word?: string; category?: string; level?: string; status?: string },
) {
  return requestClient.put(`/admin/moderation/words/${id}`, data);
}

export function deleteSensitiveWord(id: number) {
  return requestClient.delete(`/admin/moderation/words/${id}`);
}

export function importSensitiveWords(data: {
  text: string;
  category?: string;
  level?: string;
}) {
  return requestClient.post('/admin/moderation/words/import', data);
}
