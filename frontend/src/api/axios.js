import axios from 'axios';

// Base URL of the Django REST Framework API (e.g. https://campus-connect.onrender.com/api)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// While the backend is under development the services fall back to sample data.
export const USE_API = import.meta.env.VITE_USE_API === 'true';

const TOKEN_KEY = 'cc_access_token';
const REFRESH_KEY = 'cc_refresh_token';

export const tokenStorage = {
  get access() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY);
  },
  set({ access, refresh }, remember = true) {
    const store = remember ? localStorage : sessionStorage;
    if (access) store.setItem(TOKEN_KEY, access);
    if (refresh) store.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    [localStorage, sessionStorage].forEach((s) => {
      s.removeItem(TOKEN_KEY);
      s.removeItem(REFRESH_KEY);
    });
  },
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the JWT access token (djangorestframework-simplejwt) to every request.
api.interceptors.request.use((config) => {
  const token = tokenStorage.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Transparently refresh an expired access token once, then retry the request.
let refreshPromise = null;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && tokenStorage.refresh && !original._retry) {
      original._retry = true;
      try {
        refreshPromise =
          refreshPromise ||
          axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh: tokenStorage.refresh });
        const { data } = await refreshPromise;
        tokenStorage.set({ access: data.access }, !!localStorage.getItem(REFRESH_KEY));
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch (refreshError) {
        tokenStorage.clear();
        return Promise.reject(refreshError);
      } finally {
        refreshPromise = null;
      }
    }
    return Promise.reject(error);
  }
);

// Normalises DRF error payloads into a readable message.
export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  const data = error?.response?.data;
  if (!data) return error?.message || fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  const first = Object.values(data)[0];
  return Array.isArray(first) ? first[0] : fallback;
};

export default api;
