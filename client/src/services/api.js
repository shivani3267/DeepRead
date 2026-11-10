import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for clear error extraction
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const customMessage =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      'An unexpected error occurred. Please try again.';
    return Promise.reject(new Error(customMessage));
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const documentAPI = {
  list: (params) => api.get('/documents', { params }),
  get: (id) => api.get(`/documents/${id}`),
  upload: (formData) =>
    api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadVersion: (id, formData) =>
    api.post(`/documents/${id}/versions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getVersions: (id) => api.get(`/documents/${id}/versions`),
  publish: (id, versionId) => api.patch(`/documents/${id}/publish`, { versionId }),
  retire: (id) => api.patch(`/documents/${id}/retire`),
  getFileUrl: (id, versionId) => `/api/documents/${id}/file${versionId ? `?versionId=${versionId}` : ''}`,
};

export const chatAPI = {
  ask: (data) => api.post('/chat', data),
  getConversations: () => api.get('/chat/conversations'),
  getConversation: (id) => api.get(`/chat/conversations/${id}`),
  deleteConversation: (id) => api.delete(`/chat/conversations/${id}`),
};

export const feedbackAPI = {
  submit: (data) => api.post('/feedback', data),
};

export const adminAPI = {
  createFaculty: (data) => api.post('/admin/faculty', data),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserStatus: (id, isActive) => api.patch(`/admin/users/${id}/status`, { isActive }),
  getAnalytics: () => api.get('/admin/analytics'),
};

export default api;
