export type FrequencyType = 'daily' | 'weekly' | 'custom';

export interface Habit {
  id: number;
  title: string;
  color_hex: string;
  frequency_type: FrequencyType;
  frequency_days: string | null; // JSON array of ISO weekday numbers
  reminder_time: string | null;
  reminder_enabled: boolean;
  notes: string | null;
  grace_period: number;
  sort_order: number;
  created_at: number;
}

export interface HabitLog {
  id: number;
  habit_id: number;
  log_date: string; // YYYY-MM-DD
  marked_at: number;
}

export interface HabitWithStreak extends Habit {
  current_streak: number;
  longest_streak: number;
}

export interface StreakCache {
  habit_id: number;
  current_streak: number;
  longest_streak: number;
  last_computed: number;
}
