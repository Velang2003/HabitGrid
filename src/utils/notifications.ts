import notifee, { TriggerType, RepeatFrequency, AndroidImportance } from '@notifee/react-native';
import { Habit } from '../models/types';

export const setupNotificationChannel = async () => {
  await notifee.createChannel({
    id: 'habit_reminders',
    name: 'Habit Reminders',
    importance: AndroidImportance.HIGH,
  });
};

export const scheduleHabitReminder = async (habit: Habit) => {
  // First cancel any existing trigger for this habit
  await cancelHabitReminder(habit.id);

  if (!habit.reminder_enabled || !habit.reminder_time) {
    return;
  }

  // reminder_time is expected to be "HH:mm" (24-hour format)
  const [hours, minutes] = habit.reminder_time.split(':').map(Number);
  
  const now = new Date();
  const triggerDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
  
  // If the time has already passed today, schedule for tomorrow
  if (triggerDate.getTime() < now.getTime()) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }

  const trigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
    repeatFrequency: RepeatFrequency.DAILY,
  };

  const motivationalNudges = [
    "Don't break the chain!",
    "Time to crush your habit!",
    "You've got this!",
    "Small steps every day.",
  ];
  const randomNudge = motivationalNudges[Math.floor(Math.random() * motivationalNudges.length)];

  await notifee.createTriggerNotification(
    {
      id: `habit_${habit.id}`,
      title: habit.title,
      body: habit.notes ? `${habit.notes} - ${randomNudge}` : randomNudge,
      android: {
        channelId: 'habit_reminders',
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default', // opens the app
        },
      },
    },
    trigger as any
  );
};

export const cancelHabitReminder = async (habitId: number) => {
  await notifee.cancelNotification(`habit_${habitId}`);
};
