import api from './client';
import type { Study, Card, Category, Session, SimilarityResult, ClusteringResult } from '../types';

// Auth
export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password }).then((r) => r.data);

export const logout = () => api.post('/auth/logout').then((r) => r.data);

export const getMe = () => api.get('/auth/me').then((r) => r.data);

// Studies
export const getStudies = (): Promise<Study[]> => api.get('/studies').then((r) => r.data);

export const getStudy = (id: number): Promise<Study> =>
  api.get(`/studies/${id}`).then((r) => r.data);

export const createStudy = (data: Partial<Study>): Promise<Study> =>
  api.post('/studies', data).then((r) => r.data);

export const updateStudy = (id: number, data: Partial<Study>): Promise<Study> =>
  api.put(`/studies/${id}`, data).then((r) => r.data);

export const deleteStudy = (id: number) =>
  api.delete(`/studies/${id}`).then((r) => r.data);

export const publishStudy = (id: number): Promise<Study> =>
  api.post(`/studies/${id}/publish`).then((r) => r.data);

export const closeStudy = (id: number): Promise<Study> =>
  api.post(`/studies/${id}/close`).then((r) => r.data);

// Cards
export const getCards = (studyId: number): Promise<Card[]> =>
  api.get(`/studies/${studyId}/cards`).then((r) => r.data);

export const createCard = (studyId: number, data: { name: string; description?: string }): Promise<Card> =>
  api.post(`/studies/${studyId}/cards`, data).then((r) => r.data);

export const updateCard = (studyId: number, cardId: number, data: Partial<Card>): Promise<Card> =>
  api.put(`/studies/${studyId}/cards/${cardId}`, data).then((r) => r.data);

export const deleteCard = (studyId: number, cardId: number) =>
  api.delete(`/studies/${studyId}/cards/${cardId}`).then((r) => r.data);

export const bulkUploadCards = (studyId: number, file: File): Promise<Card[]> => {
  const form = new FormData();
  form.append('file', file);
  // Clear the default 'application/json' header so axios detects FormData and
  // sets 'multipart/form-data; boundary=...' automatically, which multer needs.
  return api.post(`/studies/${studyId}/cards/bulk`, form, {
    headers: { 'Content-Type': undefined },
  }).then((r) => r.data);
};

// Categories
export const getCategories = (studyId: number): Promise<Category[]> =>
  api.get(`/studies/${studyId}/categories`).then((r) => r.data);

export const createCategory = (studyId: number, label: string): Promise<Category> =>
  api.post(`/studies/${studyId}/categories`, { label }).then((r) => r.data);

export const updateCategory = (studyId: number, catId: number, label: string): Promise<Category> =>
  api.put(`/studies/${studyId}/categories/${catId}`, { label }).then((r) => r.data);

export const deleteCategory = (studyId: number, catId: number) =>
  api.delete(`/studies/${studyId}/categories/${catId}`).then((r) => r.data);

// Results
export const getResultsSummary = (studyId: number): Promise<{ sessions: Session[] }> =>
  api.get(`/studies/${studyId}/results/summary`).then((r) => r.data);

export const getSimilarity = (studyId: number): Promise<SimilarityResult> =>
  api.get(`/studies/${studyId}/results/similarity`).then((r) => r.data);

export const getClustering = (studyId: number): Promise<ClusteringResult> =>
  api.get(`/studies/${studyId}/results/clustering`).then((r) => r.data);

export const setSessionExclusion = (studyId: number, sessionId: number, excluded: boolean) =>
  api.patch(`/studies/${studyId}/results/sessions/${sessionId}`, { excluded }).then((r) => r.data);

export const exportJson = (studyId: number) => {
  window.open(`/api/studies/${studyId}/results/export/json`, '_blank');
};

export const exportExcel = (studyId: number) => {
  window.open(`/api/studies/${studyId}/results/export/excel`, '_blank');
};
