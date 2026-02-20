import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
export const DB_TARGET_STORAGE_KEY = 'admin_db_target';
export const DB_TARGETS = Object.freeze({
  TEST: 'test',
  PRODUCTION: 'production'
});
export const DB_TARGET_HEADER = 'X-DB-Target';

export const normalizeDbTarget = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === DB_TARGETS.PRODUCTION ? DB_TARGETS.PRODUCTION : DB_TARGETS.TEST;
};

export const getDbTarget = () => {
  if (typeof window === 'undefined') return DB_TARGETS.TEST;
  return normalizeDbTarget(localStorage.getItem(DB_TARGET_STORAGE_KEY));
};

export const setDbTarget = (target) => {
  const normalized = normalizeDbTarget(target);
  if (typeof window !== 'undefined') {
    localStorage.setItem(DB_TARGET_STORAGE_KEY, normalized);
  }
  return normalized;
};

const api = axios.create({
  baseURL: API_BASE_URL,
});

const withDbTarget = (config = {}, dbTarget) => {
  if (!dbTarget) return config;

  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      [DB_TARGET_HEADER]: normalizeDbTarget(dbTarget),
    },
  };
};

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  config.headers = config.headers || {};
  const explicitDbTarget = config.headers[DB_TARGET_HEADER] || config.headers[DB_TARGET_HEADER.toLowerCase()];
  config.headers[DB_TARGET_HEADER] = explicitDbTarget
    ? normalizeDbTarget(explicitDbTarget)
    : getDbTarget();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  verifyToken: () => api.post('/auth/verify'),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updatePassword: (data) => api.put('/auth/password', data),
  setToken: (token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }
};

export const usersService = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  getUserDetails: (id) => api.get(`/users/${id}/details`),
  getCancellationRequests: (params) => api.get('/users/cancellation-requests', { params }),
  deleteUser: (id) => api.delete(`/users/${id}`),
  getDashboardStats: () => api.get('/users/stats'),
  getRecentActivity: () => api.get('/users/recent-activity'),
  getNotifications: (params) => api.get('/users/notifications', { params }),
  markNotificationsRead: (data) => api.post('/users/notifications/read', data),
  markAllNotificationsRead: () => api.post('/users/notifications/read', { all: true })
};

export const faqsService = {
  getFaqs: (params) => api.get('/faqs', { params }),
  getOptions: () => api.get('/faqs/options'),
  createFaq: (data) => api.post('/faqs', data),
  updateFaq: (id, data) => api.put(`/faqs/${id}`, data),
  deleteFaq: (id) => api.delete(`/faqs/${id}`)
};

export const officemomDetailsService = {
  getDetails: (params) => api.get('/faqs/details', { params }),
  getDetail: (id) => api.get(`/faqs/details/${id}`),
  getOptions: () => api.get('/faqs/details/options'),
  createDetail: (data) => api.post('/faqs/details', data),
  updateDetail: (id, data) => api.put(`/faqs/details/${id}`, data),
  deleteDetail: (id) => api.delete(`/faqs/details/${id}`)
};

export const featuresService = {
  getFeatures: (params) => api.get('/faqs/features', { params }),
  getFeature: (id) => api.get(`/faqs/features/${id}`),
  getOptions: () => api.get('/faqs/features/options'),
  createFeature: (data) => api.post('/faqs/features', data),
  updateFeature: (id, data) => api.put(`/faqs/features/${id}`, data),
  deleteFeature: (id) => api.delete(`/faqs/features/${id}`)
};

export const rechargePackagesService = {
  getPackages: (params) => api.get('/faqs/recharge-packages', { params }),
  getPackage: (id) => api.get(`/faqs/recharge-packages/${id}`),
  getOptions: () => api.get('/faqs/recharge-packages/options'),
  createPackage: (data) => api.post('/faqs/recharge-packages', data),
  updatePackage: (id, data) => api.put(`/faqs/recharge-packages/${id}`, data),
  deletePackage: (id) => api.delete(`/faqs/recharge-packages/${id}`)
};

export const contactsService = {
  getContacts: (params) => api.get('/faqs/contacts', { params })
};

export const intentKeywordsService = {
  getIntentKeywords: (params) => api.get('/faqs/intent-keywords', { params }),
  getIntentKeyword: (id) => api.get(`/faqs/intent-keywords/${id}`),
  getOptions: () => api.get('/faqs/intent-keywords/options'),
  createIntentKeyword: (data) => api.post('/faqs/intent-keywords', data),
  updateIntentKeyword: (id, data) => api.put(`/faqs/intent-keywords/${id}`, data),
  deleteIntentKeyword: (id) => api.delete(`/faqs/intent-keywords/${id}`)
};

export const pricingService = {
  getPlans: () => api.get('/pricing'),
  createPlan: (data) => api.post('/pricing', data),
  updatePlan: (id, data) => api.put(`/pricing/${id}`, data),
  deletePlan: (id) => api.delete(`/pricing/${id}`)
};

export const blogService = {
  getBlogs: (params) => api.get('/blogs', { params }),
  getBlog: (id) => api.get(`/blogs/${id}`),
  createBlog: (data, options = {}) =>
    api.post('/blogs', data, withDbTarget({}, options.dbTarget)),
  updateBlog: (id, data, options = {}) =>
    api.put(`/blogs/${id}`, data, withDbTarget({}, options.dbTarget)),
  deleteBlog: (id) => api.delete(`/blogs/${id}`),
  updateStatus: (id, status, options = {}) =>
    api.patch(`/blogs/${id}/status`, { status }, withDbTarget({}, options.dbTarget)),
  getTags: () => api.get('/blogs/tags'),
  getCounts: () => api.get('/blogs/counts'),
};

export const uploadService = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 min timeout for uploads
    });
  }
};

export default api;
