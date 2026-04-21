import axios from 'axios';

if (!import.meta.env.VITE_API_URL) {
  throw new Error('VITE_API_URL is not defined. Please set it in your .env file.');
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
