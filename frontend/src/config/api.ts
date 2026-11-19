import axios from 'axios';
import React from 'react';
import { toast } from 'sonner';
import { firebaseAuth } from './firebase';
import useUIStore from '@store/uiStore';
import { RateLimitCountdownToast, PayloadTooLargeToast } from './RateLimitToast';

export { RateLimitCountdownToast, PayloadTooLargeToast };

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '/api' : 'http://localhost:5000/api');

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
  (error) => Promise.reject(error)
);

// Response Interceptor for HTTP 429 and HTTP 413
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      const data = error.response.data;
      const retryAfterSeconds =
        typeof data?.retryAfterSeconds === 'number'
          ? data.retryAfterSeconds
          : error.response.headers?.['retry-after']
          ? parseInt(error.response.headers['retry-after'], 10)
          : 60;
      const message =
        data?.error || 'Too many submissions. Please wait before retrying.';

      toast.custom(
        (t) => React.createElement(RateLimitCountdownToast, {
          initialSeconds: retryAfterSeconds,
          message,
          toastId: t,
        }),
        { id: 'rate-limit-toast', duration: (retryAfterSeconds + 1) * 1000 }
      );
    } else if (error.response?.status === 413) {
      const serverMsg =
        error.response.data?.error?.message ||
        error.response.data?.userMessage ||
        'Payload Too Large: Uploaded file exceeds the limit.';

      toast.custom(
        (t) => React.createElement(PayloadTooLargeToast, {
          serverMsg,
          toastId: t,
        }),
        { id: 'payload-too-large-toast', duration: 7000 }
      );
    } else if (error.response?.status === 401) {
      // Invalidate session, purge local storage, notify user and redirect to login
      useUIStore.getState().setAuthUser(null);
      localStorage.removeItem('aicity_user');
      localStorage.removeItem('aicity_dev_token');
      toast.error('Session expired or unauthorized. Please re-authenticate.', {
        id: 'session-expired-toast',
      });
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
