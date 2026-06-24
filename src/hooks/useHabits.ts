import { useState, useCallback } from 'react';
import { HabitWithStreak } from '../models/types';
import { getHabits, getHabitCount } from '../database/HabitRepo';
import { useFocusEffect } from 'expo-router';

export const useHabits = () => {
  const [habits, setHabits] = useState<HabitWithStreak[]>([]);
  const [habitCount, setHabitCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadHabits = useCallback(() => {
    try {
      const data = getHabits();
      setHabits(data);
      const count = getHabitCount();
      setHabitCount(count);
    } catch (e) {
      console.error('Failed to load habits', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHabits();
    }, [loadHabits])
  );

  return { habits, habitCount, loading, refresh: loadHabits };
};
