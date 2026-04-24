import { apiClient } from './client';
import type { RecordModel } from '../types';

// The backend now stores targetPrice in thousands.
const parseRecord = (record: any): RecordModel => ({
  ...record,
  targetPrice: record.targetPrice !== null && record.targetPrice !== undefined ? Number(record.targetPrice) : 0,
});

export const recordsApi = {
  getAll: async () => {
    const { data } = await apiClient.get<any[]>('/records');
    return data.map(parseRecord);
  },
  getOne: async (id: string) => {
    const { data } = await apiClient.get<any>(`/records/${id}`);
    return parseRecord(data);
  },
  create: async (payload: Omit<RecordModel, 'id' | 'triggeredState' | 'profile'>) => {
    const { data } = await apiClient.post<any>('/records', payload);
    return parseRecord(data);
  },
  update: async (id: string, payload: Partial<RecordModel>) => {
    const { data } = await apiClient.patch<any>(`/records/${id}`, payload);
    return parseRecord(data);
  },
  delete: async (id: string) => {
    await apiClient.delete(`/records/${id}`);
  },
  bulkUpdateByProfile: async (profileId: string, payload: Partial<RecordModel> & { toggleOffset?: number }) => {
    const { data } = await apiClient.patch<any[]>(`/records/profile/${profileId}/bulk`, payload);
    return data.map(parseRecord);
  },
};
