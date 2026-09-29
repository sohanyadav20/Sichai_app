import axios from 'axios';

// Local development (npm run dev) me proxy (/api) use hoga.
// Production build me seedha Render backend ka URL use hoga.
const baseURL = import.meta.env.DEV ? '/api' : 'https://sichai-app.onrender.com/api';

const api = axios.create({ baseURL });

// ---- Admin login / token ----
export const AUTH_KEY = 'adminAuth';

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

// Token expire ho jaye (401) to session saaf karke login page par bhejo
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const isLogin = (err.config?.url || '').includes('/admin/login');
    if (err.response?.status === 401 && !isLogin && sessionStorage.getItem(AUTH_KEY)) {
      sessionStorage.removeItem(AUTH_KEY);
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export const adminLogin = (username, password) =>
  api.post('/admin/login', { username, password }).then((r) => r.data);

export const getAdminUsers = () => api.get('/admin/users').then((r) => r.data);
export const addAdminUserApi = (username, password) =>
  api.post('/admin/users', { username, password }).then((r) => r.data);
export const resetAdminPasswordApi = (id, password) =>
  api.post(`/admin/users/${id}/reset-password`, { password }).then((r) => r.data);
export const deleteAdminUserApi = (id) => api.delete(`/admin/users/${id}`);
export const changePasswordApi = (oldPassword, newPassword) =>
  api.post('/admin/change-password', { oldPassword, newPassword }).then((r) => r.data);

// ---- Farmers ----
export const getFarmers = () => api.get('/farmers').then((r) => r.data);
export const addFarmerApi = (name, phone) => api.post('/farmers', { name, phone }).then((r) => r.data);
export const updateFarmerApi = (id, name, phone) =>
  api.put(`/farmers/${id}`, { name, phone }).then((r) => r.data);
export const deleteFarmerApi = (id) => api.delete(`/farmers/${id}`);
export const getFarmerByPhone = (phone) => api.get(`/farmers/by-phone/${phone}`).then((r) => r.data);

// ---- Entries ----
export const getEntries = (farmerId) => api.get(`/farmers/${farmerId}/entries`).then((r) => r.data);
export const addEntryApi = (farmerId, data) =>
  api.post(`/farmers/${farmerId}/entries`, data).then((r) => r.data);
export const updateEntryApi = (entryId, data) =>
  api.put(`/entries/${entryId}`, data).then((r) => r.data);
export const deleteEntryApi = (id) => api.delete(`/entries/${id}`);

// ---- Payments ----
export const getPayments = (farmerId) => api.get(`/farmers/${farmerId}/payments`).then((r) => r.data);
export const addPaymentApi = (farmerId, amount) =>
  api.post(`/farmers/${farmerId}/payments`, { amount }).then((r) => r.data);
export const deletePaymentApi = (id) => api.delete(`/payments/${id}`);

// ---- Summary / Dashboard / Reports ----
export const getSummary = (farmerId) => api.get(`/farmers/${farmerId}/summary`).then((r) => r.data);
export const getDashboard = () => api.get('/dashboard').then((r) => r.data);
export const getReportSummary = (year) =>
  api.get('/reports/summary', { params: year ? { year } : {} }).then((r) => r.data);

// ---- Rate history ----
export const getRates = () => api.get('/rates').then((r) => r.data);
export const addRateApi = (data) => api.post('/rates', data).then((r) => r.data);
export const deleteRateApi = (id) => api.delete(`/rates/${id}`);

// ---- Backup / Export (file download) ----
export const downloadFile = async (path, filename) => {
  const res = await api.get(path, { responseType: 'blob' });
  const url = window.URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export default api;
