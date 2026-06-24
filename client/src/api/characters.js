import api from './apiClient';

export const fetchCharacters = async (params = {}) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    filter = 'All',
    rank = 'All',
    sort = 'name',
  } = params;
  const queryParams = new URLSearchParams();
  queryParams.set('page', page);
  queryParams.set('limit', limit);
  queryParams.set('search', search);
  queryParams.set('filter', filter);
  queryParams.set('rank', rank);
  queryParams.set('sort', sort);

  const response = await api.get(`/api/characters?${queryParams.toString()}`);
  return response.data;
};

export const fetchCharacterById = async (id) => {
  if (!id) return null;
  const response = await api.get(`/api/characters/${id}`);
  return response.data?.character || null;
};

export const createCharacter = async (formData) => {
  const response = await api.post('/api/characters', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateCharacter = async (id, formData) => {
  const response = await api.put(`/api/characters/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const fetchUserCharacters = async (userId) => {
  if (!userId) return [];
  const response = await api.get(`/api/characters/user/${userId}`);
  return response.data?.characters || [];
};
