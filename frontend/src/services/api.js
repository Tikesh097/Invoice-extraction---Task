import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // 2 min for large uploads
});

api.interceptors.response.use(
  res => res.data,
  err => {
    const message = err.response?.data?.error || err.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

// Upload
export const uploadInvoices = (files, onProgress) => {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress?.(Math.round((e.loaded * 100) / e.total)),
  });
};

export const retryExtraction = (invoiceId) => api.post(`/upload/retry/${invoiceId}`);

// Invoices
export const getInvoices = (params) => api.get('/invoices', { params });
export const getInvoice = (id) => api.get(`/invoices/${id}`);
export const updateInvoice = (id, data) => api.put(`/invoices/${id}`, data);
export const deleteInvoice = (id) => api.delete(`/invoices/${id}`);

// Analytics
export const getAnalyticsSummary = (params) => api.get('/analytics/summary', { params });
export const getVendorSpend = (params) => api.get('/analytics/vendor-spend', { params });
export const getMonthlyTrends = (params) => api.get('/analytics/monthly-trends', { params });
export const getCurrencyTotals = () => api.get('/analytics/currency-totals');
export const getConfidenceDistribution = () => api.get('/analytics/confidence');

// Formats
export const getFormats = () => api.get('/formats');
export const deleteFormat = (id) => api.delete(`/formats/${id}`);

export default api;
