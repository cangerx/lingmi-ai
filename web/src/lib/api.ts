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
        window.location.href = "/login";
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
  getProfile: () => api.get("/auth/profile"),
  refreshToken: () => api.post("/auth/refresh"),
};

// User API
export const userAPI = {
  getCredits: () => api.get("/user/credits"),
  getCreditLogs: () => api.get("/user/credit-logs"),
  updateProfile: (data: { nickname?: string; avatar?: string }) =>
    api.put("/user/profile", data),
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
  poster: (data: { prompt: string; category?: string; size?: string }) =>
    api.post("/image/poster", data, { timeout: 120000 }),
  // 图片生成（通用文生图）
  generate: (data: { prompt: string; model?: string; size?: string; n?: number }) =>
    api.post("/image/generate", data, { timeout: 120000 }),
};

// Project API
export const projectAPI = {
  list: (params?: { page?: number; page_size?: number }) =>
    api.get("/projects", { params }),
  get: (id: number) => api.get(`/projects/${id}`),
  create: (data: { name: string; type: string }) =>
    api.post("/projects", data),
  delete: (id: number) => api.delete(`/projects/${id}`),
};

// Template API
export const templateAPI = {
  list: (params?: { category?: string; page?: number; page_size?: number }) =>
    api.get("/templates", { params }),
  get: (id: number) => api.get(`/templates/${id}`),
};

// Inspiration API
export const inspirationAPI = {
  list: (params?: { tag?: string; page?: number; page_size?: number }) =>
    api.get("/inspirations", { params }),
};
