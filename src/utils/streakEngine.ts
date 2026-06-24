import { parseISO, format, eachDayOfInterval, isAfter, getDay } from 'date-fns';
import { Habit, HabitLog } from '../models/types';

export const calculateStreaks = (habit: Habit, logs: HabitLog[], todayStr: string = format(new Date(), 'yyyy-MM-dd')) => {
  const markedDates = new Set(logs.map(log => log.log_date));
  
  const createdDateStr = format(new Date(habit.created_at), 'yyyy-MM-dd');
  
  // Start from creation date
  let startDateStr = createdDateStr;
  
  // If there are logs from BEFORE creation (e.g., retroactively logged), use the earliest log
  if (logs.length > 0) {
    const sortedDates = Array.from(markedDates).sort();
    if (sortedDates[0] < startDateStr) {
      startDateStr = sortedDates[0];
    }
  }

  const startDate = parseISO(startDateStr);
  const endDate = parseISO(todayStr);
  
  if (isAfter(startDate, endDate)) return { currentStreak: 0, longestStreak: 0 };

  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  
  let currentStreak = 0;
  let longestStreak = 0;
  let graceRemaining = habit.grace_period;
  
  const frequencyDays = habit.frequency_days ? JSON.parse(habit.frequency_days) as number[] : null;

  for (const dateObj of allDays) {
    const dateStr = format(dateObj, 'yyyy-MM-dd');
    
    // Check if it is a scheduled day
    let isScheduled = true;
    if (habit.frequency_type !== 'daily' && frequencyDays) {
      const dayOfWeek = getDay(dateObj); // 0 = Sunday, 6 = Saturday
      if (!frequencyDays.includes(dayOfWeek)) {
        isScheduled = false;
      }
    }

    const isMarked = markedDates.has(dateStr);

    if (!isScheduled && !isMarked) {
      continue; // Skip non-scheduled days ONLY if they are not marked. Marking an extra day should boost the streak!
    }

    if (isMarked) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
      graceRemaining = habit.grace_period; // reset grace
    } else {
      // Missed a scheduled day
      if (dateStr === todayStr) {
        // We don't penalize missing 'today' as the day is not over
      } else {
        if (graceRemaining > 0) {
          graceRemaining--;
        } else {
          currentStreak = 0;
          graceRemaining = habit.grace_period;
        }
      }
    }
  }

  return { currentStreak, longestStreak };
};
