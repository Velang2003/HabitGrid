import React from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useTheme } from '../../src/utils/ThemeContext';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

export default function AboutScreen() {
  const { colors, themeMode, setThemeMode } = useTheme();
  const styles = getStyles(colors);

  const version = Constants.expoConfig?.version || '1.0.0';

  const handleSupport = () => {
    Linking.openURL('https://github.com/Velang2003');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBlock}>
        <Text style={styles.appName}>HabitGrid</Text>
        <Text style={styles.version}>Version {version}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>System Default</Text>
            <Switch
              value={themeMode === 'system'}
              onValueChange={(val) => setThemeMode(val ? 'system' : 'dark')}
              trackColor={{ false: colors.border, true: '#1982C4' }}
            />
          </View>
          
          {themeMode !== 'system' && (
            <>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Light Mode</Text>
                <Switch
                  value={themeMode === 'light'}
                  onValueChange={(val) => setThemeMode(val ? 'light' : 'dark')}
                  trackColor={{ false: colors.border, true: '#1982C4' }}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Dark Mode</Text>
                <Switch
                  value={themeMode === 'dark'}
                  onValueChange={(val) => setThemeMode(val ? 'dark' : 'light')}
                  trackColor={{ false: colors.border, true: '#1982C4' }}
                />
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <Text style={styles.description}>
            HabitGrid is a dynamic, highly-customizable habit tracker designed to keep you focused on your streaks and daily progress directly from your home screen.
          </Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Developer</Text>
            <Text style={styles.rowValue}>Ashwamedha</Text>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('https://github.com/Velang2003')}>
            <Text style={styles.rowLabel}>GitHub</Text>
            <Text style={[styles.rowValue, { color: '#1982C4' }]}>@Velang2003</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.supportButton} onPress={handleSupport}>
        <Text style={styles.supportButtonText}>🐙  View on GitHub</Text>
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
  headerBlock: {
    alignItems: 'center',
    marginVertical: 30,
    backgroundColor: 'transparent',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  version: {
    fontSize: 14,
    color: colors.subText,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: colors.subText,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'transparent',
  },
  rowLabel: {
    fontSize: 16,
    color: colors.text,
  },
  rowValue: {
    fontSize: 16,
    color: colors.subText,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 16,
  },
  description: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    padding: 16,
  },
  supportButton: {
    marginTop: 20,
    padding: 16,
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  supportButtonText: {
    color: '#1982C4',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
