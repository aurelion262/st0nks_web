import { apiClient } from './client';
import { RecordModel } from '../types';

// The backend returns upperLimit and lowerLimit as strings because of TypeORM decimal.
// We need to parse them to numbers.
const parseRecord = (record: any): RecordModel => ({
  ...record,
  upperLimit: record.upperLimit !== null && record.upperLimit !== undefined ? Number(record.upperLimit) : null,
  lowerLimit: record.lowerLimit !== null && record.lowerLimit !== undefined ? Number(record.lowerLimit) : null,
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
  create: async (payload: Omit<RecordModel, 'id' | 'lastAlertedAt' | 'profile'>) => {
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
};
