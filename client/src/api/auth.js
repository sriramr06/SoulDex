import api, { API_URL } from './apiClient';
import {
  saveAuthToken as storeAuthToken,
  saveRefreshToken as storeRefreshToken,
  getAuthToken as retrieveAuthToken,
  getRefreshToken as retrieveRefreshToken,
  clearAuthToken as removeAuthToken,
  clearRefreshToken as removeRefreshToken,
} from './tokenStorage';

export { API_URL };

export const login = (email, password) => {
  return api.post('/api/login', { email, password });
};

export const register = (email, password) => {
  return api.post('/api/register', { email, password });
};

export const saveAuthToken = (token, remember = true) => {
  storeAuthToken(token, remember);
};

export const saveRefreshToken = (token, remember = true) => {
  storeRefreshToken(token, remember);
};

export const getRefreshToken = () => {
  return retrieveRefreshToken();
};

export const clearRefreshToken = () => {
  removeRefreshToken();
};

export const getAuthToken = () => {
  return retrieveAuthToken();
};

export const clearAuthToken = () => {
  removeAuthToken();
};

export const requestPasswordReset = (email) => {
  return api.post('/api/request-password-reset', { email });
};

export const resetPassword = (token, password) => {
  return api.post('/api/reset-password', { token, password });
};

export const verifyEmail = (token) => {
  return api.get('/api/verify-email', { params: { token } });
};

export const getUserProfile = () => {
  return api.get('/api/profile');
};

export const getPublicProfile = (userId) => {
  return api.get(`/api/user/${encodeURIComponent(userId)}`);
};

export const updateUserProfile = (formData) => {
  return api.put('/api/profile', formData);
};

export const logout = (refreshToken) => {
  return api.post('/api/logout', { refreshToken });
};
