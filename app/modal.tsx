import { useState, useEffect } from 'react';
import { StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Platform, Switch } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { createHabit, getHabitCount, getHabitById, updateHabit } from '../src/database/HabitRepo';
import { HABIT_COLORS } from '../src/utils/colors';
import { FrequencyType } from '../src/models/types';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import notifee from '@notifee/react-native';
import { scheduleHabitReminder, cancelHabitReminder } from '../src/utils/notifications';
import { forceWidgetUpdate } from '../src/utils/widgetUpdater';
import { useTheme } from '../src/utils/ThemeContext';

export default function ModalScreen() {
  const { colors, theme } = useTheme();
  const styles = getStyles(colors);

  // Support optional edit mode: pass ?habitId=123 to edit an existing habit
  const { habitId } = useLocalSearchParams<{ habitId?: string }>();
  const isEditing = !!habitId;

  const [title, setTitle] = useState('');
  const [color, setColor] = useState(HABIT_COLORS[0]);
  const [frequency, setFrequency] = useState<FrequencyType>('daily');
  const [gracePeriod, setGracePeriod] = useState('0');
  const [notes, setNotes] = useState('');
  
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [saving, setSaving] = useState(false);

  // Load existing habit data if editing
  useEffect(() => {
    if (isEditing && habitId) {
      const existing = getHabitById(parseInt(habitId, 10));
      if (existing) {
        setTitle(existing.title);
        setColor(`#${existing.color_hex}`);
        setFrequency(existing.frequency_type);
        setGracePeriod(existing.grace_period.toString());
        setNotes(existing.notes ?? '');
        setReminderEnabled(existing.reminder_enabled);
        if (existing.reminder_time) {
          const [h, m] = existing.reminder_time.split(':').map(Number);
          const d = new Date();
          d.setHours(h, m, 0, 0);
          setReminderTime(d);
        }
      }
    } else {
      // Check limit only when creating
      const count = getHabitCount();
      if (count >= 20) {
        Alert.alert('Limit Reached', 'You can only create up to 20 habits.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    }
  }, [habitId, isEditing]);

  const handleToggleReminder = async (val: boolean) => {
    if (val) {
      const settings = await notifee.requestPermission();
      if (settings.authorizationStatus >= 1) {
        setReminderEnabled(true);
      } else {
        Alert.alert('Permission Denied', 'You need to enable notifications in settings to use reminders.');
        setReminderEnabled(false);
      }
    } else {
      setReminderEnabled(false);
    }
  };

  const handleTimeChange = (_: DateTimePickerEvent, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) setReminderTime(selectedDate);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Title is required.');
      return;
    }

    const parsedGrace = parseInt(gracePeriod, 10);
    if (isNaN(parsedGrace) || parsedGrace < 0 || parsedGrace > 7) {
      Alert.alert('Validation Error', 'Grace period must be between 0 and 7.');
      return;
    }

    try {
      setSaving(true);
      const reminderTimeStr = format(reminderTime, 'HH:mm');

      if (isEditing && habitId) {
        const id = parseInt(habitId, 10);
        updateHabit(id, {
          title: title.trim(),
          color_hex: color.replace('#', ''),
          frequency_type: frequency,
          grace_period: parsedGrace,
          notes: notes.trim() || null,
          reminder_enabled: reminderEnabled,
          reminder_time: reminderTimeStr,
        });

        // Re-schedule or cancel reminder
        const updatedHabit = getHabitById(id);
        if (updatedHabit) {
          if (reminderEnabled) {
            await scheduleHabitReminder(updatedHabit);
          } else {
            await cancelHabitReminder(id);
          }
        }
      } else {
        const newId = createHabit({
          title: title.trim(),
          color_hex: color.replace('#', ''),
          frequency_type: frequency,
          frequency_days: null,
          reminder_time: reminderTimeStr,
          reminder_enabled: reminderEnabled,
          notes: notes.trim() || null,
          grace_period: parsedGrace,
          sort_order: Date.now(),
          created_at: Date.now()
        });

        if (reminderEnabled) {
          const fullHabit = getHabitById(newId);
          if (fullHabit) {
            await scheduleHabitReminder(fullHabit);
          }
        }
      }

      await forceWidgetUpdate();
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save habit.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>{isEditing ? 'Edit Habit' : 'New Habit'}</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="E.g., Read 20 pages"
        value={title}
        onChangeText={setTitle}
        placeholderTextColor={colors.subText}
      />

      <Text style={styles.label}>Color</Text>
      <View style={styles.colorContainer}>
        {HABIT_COLORS.map(c => (
          <TouchableOpacity
            key={c}
            style={[
              styles.colorSwatch,
              { backgroundColor: c },
              color === c && styles.colorSwatchSelected
            ]}
            onPress={() => setColor(c)}
          />
        ))}
      </View>

      <Text style={styles.label}>Frequency</Text>
      <View style={styles.frequencyContainer}>
        {(['daily', 'weekly', 'custom'] as FrequencyType[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.freqButton, frequency === f && styles.freqButtonSelected]}
            onPress={() => setFrequency(f)}
          >
            <Text style={[styles.freqText, frequency === f && styles.freqTextSelected]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Grace Period (Days)</Text>
      <Text style={styles.subLabel}>Missed days allowed before streak breaks (0-7)</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={gracePeriod}
        onChangeText={setGracePeriod}
        maxLength={1}
      />
      
      <View style={styles.switchRow}>
        <View style={styles.switchTextContainer}>
          <Text style={styles.label}>Daily Reminder</Text>
        </View>
        <Switch value={reminderEnabled} onValueChange={handleToggleReminder} />
      </View>
      
      {reminderEnabled && (
        <View style={styles.timePickerContainer}>
          <TouchableOpacity style={styles.timePickerButton} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.timePickerButtonText}>
              ⏰  {format(reminderTime, 'hh:mm a')}
            </Text>
          </TouchableOpacity>
          
          {showTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={reminderTime}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}

          {Platform.OS === 'ios' && (
            <DateTimePicker
              value={reminderTime}
              mode="time"
              display="default"
              onChange={handleTimeChange}
              themeVariant={theme === 'dark' ? 'dark' : 'light'}
            />
          )}
        </View>
      )}

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Motivation or details..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        placeholderTextColor={colors.subText}
      />

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : isEditing ? 'Update Habit' : 'Save Habit'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: colors.text,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
    color: colors.text,
  },
  subLabel: {
    fontSize: 12,
    color: colors.subText,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.inputBackground,
    color: colors.text,
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: 'transparent',
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: colors.text,
    borderWidth: 3,
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'transparent',
  },
  freqButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  freqButtonSelected: {
    backgroundColor: '#1982C4',
    borderColor: '#1982C4',
  },
  freqText: {
    color: colors.subText,
    fontWeight: '600',
  },
  freqTextSelected: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  switchTextContainer: {
    backgroundColor: 'transparent',
  },
  timePickerContainer: {
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  timePickerButton: {
    backgroundColor: colors.inputBackground,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  timePickerButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#1982C4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
