import { apiClient } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;       // backend uses `name`, not `full_name`
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;          // backend returns `user_id` → mapped here
  email: string;
  full_name: string;   // UI uses `full_name`, backend sends `name`
  avatar_url?: string;
}

export const authApi = {
  register: async (data: RegisterRequest): Promise<UserProfile> => {
    // Backend sends: { success, data: { user_id, email, name }, message }
    const res = await apiClient.post('/auth/register', data);
    const u = res.data?.data;
    return { id: u?.user_id, email: u?.email, full_name: u?.name };
  },

  login: async (data: LoginRequest): Promise<TokenResponse> => {
    // Backend sends: { success, data: { access_token, refresh_token, token_type }, message }
    const res = await apiClient.post('/auth/login', data);
    const tokenData: TokenResponse = res.data?.data;
    if (tokenData?.access_token) {
      localStorage.setItem('mindora-token', tokenData.access_token);
    }
    return tokenData;
  },

  getMe: async (): Promise<UserProfile> => {
    // Backend sends: { success, data: { user_id, email, name }, message }
    const res = await apiClient.get('/auth/me');
    const u = res.data?.data;
    return { id: u?.user_id, email: u?.email, full_name: u?.name, avatar_url: u?.avatar_url };
  },

  uploadAvatar: async (file: File): Promise<UserProfile> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.put('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const u = res.data?.data;
    return { id: u?.user_id ?? u?.id, email: u?.email, full_name: u?.name ?? u?.full_name, avatar_url: u?.avatar_url };
  },

  updateProfile: async (info: { full_name: string; email: string }): Promise<UserProfile> => {
    // Map full_name → name for backend
    const res = await apiClient.put('/auth/profile', { name: info.full_name, email: info.email });
    const u = res.data?.data;
    return { id: u?.user_id ?? u?.id, email: u?.email, full_name: u?.name ?? u?.full_name, avatar_url: u?.avatar_url };
  },

  logout: () => {
    localStorage.removeItem('mindora-token');
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('mindora-token');
  },
};
