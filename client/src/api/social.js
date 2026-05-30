import api from './apiClient';

// User Search & Follow
export const searchUsers = (query) => {
  return api.get(`/api/search?query=${encodeURIComponent(query)}`);
};

export const followUser = (userId) => {
  return api.post(`/api/follow/${encodeURIComponent(userId)}`);
};

// Posts
export const createPost = (formData) => {
  return api.post('/api/posts', formData);
};

export const getFeed = (page = 1, limit = 10) => {
  return api.get(
    `/api/posts/feed?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`,
  );
};

export const getUserPosts = (userId) => {
  return api.get(`/api/posts/user/${encodeURIComponent(userId)}`);
};

export const toggleLike = (postId) => {
  return api.post(`/api/posts/${encodeURIComponent(postId)}/like`);
};

export const addComment = (postId, text) => {
  return api.post(`/api/posts/${encodeURIComponent(postId)}/comments`, {
    text,
  });
};

// Messages
export const getGlobalMessages = () => {
  return api.get('/api/messages/global');
};

export const getConversation = (userId) => {
  return api.get(`/api/messages/${encodeURIComponent(userId)}`);
};
