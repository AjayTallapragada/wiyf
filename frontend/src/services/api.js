import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
  timeout: 300000,
});

export async function detectIngredients(file, onUploadProgress) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/detect', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return data;
}

export const getPantry = () => api.get('/pantry').then((res) => res.data);
export const savePantry = (payload) => api.put('/pantry', payload).then((res) => res.data);
export const addIngredient = (payload) => api.post('/pantry/ingredients', payload).then((res) => res.data);
export const deleteIngredient = (id) => api.delete(`/pantry/ingredients/${id}`).then((res) => res.data);
export const getPreferences = () => api.get('/preferences').then((res) => res.data);
export const savePreferences = (payload) => api.put('/preferences', payload).then((res) => res.data);
export const generateRecipes = (payload) => api.post('/recipes/generate', payload).then((res) => res.data);
export const getFavorites = () => api.get('/favorites').then((res) => res.data);
export const saveFavorite = (recipe) => api.post('/favorites', recipe).then((res) => res.data);
export const removeFavorite = (id) => api.delete(`/favorites/${id}`).then((res) => res.data);
export const generateMealPlan = (payload) => api.post('/meal-plan/generate', payload).then((res) => res.data);
