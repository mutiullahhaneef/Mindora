import axios from 'axios';

// Base API URL pointing to the FastAPI backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
});

// Interceptor for attaching auth tokens (once we implement full auth)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('mindora-token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Error handling interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle global API errors (e.g., 401 Unauthorized)
    if (error.response?.status === 401) {
      // Clear invalid/expired token and redirect to login
      const token = localStorage.getItem('mindora-token');
      if (token) {
        localStorage.removeItem('mindora-token');
        // Reload to trigger AuthPage — avoid infinite loops by checking token existed
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);
