import { getDb } from './db';
import { StreakCache } from '../models/types';

export const getStreakCache = (habitId: number): StreakCache | null => {
  const db = getDb();
  return db.getFirstSync<StreakCache>('SELECT * FROM StreakCache WHERE habit_id = ?', [habitId]) ?? null;
};

export const updateStreakCache = (streakCache: StreakCache): void => {
  const db = getDb();
  db.runSync(
    `INSERT INTO StreakCache (habit_id, current_streak, longest_streak, last_computed)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(habit_id) DO UPDATE SET
       current_streak = excluded.current_streak,
       longest_streak = excluded.longest_streak,
       last_computed  = excluded.last_computed`,
    [
      streakCache.habit_id,
      streakCache.current_streak,
      streakCache.longest_streak,
      streakCache.last_computed,
    ]
  );
};
