import { apiClient } from './client';

export interface GamificationProfile {
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  daily_goal_progress: number;
  daily_goal_target: number;
  xp_to_next_level: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  category: string;
  earned: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  user_name: string;
  total_xp: number;
  level: number;
  streak: number;
}

export interface XPEvent {
  action_type: string;
  xp_amount: number;
  description?: string;
}

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  type: string;
  created_at: string;
}

// All backend responses are wrapped: { success, data: <T>, message }
export const gamificationApi = {
  getProfile: async (): Promise<GamificationProfile> => {
    const res = await apiClient.get('/gamify/profile');
    return res.data?.data;
  },

  awardXP: async (event: XPEvent) => {
    const res = await apiClient.post('/gamify/xp', event);
    return res.data?.data;
  },

  getBadges: async (): Promise<Badge[]> => {
    const res = await apiClient.get('/gamify/badges');
    const payload = res.data?.data;
    return Array.isArray(payload) ? payload : [];
  },

  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    const res = await apiClient.get('/gamify/leaderboard');
    const payload = res.data?.data;
    return Array.isArray(payload) ? payload : [];
  },

  getStreak: async () => {
    const res = await apiClient.get('/gamify/streak');
    return res.data?.data;
  },

  getNotifications: async (): Promise<InAppNotification[]> => {
    const res = await apiClient.get('/gamify/notifications');
    const payload = res.data?.data;
    return Array.isArray(payload) ? payload : [];
  },

  markNotificationRead: async (id: string): Promise<void> => {
    await apiClient.post(`/gamify/notifications/${id}/read`);
  },
};
