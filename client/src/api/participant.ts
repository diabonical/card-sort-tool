import api from './client';
import type { ParticipantStudy } from '../types';

export const getStudyByToken = (token: string): Promise<ParticipantStudy> =>
  api.get(`/p/${token}`).then((r) => r.data);

export const createSession = (token: string): Promise<{ sessionId: number; participantRef: string }> =>
  api.post(`/p/${token}/session`).then((r) => r.data);

export const giveConsent = (token: string, sid: number) =>
  api.put(`/p/${token}/session/${sid}/consent`).then((r) => r.data);

export const startSession = (token: string, sid: number) =>
  api.post(`/p/${token}/session/${sid}/start`).then((r) => r.data);

export interface SortPayload {
  sorts: { cardId: number; categoryId?: number | string | null }[];
  categories: { id?: number; tempId?: string; label: string }[];
}

export const saveSortState = (token: string, sid: number, payload: SortPayload) =>
  api.put(`/p/${token}/session/${sid}/sort`, payload).then((r) => r.data);

export const submitSession = (token: string, sid: number) =>
  api.post(`/p/${token}/session/${sid}/submit`).then((r) => r.data);
