import axios from 'axios';

// Local development (npm run dev) me proxy (/api) use hoga.
// Production build me seedha Render backend ka URL use hoga — Vercel environment
// variable pe depend nahi karna, taaki build-time env var issues na aayein.
const baseURL = import.meta.env.DEV ? '/api' : 'https://sichai-app.onrender.com/api';

const api = axios.create({ baseURL });

// ---- Admin password ----
export const adminLogin = (password) => api.post('/admin/login', { password }).then((r) => r.data);
export const setAdminKey = (key) => {
  if (key) {
    api.defaults.headers.common['x-admin-key'] = key;
  } else {
    delete api.defaults.headers.common['x-admin-key'];
  }
};

export const getFarmers = () => api.get('/farmers').then((r) => r.data);
export const addFarmerApi = (name, phone) => api.post('/farmers', { name, phone }).then((r) => r.data);
export const deleteFarmerApi = (id) => api.delete(`/farmers/${id}`);
export const getFarmerByPhone = (phone) => api.get(`/farmers/by-phone/${phone}`).then((r) => r.data);

export const getEntries = (farmerId) => api.get(`/farmers/${farmerId}/entries`).then((r) => r.data);
export const addEntryApi = (farmerId, data) =>
  api.post(`/farmers/${farmerId}/entries`, data).then((r) => r.data);
export const updateEntryApi = (entryId, data) =>
  api.put(`/entries/${entryId}`, data).then((r) => r.data);
export const deleteEntryApi = (id) => api.delete(`/entries/${id}`);

export const getPayments = (farmerId) => api.get(`/farmers/${farmerId}/payments`).then((r) => r.data);
export const addPaymentApi = (farmerId, amount) =>
  api.post(`/farmers/${farmerId}/payments`, { amount }).then((r) => r.data);
export const deletePaymentApi = (id) => api.delete(`/payments/${id}`);

export const getSummary = (farmerId) => api.get(`/farmers/${farmerId}/summary`).then((r) => r.data);
export const getDashboard = () => api.get('/dashboard').then((r) => r.data);

export default api;
