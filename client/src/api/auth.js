import api, { API_URL } from './apiClient';

export { API_URL };

export const login = (email, password) => {
  return api.post('/api/login', { email, password });
};

export const register = (email, password) => {
  return api.post('/api/register', { email, password });
};

export const saveAuthToken = (token) => {
  localStorage.setItem('authToken', token);
};

export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

export const clearAuthToken = () => {
  localStorage.removeItem('authToken');
};

export const getUserProfile = () => {
  return api.get('/api/profile');
};

export const updateUserProfile = (formData) => {
  return api.put('/api/profile', formData);
};
