import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { HabitWidget } from './HabitWidget';
import { getKV, setKV } from '../database/db';
import { getHabits } from '../database/HabitRepo';
import { getHabitLogs, toggleHabitLog } from '../database/HabitLogRepo';
import { calculateStreaks } from '../utils/streakEngine';
import { updateStreakCache } from '../database/StreakCacheRepo';

export function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, clickAction } = props;
  const action = widgetAction === 'WIDGET_CLICK' ? clickAction : widgetAction;

  console.log('[WidgetTask] Action received:', widgetAction, 'resolved:', action);
  try {
    const habits = getHabits();
    let currentIndex = parseInt(getKV('widget_habit_index', '0'), 10);

    let cachedLogs: any = null;

    if (habits.length > 0 && action) {
      if (action === 'NEXT_HABIT') {
        currentIndex = (currentIndex + 1) % habits.length;
        setKV('widget_habit_index', currentIndex.toString());
      } else if (action === 'PREV_HABIT') {
        currentIndex = (currentIndex - 1 + habits.length) % habits.length;
        setKV('widget_habit_index', currentIndex.toString());
      } else if (action.startsWith('TOGGLE_')) {
        const dateStr = action.replace('TOGGLE_', '');
        const activeHabit = habits[currentIndex];
        if (activeHabit) {
          toggleHabitLog(activeHabit.id, dateStr);
          cachedLogs = getHabitLogs(activeHabit.id);
          const { currentStreak, longestStreak } = calculateStreaks(activeHabit, cachedLogs);
          updateStreakCache({
            habit_id: activeHabit.id,
            current_streak: currentStreak,
            longest_streak: longestStreak,
            last_computed: Date.now(),
          });
          
          // If we toggled from a widget, aggressively update all other widgets
          const { forceWidgetUpdate } = require('../utils/widgetUpdater');
          forceWidgetUpdate();
        }
      }
    }

    const updatedHabits = getHabits();
    
    if (props.widgetInfo.widgetName === 'ChartWidget') {
      const ChartWidget = require('./ChartWidget').ChartWidget;
      
      let chartIndex = parseInt(getKV('widget_chart_index', '-1'), 10);
      let menuOpen = getKV('widget_chart_menu_open', 'false') === 'true';

      if (habits.length > 0 && action) {
        if (action === 'OPEN_CHART_MENU') {
          menuOpen = true;
          setKV('widget_chart_menu_open', 'true');
        } else if (action === 'CLOSE_CHART_MENU') {
          menuOpen = false;
          setKV('widget_chart_menu_open', 'false');
        } else if (action.startsWith('SELECT_CHART_IDX_')) {
          const idxStr = action.replace('SELECT_CHART_IDX_', '');
          chartIndex = parseInt(idxStr, 10);
          menuOpen = false;
          setKV('widget_chart_index', chartIndex.toString());
          setKV('widget_chart_menu_open', 'false');
        }
      }

      props.renderWidget(
        <ChartWidget
          habits={updatedHabits}
          selectedIndex={chartIndex}
          menuOpen={menuOpen}
          widgetInfo={props.widgetInfo}
        />
      );
      return;
    }

    // Default to HabitWidget
    const activeHabit = updatedHabits.length > 0 ? updatedHabits[currentIndex] : null;
    let logs = new Set<string>();

    if (activeHabit) {
      const fetchedLogs = cachedLogs || getHabitLogs(activeHabit.id);
      logs = new Set(fetchedLogs.map((l: any) => l.log_date));
    }

    props.renderWidget(<HabitWidget habit={activeHabit} logs={logs} widgetInfo={props.widgetInfo} />);
  } catch (e) {
    console.error('Widget Task Error:', e);
  }
}
