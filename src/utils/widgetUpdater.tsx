import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { HabitWidget } from '../widget/HabitWidget';
import { getHabits } from '../database/HabitRepo';
import { getHabitLogs } from '../database/HabitLogRepo';
import { getKV } from '../database/db';

export const forceWidgetUpdate = async () => {
  try {
    const habits = getHabits();
    let currentIndex = parseInt(getKV('widget_habit_index', '0'), 10);

    if (currentIndex >= habits.length) {
      currentIndex = 0;
    }

    const activeHabit = habits.length > 0 ? habits[currentIndex] : null;
    let logs = new Set<string>();

    if (activeHabit) {
      const fetchedLogs = getHabitLogs(activeHabit.id);
      logs = new Set(fetchedLogs.map(l => l.log_date));
    }

    requestWidgetUpdate({
      widgetName: 'HabitWidget',
      renderWidget: (widgetInfo) => <HabitWidget habit={activeHabit} logs={logs} widgetInfo={widgetInfo} />,
    });

    const ChartWidget = require('../widget/ChartWidget').ChartWidget;
    let chartIndex = parseInt(getKV('widget_chart_index', '-1'), 10);
    let menuOpen = getKV('widget_chart_menu_open', 'false') === 'true';

    requestWidgetUpdate({
      widgetName: 'ChartWidget',
      renderWidget: (widgetInfo) => <ChartWidget habits={habits} selectedIndex={chartIndex} menuOpen={menuOpen} widgetInfo={widgetInfo} />,
    });
  } catch (e) {
    console.error('Failed to update widget from app', e);
  }
};
