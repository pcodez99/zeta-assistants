import axios from 'axios';

// In-memory access token cache
let _accessToken: string | null = null;
const authListeners = new Set<() => void>();
export const subscribeAuth = (listener: () => void) => {
  authListeners.add(listener);
  return () => { authListeners.delete(listener); };
};

export const setAccessToken = (token: string | null) => {
  _accessToken = token;
  authListeners.forEach(listener => listener());
};

export const getAccessToken = () => _accessToken;

// Setup base Axios instance
export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach accessToken
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor: automatically refresh token on 401
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use((response) => response, async (error) => {
  const originalRequest = error.config;

  if (error.response?.status === 401 && !originalRequest._retry) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('refreshToken');
    const sessionId = localStorage.getItem('sessionId');

    if (!refreshToken || !sessionId) {
      isRefreshing = false;
      processQueue(error, null);
      // Clear storage and redirect
      for (const key of ['refreshToken', 'sessionId', 'name', 'username']) localStorage.removeItem(key);
      setAccessToken(null);
      window.dispatchEvent(new Event('auth-expired'));
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post('/api/auth/refresh', {
        refresh: refreshToken,
        sessionId,
      });

      const newAccessToken = data.accessToken;
      const newRefreshToken = data.refreshToken;

      setAccessToken(newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      isRefreshing = false;
      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      isRefreshing = false;
      processQueue(refreshError, null);
      for (const key of ['refreshToken', 'sessionId', 'name', 'username']) localStorage.removeItem(key);
      setAccessToken(null);
      window.dispatchEvent(new Event('auth-expired'));
      return Promise.reject(refreshError);
    }
  }

  return Promise.reject(error);
});
