import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GamificationState {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  dailyGoalProgress: number;
  dailyGoalTarget: number;
  badges: string[];
  recentXpEvents: { action: string; amount: number; timestamp: number }[];
  showXpPopup: { amount: number; action: string } | null;
  showLevelUp: boolean;

  // Actions
  awardXp: (amount: number, action: string) => void;
  updateStreak: () => void;
  addBadge: (badge: string) => void;
  incrementDailyGoal: () => void;
  dismissXpPopup: () => void;
  dismissLevelUp: () => void;
}

function calculateLevel(xp: number): number {
  // Formula: XP_required(level) = 50 * level^2
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

function xpForLevel(level: number): number {
  return 50 * (level - 1) * (level - 1);
}

export function xpForNextLevel(level: number): number {
  return 50 * level * level;
}

export function xpProgress(totalXp: number, level: number): number {
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForNextLevel(level);
  return ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      totalXp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      dailyGoalProgress: 0,
      dailyGoalTarget: 3,
      badges: [],
      recentXpEvents: [],
      showXpPopup: null,
      showLevelUp: false,

      awardXp: (amount: number, action: string) => {
        const state = get();
        const newXp = state.totalXp + amount;
        const newLevel = calculateLevel(newXp);
        const showLevelUp = newLevel > state.level;

        set({
          totalXp: newXp,
          level: newLevel,
          showXpPopup: { amount, action },
          showLevelUp,
          recentXpEvents: [
            { action, amount, timestamp: Date.now() },
            ...state.recentXpEvents.slice(0, 19),
          ],
        });
      },

      updateStreak: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (state.lastActivityDate === today) return;

        let newStreak = 1;
        if (state.lastActivityDate === yesterday) {
          newStreak = state.currentStreak + 1;
        }

        set({
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, state.longestStreak),
          lastActivityDate: today,
        });
      },

      addBadge: (badge: string) => {
        const state = get();
        if (!state.badges.includes(badge)) {
          set({ badges: [...state.badges, badge] });
        }
      },

      incrementDailyGoal: () => {
        set((state) => ({
          dailyGoalProgress: Math.min(state.dailyGoalProgress + 1, state.dailyGoalTarget),
        }));
      },

      dismissXpPopup: () => set({ showXpPopup: null }),
      dismissLevelUp: () => set({ showLevelUp: false }),
    }),
    {
      name: 'mindora-gamification',
    }
  )
);
