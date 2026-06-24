import { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useHabits } from '../../src/hooks/useHabits';
import { getHabitLogs, toggleHabitLog } from '../../src/database/HabitLogRepo';
import { updateStreakCache } from '../../src/database/StreakCacheRepo';
import { HabitLog } from '../../src/models/types';
import { calculateStreaks } from '../../src/utils/streakEngine';
import { SymbolView } from 'expo-symbols';
import { 
  startOfMonth, endOfMonth, eachDayOfInterval, format, 
  addMonths, subMonths, getDay, isSameDay, parseISO 
} from 'date-fns';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useFocusEffect } from 'expo-router';
import { forceWidgetUpdate } from '../../src/utils/widgetUpdater';
import { useTheme } from '../../src/utils/ThemeContext';

const { width } = Dimensions.get('window');
const CELL_SIZE = (width - 40) / 7;

export default function GridScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const { habits, loading, refresh: refreshHabits } = useHabits();
  const [habitIndex, setHabitIndex] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [logs, setLogs] = useState<Set<string>>(new Set());
  const [logsLoading, setLogsLoading] = useState(false);

  const activeHabit = habits[habitIndex];

  const loadLogs = useCallback((habitId: number) => {
    setLogsLoading(true);
    try {
      const fetchedLogs = getHabitLogs(habitId);
      const logSet = new Set(fetchedLogs.map(l => l.log_date));
      setLogs(logSet);
    } catch (e) {
      console.error('Failed to load logs', e);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (activeHabit) {
        loadLogs(activeHabit.id);
      }
    }, [activeHabit, loadLogs])
  );

  const handleNextHabit = () => {
    if (habits.length > 0) {
      setHabitIndex((prev) => (prev + 1) % habits.length);
    }
  };

  const handlePrevHabit = () => {
    if (habits.length > 0) {
      setHabitIndex((prev) => (prev - 1 + habits.length) % habits.length);
    }
  };

  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleLongPress = useCallback((dateStr: string) => {
    if (!activeHabit) return;
    
    ReactNativeHapticFeedback.trigger('impactHeavy');
    
    // Optimistic update
    setLogs(prev => {
      const newLogs = new Set(prev);
      if (newLogs.has(dateStr)) {
        newLogs.delete(dateStr);
      } else {
        newLogs.add(dateStr);
      }
      return newLogs;
    });

    // Run the rest asynchronously to avoid blocking the UI thread
    setTimeout(async () => {
      try {
        // Persist (synchronous)
        toggleHabitLog(activeHabit.id, dateStr);
        
        // Recalculate streak (synchronous)
        const fetchedLogs = getHabitLogs(activeHabit.id);
        const { currentStreak, longestStreak } = calculateStreaks(activeHabit, fetchedLogs);
        updateStreakCache({
          habit_id: activeHabit.id,
          current_streak: currentStreak,
          longest_streak: longestStreak,
          last_computed: Date.now()
        });
        
        await forceWidgetUpdate();
        refreshHabits(); // Update the top-level streak display
      } catch (e) {
        console.error('Failed to update log', e);
      }
    }, 0);
  }, [activeHabit, refreshHabits]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    
    // Pad start with empty days
    const startDayOfWeek = getDay(start);
    const paddedDays: (Date | null)[] = Array(startDayOfWeek).fill(null);
    return [...paddedDays, ...days];
  }, [currentDate]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1982C4" />
      </View>
    );
  }

  if (habits.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No habits to track.</Text>
        <Text style={styles.emptySubtext}>Use the + button to create one.</Text>
      </View>
    );
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <View style={styles.container}>
      {/* Habit Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevHabit} style={styles.navButton}>
          <SymbolView name={{ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left'}} size={30} tintColor={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{activeHabit.title}</Text>
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {activeHabit.current_streak}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleNextHabit} style={styles.navButton}>
          <SymbolView name={{ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right'}} size={30} tintColor={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={handlePrevMonth}>
          <SymbolView name={{ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back'}} size={20} tintColor={colors.subText} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{format(currentDate, 'MMMM yyyy')}</Text>
        <TouchableOpacity onPress={handleNextMonth}>
          <SymbolView name={{ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward'}} size={20} tintColor={colors.subText} />
        </TouchableOpacity>
      </View>

      {/* Days of Week */}
      <View style={styles.daysOfWeek}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={i} style={styles.dayOfWeekText}>{d}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.grid}>
        {calendarDays.map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} style={[styles.cell, { backgroundColor: 'transparent' }]} />;
          }

          const dateStr = format(date, 'yyyy-MM-dd');
          const isMarked = logs.has(dateStr);
          const isToday = dateStr === todayStr;

          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.cell,
                isMarked && { backgroundColor: `#${activeHabit.color_hex}`, borderColor: `#${activeHabit.color_hex}` },
                isToday && !isMarked && styles.todayCell
              ]}
              onLongPress={() => handleLongPress(dateStr)}
              delayLongPress={300}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.cellText,
                isMarked && styles.cellTextMarked,
                !isMarked && { color: colors.text }
              ]}>
                {format(date, 'd')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  emptySubtext: {
    color: colors.subText,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  navButton: {
    padding: 10,
  },
  titleContainer: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.text,
  },
  streakBadge: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  streakText: {
    color: '#FF924C',
    fontWeight: 'bold',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 20,
    backgroundColor: 'transparent',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    minWidth: 150,
    textAlign: 'center',
  },
  daysOfWeek: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  dayOfWeekText: {
    width: CELL_SIZE,
    textAlign: 'center',
    color: colors.subText,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  todayCell: {
    borderColor: colors.text,
    borderWidth: 2,
  },
  cellText: {
    fontSize: 16,
  },
  cellTextMarked: {
    fontWeight: 'bold',
    color: '#fff',
  },
});
