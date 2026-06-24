import { StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useHabits } from '../../src/hooks/useHabits';
import { deleteHabit } from '../../src/database/HabitRepo';
import { cancelHabitReminder } from '../../src/utils/notifications';
import { HabitWithStreak } from '../../src/models/types';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

import { useTheme } from '../../src/utils/ThemeContext';

export default function HabitListScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const { habits, loading, refresh } = useHabits();

  const handleEdit = (item: HabitWithStreak) => {
    router.push({ pathname: '/modal', params: { habitId: item.id.toString() } });
  };

  const handleDelete = (id: number, title: string) => {
    Alert.alert('Delete Habit', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          await cancelHabitReminder(id);
          deleteHabit(id);
          refresh();
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: HabitWithStreak }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <View style={[styles.colorSwatch, { backgroundColor: `#${item.color_hex}` }]} />
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.freqLabel}>{item.frequency_type}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
            <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={20} tintColor="#1982C4" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id, item.title)}>
            <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={20} tintColor={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>🔥 {item.current_streak}</Text>
          <Text style={styles.statLabel}>Current Streak</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>🏆 {item.longest_streak}</Text>
          <Text style={styles.statLabel}>Longest Streak</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: item.reminder_enabled ? '#4CAF50' : colors.subText }]}>
            {item.reminder_enabled ? '🔔 On' : '🔕 Off'}
          </Text>
          <Text style={styles.statLabel}>Reminder</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {habits.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No habits created yet.</Text>
          <Text style={styles.emptySubtext}>Tap the + button to create one.</Text>
        </View>
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.text,
  },
  emptySubtext: {
    color: colors.subText,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
  },
  colorSwatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 12,
  },
  titleBlock: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
  },
  freqLabel: {
    fontSize: 12,
    color: colors.subText,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
  },
  actionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.subText,
    marginTop: 4,
  },
});
