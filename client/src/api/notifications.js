import api from './apiClient';

export const getNotifications = () => {
  return api.get('/api/notifications');
};

export const markAsRead = (notificationId) => {
  return api.put(`/api/notifications/${encodeURIComponent(notificationId)}/read`);
};

export const markAllAsRead = () => {
  return api.put('/api/notifications/read-all');
};
