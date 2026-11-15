import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: automatically attach JWT token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle unauthorized/token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is invalid or expired
      if (typeof window !== 'undefined' && localStorage.getItem('token')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH API ====================
export const authApi = {
  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
      if (res.data.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
    }
    return res.data;
  },

  register: async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
      if (res.data.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
    }
    return res.data;
  },

  getProfile: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  getToken: () => localStorage.getItem('token'),
};

// ==================== TRANSACTIONS API ====================
export const transactionApi = {
  getAll: async (params = {}) => {
    const res = await api.get('/transactions', { params });
    return res.data;
  },

  create: async (transactionData) => {
    const res = await api.post('/transactions', transactionData);
    return res.data;
  },

  update: async (id, transactionData) => {
    const res = await api.put(`/transactions/${id}`, transactionData);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/transactions/${id}`);
    return res.data;
  },

  getAnalytics: async (params = {}) => {
    const res = await api.get('/transactions/analytics', { params });
    return res.data;
  },
};

// ==================== INVOICES API ====================
export const invoiceApi = {
  getAll: async (params = {}) => {
    const res = await api.get('/invoices', { params });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/invoices/${id}`);
    return res.data;
  },

  create: async (invoiceData) => {
    const res = await api.post('/invoices', invoiceData);
    return res.data;
  },

  update: async (id, invoiceData) => {
    const res = await api.put(`/invoices/${id}`, invoiceData);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/invoices/${id}`);
    return res.data;
  },
};

// ==================== EXPORT API ====================
export const exportApi = {
  downloadCSV: async (params = {}) => {
    const res = await api.get('/export/csv', {
      params,
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'expenses-report.csv');
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  downloadPDF: async (params = {}) => {
    const res = await api.get('/export/pdf', {
      params,
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'financial-report.pdf');
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

// Helper for health check
export const checkHealth = async () => {
  const res = await api.get('/health');
  return res.data;
};

export default api;
