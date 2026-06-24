import { getDb } from './db';
import { HabitLog } from '../models/types';

export const toggleHabitLog = (habitId: number, logDate: string): boolean => {
  const db = getDb();
  const existing = db.getFirstSync<{ id: number }>(
    'SELECT id FROM HabitLog WHERE habit_id = ? AND log_date = ?',
    [habitId, logDate]
  );

  if (existing) {
    db.runSync('DELETE FROM HabitLog WHERE id = ?', [existing.id]);
    return false; // now unmarked
  } else {
    db.runSync(
      'INSERT INTO HabitLog (habit_id, log_date, marked_at) VALUES (?, ?, ?)',
      [habitId, logDate, Date.now()]
    );
    return true; // now marked
  }
};

export const getHabitLogs = (habitId: number): HabitLog[] => {
  const db = getDb();
  return db.getAllSync<HabitLog>(
    'SELECT * FROM HabitLog WHERE habit_id = ? ORDER BY log_date ASC',
    [habitId]
  );
};
