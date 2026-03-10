import axios from "axios";
import { io } from "socket.io-client";

const BASE_URL = process.env.REACT_APP_API_URL || "https://parksmart-backend-f01j.onrender.com";

export const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ps_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  err => { if (err.response?.status === 401) { localStorage.removeItem("ps_token"); window.location.reload(); } return Promise.reject(err); }
);

let socketInstance = null;
export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(BASE_URL, { transports: ["websocket","polling"], reconnection: true, reconnectionAttempts: 10 });
  }
  return socketInstance;
}

export const authApi = {
  register: (d) => api.post("/api/auth/register", d).then(r => r.data),
  login: (d) => api.post("/api/auth/login", d).then(r => r.data),
  me: () => api.get("/api/auth/me").then(r => r.data),
  update: (d) => api.put("/api/auth/me", d).then(r => r.data),
};
export const spotsApi = {
  getAll: (p) => api.get("/api/spots", { params: p }).then(r => r.data),
};
export const bookingsApi = {
  create: (d) => api.post("/api/bookings", d).then(r => r.data),
  mine: () => api.get("/api/bookings/me").then(r => r.data),
  cancel: (id) => api.delete(`/api/bookings/${id}`).then(r => r.data),
};
export const paymentsApi = {
  stkPush: (d) => api.post("/api/payments/mpesa/stkpush", d).then(r => r.data),
};
export const providerApi = {
  register: (d) => api.post("/api/provider/register", d).then(r => r.data),
  getMe: () => api.get("/api/provider/me").then(r => r.data),
  addSpot: (d) => api.post("/api/provider/spots", d).then(r => r.data),
  getSpots: () => api.get("/api/provider/spots").then(r => r.data),
  getDashboard: () => api.get("/api/provider/dashboard").then(r => r.data),
};
export const walletApi = {
  get: () => api.get("/api/wallet").then(r => r.data),
  topUp: (d) => api.post("/api/wallet/topup", d).then(r => r.data),
  deduct: (d) => api.post("/api/wallet/deduct", d).then(r => r.data),
  refund: (d) => api.post("/api/wallet/refund", d).then(r => r.data),
};
  getDashboard: () => api.get("/api/admin/dashboard").then(r => r.data),
  approveSpot: (id, approved) => api.put(`/api/admin/spots/${id}/approve`, { approved }).then(r => r.data),
};
