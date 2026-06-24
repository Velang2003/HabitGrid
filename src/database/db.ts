import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'habitgrid.db';

let db: SQLite.SQLiteDatabase | null = null;

export const getDb = (): SQLite.SQLiteDatabase => {
  if (!db) {
    db = SQLite.openDatabaseSync(DATABASE_NAME);
  }
  return db;
};

export const initDb = async (): Promise<void> => {
  const database = getDb();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS Habit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      color_hex TEXT NOT NULL,
      frequency_type TEXT NOT NULL,
      frequency_days TEXT,
      reminder_time TEXT,
      reminder_enabled INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      grace_period INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS HabitLog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      log_date TEXT NOT NULL,
      marked_at INTEGER NOT NULL,
      FOREIGN KEY (habit_id) REFERENCES Habit (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_habitlog_date ON HabitLog(log_date);
    CREATE INDEX IF NOT EXISTS idx_habitlog_habit_id ON HabitLog(habit_id);

    CREATE TABLE IF NOT EXISTS StreakCache (
      habit_id INTEGER PRIMARY KEY,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_computed INTEGER NOT NULL,
      FOREIGN KEY (habit_id) REFERENCES Habit (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS KVStore (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
};

export const getKV = (key: string, defaultValue: string): string => {
  try {
    const database = getDb();
    const result = database.getFirstSync<{ value: string }>('SELECT value FROM KVStore WHERE key = ?', [key]);
    return result ? result.value : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

export const setKV = (key: string, value: string): void => {
  try {
    const database = getDb();
    database.runSync('INSERT OR REPLACE INTO KVStore (key, value) VALUES (?, ?)', [key, value]);
  } catch (e) {
    console.error('KVStore Error:', e);
  }
};
