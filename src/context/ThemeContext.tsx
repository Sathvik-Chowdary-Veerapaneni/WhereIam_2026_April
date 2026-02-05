import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

// Color palette definitions
const lightColors = {
  // Backgrounds
  background: '#F2F2F7',
  backgroundSecondary: '#FFFFFF',
  card: '#FFFFFF',
  cardSecondary: '#F2F2F7',

  // Text
  text: '#000000',
  textSecondary: '#3C3C43',
  textTertiary: '#8E8E93',
  textInverse: '#FFFFFF',

  // Borders
  border: '#C6C6C8',
  borderLight: '#E5E5EA',
  separator: '#C6C6C8',

  // Primary accent
  primary: '#007AFF',
  primaryLight: '#4DA3FF',

  // Status colors
  success: '#34C759',
  successBackground: '#34C75920',
  warning: '#FF9500',
  warningBackground: '#FF950020',
  error: '#FF3B30',
  errorBackground: '#FF3B3020',

  // Special
  purple: '#5856D6',
  teal: '#5AC8FA',

  // Input
  inputBackground: '#E5E5EA',
  inputBorder: '#C6C6C8',
  placeholder: '#8E8E93',

  // Modal
  backdrop: 'rgba(0, 0, 0, 0.4)',
  modalBackground: '#FFFFFF',
  handle: '#C6C6C8',

  // Avatar
  avatarBackground: '#007AFF',
  avatarGuestBackground: '#FF9500',

  // Badge
  adminBadgeBackground: '#FFD60A',
  adminBadgeText: '#000000',
  guestBadgeBackground: '#FF9500',
  guestBadgeText: '#FFFFFF',
};

const darkColors = {
  // Backgrounds
  background: '#0A0A0F',
  backgroundSecondary: '#1C1C1E',
  card: '#1C1C1E',
  cardSecondary: '#252528',

  // Text
  text: '#FFFFFF',
  textSecondary: '#EBEBF5',
  textTertiary: '#8E8E93',
  textInverse: '#000000',

  // Borders
  border: '#38383A',
  borderLight: '#2C2C2E',
  separator: '#38383A',

  // Primary accent
  primary: '#007AFF',
  primaryLight: '#4DA3FF',

  // Status colors
  success: '#34C759',
  successBackground: '#34C75920',
  warning: '#FF9500',
  warningBackground: '#FF950020',
  error: '#FF3B30',
  errorBackground: '#FF3B3020',

  // Special
  purple: '#5856D6',
  teal: '#5AC8FA',

  // Input
  inputBackground: '#2C2C2E',
  inputBorder: '#38383A',
  placeholder: '#636366',

  // Modal
  backdrop: 'rgba(0, 0, 0, 0.6)',
  modalBackground: '#1C1C1E',
  handle: '#3A3A3C',

  // Avatar
  avatarBackground: '#007AFF',
  avatarGuestBackground: '#FF9500',

  // Badge
  adminBadgeBackground: '#FFD60A',
  adminBadgeText: '#000000',
  guestBadgeBackground: '#FF9500',
  guestBadgeText: '#FFFFFF',
};

export type ThemeColors = typeof lightColors;
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (theme: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@debt_mirror_theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  // Determine if dark mode based on theme setting
  const isDark = theme === 'system'
    ? systemColorScheme === 'dark'
    : theme === 'dark';

  const colors = isDark ? darkColors : lightColors;

  // Load saved theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setThemeState(savedTheme as ThemeMode);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // Save theme preference
  const setTheme = async (newTheme: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
      throw error;
    }
  };

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Export color palettes for reference
export { lightColors, darkColors };
