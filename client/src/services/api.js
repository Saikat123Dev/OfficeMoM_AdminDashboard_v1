import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
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
  deleteUser: (id) => api.delete(`/users/${id}`)
};

export const faqsService = {
  getFaqs: (params) => api.get('/faqs', { params }),
  createFaq: (data) => api.post('/faqs', data),
  updateFaq: (id, data) => api.put(`/faqs/${id}`, data),
  deleteFaq: (id) => api.delete(`/faqs/${id}`)
};

export const pricingService = {
  getPlans: () => api.get('/pricing'),
  createPlan: (data) => api.post('/pricing', data),
  updatePlan: (id, data) => api.put(`/pricing/${id}`, data),
  deletePlan: (id) => api.delete(`/pricing/${id}`)
};

export default api;
