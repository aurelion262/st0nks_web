import { apiClient } from './client';
import { Profile } from '../types';

export const profilesApi = {
  getAll: async () => {
    const { data } = await apiClient.get<Profile[]>('/profiles');
    return data;
  },
  getOne: async (id: string) => {
    const { data } = await apiClient.get<Profile>(`/profiles/${id}`);
    return data;
  },
  create: async (payload: Omit<Profile, 'id' | 'records'>) => {
    const { data } = await apiClient.post<Profile>('/profiles', payload);
    return data;
  },
  update: async (id: string, payload: Partial<Profile>) => {
    const { data } = await apiClient.patch<Profile>(`/profiles/${id}`, payload);
    return data;
  },
  delete: async (id: string) => {
    await apiClient.delete(`/profiles/${id}`);
  },
};
