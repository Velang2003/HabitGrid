import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextProps {
  theme: 'light' | 'dark';
  themeMode: ThemeType;
  colors: typeof Colors.light;
  setThemeMode: (mode: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: 'dark',
  themeMode: 'system',
  colors: Colors.dark,
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeType>('system');

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('theme_preference');
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setThemeModeState(stored as ThemeType);
        }
      } catch (e) {}
    })();
  }, []);

  const setThemeMode = async (mode: ThemeType) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem('theme_preference', mode);
    } catch (e) {}
  };

  const theme = themeMode === 'system' ? (systemColorScheme || 'dark') : themeMode;
  const colors = Colors[theme];

  return (
    <ThemeContext.Provider value={{ theme, themeMode, colors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
