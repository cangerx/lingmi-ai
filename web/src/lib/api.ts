import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        // Dispatch custom event; LoginModal listens and opens
        window.dispatchEvent(new Event("auth:unauthorized"));
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; nickname: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  sendCode: (data: { phone: string }) => api.post("/auth/send-code", data),
  phoneLogin: (data: { phone: string; code: string; invite_code?: string }) =>
    api.post("/auth/phone-login", data),
  oauthLogin: (data: { provider: string; code: string }) =>
    api.post("/auth/oauth", data),
  getProfile: () => api.get("/auth/profile"),
  refreshToken: () => api.post("/auth/refresh"),
};

// User API
export const userAPI = {
  getCredits: () => api.get("/user/credits"),
  getCreditLogs: () => api.get("/user/credit-logs"),
  getUsageStats: () => api.get("/user/usage-stats"),
  updateProfile: (data: { nickname?: string; avatar?: string }) =>
    api.put("/user/profile", data),
  changePassword: (data: { old_password: string; new_password: string }) =>
    api.put("/user/password", data),
};

// Package API (public)
export const packageAPI = {
  list: () => api.get("/packages"),
};

// Order API
export const orderAPI = {
  list: () => api.get("/orders"),
  create: (data: { package_id?: number; type: string; payment_method: string; amount?: number; credits?: number }) =>
    api.post("/orders", data),
  get: (id: number) => api.get(`/orders/${id}`),
  payStatus: (orderNo: string) => api.get(`/order-status/${orderNo}`),
  mockPay: (orderNo: string) => api.post(`/payment/mock-pay/${orderNo}`),
};

// Redeem API
export const redeemAPI = {
  redeem: (code: string) => api.post("/redeem", { code }),
};

// Notification API (public)
export const notificationAPI = {
  list: () => api.get("/notifications"),
};

// Ad API (public)
export const adAPI = {
  list: (slot?: string) => api.get("/ads", { params: slot ? { slot } : {} }),
};

// App modules API (public)
export const appAPI = {
  modules: () => api.get("/app/modules"),
  loginMethods: () => api.get("/app/login-methods"),
  siteConfig: () => api.get("/app/site-config"),
};

// Model API (public)
export const modelAPI = {
  list: (type?: string) => api.get("/models", { params: type ? { type } : {} }),
  imageModels: () => api.get("/models/image-models"),
};

// Chat API
export const chatAPI = {
  listConversations: () => api.get("/conversations"),
  createConversation: (data: { title?: string; model: string }) =>
    api.post("/conversations", data),
  getConversation: (id: number) => api.get(`/conversations/${id}`),
  updateConversation: (id: number, data: { title?: string; pinned?: boolean }) =>
    api.put(`/conversations/${id}`, data),
  deleteConversation: (id: number) => api.delete(`/conversations/${id}`),
  sendMessage: (id: number, data: { content: string; model?: string }) =>
    api.post(`/conversations/${id}/messages`, data),
};

// Upload API
export const uploadAPI = {
  upload: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 });
  },
};

// Image AI API
export const imageAPI = {
  // AI 商品图
  productPhoto: (data: FormData) =>
    api.post("/image/product-photo", data, { headers: { "Content-Type": "multipart/form-data" }, timeout: 120000 }),
  // 智能抠图
  cutout: (data: FormData) =>
    api.post("/image/cutout", data, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 }),
  // AI 消除
  eraser: (data: FormData) =>
    api.post("/image/eraser", data, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 }),
  // AI 扩图
  expand: (data: FormData) =>
    api.post("/image/expand", data, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 }),
  // 变清晰
  upscale: (data: FormData) =>
    api.post("/image/upscale", data, { headers: { "Content-Type": "multipart/form-data" }, timeout: 120000 }),
  // AI 海报
  poster: (data: { prompt: string; category?: string; size?: string; model?: string; quality?: string; resolution?: string }) =>
    api.post("/image/poster", data, { timeout: 120000 }),
  // 图片生成（通用文生图）
  generate: (data: { prompt: string; model?: string; size?: string; n?: number; quality?: string; resolution?: string; ratio?: string }) =>
    api.post("/image/generate", data, { timeout: 120000 }),
  // 优化提示词
  optimizePrompt: (prompt: string) =>
    api.post<{ optimized_prompt: string }>("/image/optimize-prompt", { prompt }, { timeout: 30000 }),
};

// Generation status API (polling)
export const generationAPI = {
  get: (id: number) => api.get(`/generations/${id}`),
  list: (params?: { page?: number; page_size?: number; type?: string; status?: string }) =>
    api.get("/generations", { params }),
  delete: (id: number) => api.delete(`/generations/${id}`),
};

// Space API (user asset space)
export const spaceAPI = {
  quota: () => api.get("/space/quota"),
  listFolders: () => api.get("/space/folders"),
  createFolder: (name: string) => api.post("/space/folders", { name }),
  renameFolder: (id: number, name: string) => api.put(`/space/folders/${id}`, { name }),
  deleteFolder: (id: number) => api.delete(`/space/folders/${id}`),
  listFiles: (params?: { folder_id?: string; page?: number; page_size?: number }) =>
    api.get("/space/files", { params }),
  uploadFile: (file: File, folderId?: number) => {
    const fd = new FormData();
    fd.append("file", file);
    if (folderId) fd.append("folder_id", String(folderId));
    return api.post("/space/files", fd, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 });
  },
  moveFile: (id: number, folderId: number | null) => api.put(`/space/files/${id}`, { folder_id: folderId || 0 }),
  renameFile: (id: number, name: string) => api.put(`/space/files/${id}`, { name }),
  deleteFile: (id: number) => api.delete(`/space/files/${id}`),
};

// Video API
export const videoAPI = {
  generate: (data: { prompt: string; mode: string; duration: string; ratio: string; image?: string }) =>
    api.post("/video/generate", data, { timeout: 180000 }),
  generateFromImage: (data: FormData) =>
    api.post("/video/generate-from-image", data, { headers: { "Content-Type": "multipart/form-data" }, timeout: 180000 }),
};

// Referral API
export const referralAPI = {
  stats: () => api.get("/referral/stats"),
  commissions: () => api.get("/referral/commissions"),
  invitees: () => api.get("/referral/invitees"),
};

// Inspiration API
export const inspirationAPI = {
  list: (params?: { tag?: string; page?: number; page_size?: number }) =>
    api.get("/inspirations", { params }),
  tags: () => api.get("/inspirations/tags"),
  publish: (data: { generation_id: number; title?: string; description?: string; tag?: string }) =>
    api.post("/inspirations/publish", data),
};

// Template API
export const templateAPI = {
  list: (params?: {
    page?: number; page_size?: number;
    category?: string; scene?: string; usage?: string;
    industry?: string; style?: string; color?: string;
    layout?: string; search?: string; sort_by?: string;
  }) => api.get("/templates", { params }),
  filters: () => api.get("/templates/filters"),
};
