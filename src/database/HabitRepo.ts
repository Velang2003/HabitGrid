import { getDb } from './db';
import { Habit, HabitWithStreak } from '../models/types';

export const createHabit = (habit: Omit<Habit, 'id'>): number => {
  const db = getDb();
  const result = db.runSync(
    `INSERT INTO Habit (
      title, color_hex, frequency_type, frequency_days,
      reminder_time, reminder_enabled, notes, grace_period,
      sort_order, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      habit.title,
      habit.color_hex,
      habit.frequency_type,
      habit.frequency_days ?? null,
      habit.reminder_time ?? null,
      habit.reminder_enabled ? 1 : 0,
      habit.notes ?? null,
      habit.grace_period,
      habit.sort_order,
      habit.created_at,
    ]
  );
  return result.lastInsertRowId;
};

export const updateHabit = (id: number, updates: Partial<Omit<Habit, 'id'>>): void => {
  const db = getDb();
  const fields = Object.keys(updates);
  if (fields.length === 0) return;

  const values = Object.entries(updates).map(([key, val]) => {
    if (key === 'reminder_enabled' && typeof val === 'boolean') return val ? 1 : 0;
    return val ?? null;
  });

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  db.runSync(`UPDATE Habit SET ${setClause} WHERE id = ?`, [...values, id]);
};

export const getHabitById = (id: number): Habit | null => {
  const db = getDb();
  const row = db.getFirstSync<any>('SELECT * FROM Habit WHERE id = ?', [id]);
  if (!row) return null;
  return { ...row, reminder_enabled: Boolean(row.reminder_enabled) };
};

export const getHabits = (): HabitWithStreak[] => {
  const db = getDb();
  const rows = db.getAllSync<any>(`
    SELECT h.*,
      COALESCE(s.current_streak, 0) AS current_streak,
      COALESCE(s.longest_streak, 0) AS longest_streak
    FROM Habit h
    LEFT JOIN StreakCache s ON h.id = s.habit_id
    ORDER BY h.sort_order ASC
  `);
  return rows.map(row => ({ ...row, reminder_enabled: Boolean(row.reminder_enabled) }));
};

export const getHabitCount = (): number => {
  const db = getDb();
  const row = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Habit');
  return row?.count ?? 0;
};

export const deleteHabit = (id: number): void => {
  const db = getDb();
  db.runSync('DELETE FROM Habit WHERE id = ?', [id]);
};
