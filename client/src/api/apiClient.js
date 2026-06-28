import axios from 'axios';
import { 
  getAuthToken, 
  getRefreshToken, 
  saveAuthToken, 
  clearAuthToken, 
  clearRefreshToken 
} from './tokenStorage';
import { showToast } from '../utils/toastService';

export const API_URL = import.meta.env.VITE_API_URL || 'https://souldex.onrender.com';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60s to survive Render cold starts
});

// Attach auth token automatically when present
api.interceptors.request.use(
  (config) => {
    try {
      const token = getAuthToken();
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // token storage error silently handled
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: retry transient network errors and handle auth failures
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};

    // If no response (network error), attempt a few retries
    if (!error.response) {
      // show network error toast
      try {
        showToast('Network error. Please check your connection and try again.', 'error');
      } catch {}
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount >= 2) return Promise.reject(error);
      config.__retryCount += 1;
      const delay = 200 * Math.pow(2, config.__retryCount);
      await new Promise((res) => setTimeout(res, delay));
      return api(config);
    }

    const status = error.response.status;

    // Too many requests -> respect Retry-After when present
    if (status === 429) {
      try {
        showToast('Too many requests. Please slow down and try again shortly.', 'warn');
      } catch {}
      config.__retryCount429 = config.__retryCount429 || 0;
      if (config.__retryCount429 >= 2) {
        return Promise.reject(error);
      }
      config.__retryCount429 += 1;
      const retryAfter = parseInt(error.response.headers['retry-after']) || 1;
      await new Promise((res) => setTimeout(res, retryAfter * 1000));
      return api(config);
    }

    // Unauthorized: do not attempt token refresh for auth endpoints
    if (status === 401) {
      const requestUrl = config.url || '';
      const isAuthEndpoint =
        requestUrl.includes('/api/login') ||
        requestUrl.includes('/api/register') ||
        requestUrl.includes('/api/refresh');

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      // avoid retrying refresh loop
      if (config.__isRetryRequest) return Promise.reject(error);
      config.__isRetryRequest = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          clearAuthToken();
          if (typeof window !== 'undefined') window.location.href = '/login';
          return Promise.reject(error);
        }

        // Call refresh endpoint directly with a short timeout
        const refreshRes = await axios.post(
          `${API_URL}/api/refresh`,
          { refreshToken },
          { timeout: 10000 },
        );

        if (refreshRes?.data?.token) {
          saveAuthToken(refreshRes.data.token);
          // retry original request with new token
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${refreshRes.data.token}`;
          return api(config);
        }

        // Refresh failed: clear tokens and redirect
        clearRefreshToken();
        clearAuthToken();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(error);
      } catch {
        console.debug('Token refresh failed');
        try {
          clearAuthToken();
          clearRefreshToken();
        } catch {
          // ignore
        }
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // Try to extract a friendly server message and show toast
    try {
      const data = error.response?.data;
      let message = 'Server error';
      if (!data) message = `Error ${status}`;
      else if (data?.errors && Array.isArray(data.errors)) {
        message = data.errors.map((e) => e.message || e).join(' - ');
      } else if (typeof data === 'string') message = data;
      else if (data?.message) message = data.message;
      showToast(message, 'error');
    } catch (e) {
      /* ignore toast failures */
    }

    return Promise.reject(error);
  },
);
export default api;
