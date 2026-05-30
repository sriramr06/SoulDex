import api from './apiClient';

export const fetchCharacters = async (params = {}) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    filter = 'All',
    rank = 'All',
  } = params;
  const queryParams = new URLSearchParams();
  queryParams.set('page', page);
  queryParams.set('limit', limit);
  queryParams.set('search', search);
  queryParams.set('filter', filter);
  queryParams.set('rank', rank);

  const response = await api.get(`/api/characters?${queryParams.toString()}`);
  return response.data;
};

export const fetchCharacterById = async (id) => {
  if (!id) return null;
  const response = await api.get(`/api/characters/${id}`);
  return response.data?.character || null;
};
