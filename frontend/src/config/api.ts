import axios from 'axios';
import { firebaseAuth } from './firebase';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  async (config) => {
    let token = '';

    // First check Firebase currentUser token if signed in with Firebase
    if (firebaseAuth && firebaseAuth.currentUser) {
      try {
        token = await firebaseAuth.currentUser.getIdToken();
      } catch {
        // Fall through to dev token fallback
      }
    }

    // Fallback to dev token from localStorage or default role token
    if (!token) {
      token = localStorage.getItem('aicity_dev_token') || 'dev-citizen';
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
