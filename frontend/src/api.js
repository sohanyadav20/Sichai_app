import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export const getFarmers = () => api.get("/farmers").then((r) => r.data);
export const addFarmerApi = (name, phone) =>
  api.post("/farmers", { name, phone }).then((r) => r.data);
export const deleteFarmerApi = (id) => api.delete(`/farmers/${id}`);
export const getFarmerByPhone = (phone) =>
  api.get(`/farmers/by-phone/${phone}`).then((r) => r.data);

export const getEntries = (farmerId) =>
  api.get(`/farmers/${farmerId}/entries`).then((r) => r.data);
export const addEntryApi = (farmerId, data) =>
  api.post(`/farmers/${farmerId}/entries`, data).then((r) => r.data);
export const deleteEntryApi = (id) => api.delete(`/entries/${id}`);

export const getPayments = (farmerId) =>
  api.get(`/farmers/${farmerId}/payments`).then((r) => r.data);
export const addPaymentApi = (farmerId, amount) =>
  api.post(`/farmers/${farmerId}/payments`, { amount }).then((r) => r.data);
export const deletePaymentApi = (id) => api.delete(`/payments/${id}`);

export const getSummary = (farmerId) =>
  api.get(`/farmers/${farmerId}/summary`).then((r) => r.data);

export default api;
