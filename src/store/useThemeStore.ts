import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type AccentColor = 'white' | 'mint' | 'purple' | 'blue' | 'indigo' | 'teal' | 'pink' | 'orange' | 'violet' | 'bronze' | 'black';

interface ThemeStore {
  themeMode: ThemeMode;
  accentColor: AccentColor;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
}

// ClickUp color palette
export const accentColors: Record<AccentColor, string> = {
  white: '#f8fafc',     // Light gray/white
  mint: '#10b981',      // Emerald/Mint
  purple: '#a855f7',    // Purple
  blue: '#3b82f6',      // Blue
  indigo: '#6366f1',    // Indigo
  teal: '#14b8a6',      // Teal
  pink: '#ec4899',      // Pink
  orange: '#f97316',    // Orange
  violet: '#8b5cf6',    // Violet
  bronze: '#92400e',    // Bronze/Brown
  black: '#111111',     // Pure Black (not dark blue)
};

// Helper to create gradient (lighter at top, darker at bottom)
export const getGradientColor = (color: string): string => {
  // For white/light colors, use a subtle gradient
  if (color === '#f8fafc') {
    return `linear-gradient(to bottom, #f8fafc, #e2e8f0)`;
  }
  // For other colors, lighten top and darken bottom
  return `linear-gradient(to bottom, ${color}cc, ${color})`;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      themeMode: 'light',
      accentColor: 'mint',
      
      setThemeMode: (mode: ThemeMode) => set({ themeMode: mode }),
      setAccentColor: (color: AccentColor) => set({ accentColor: color }),
    }),
    {
      name: 'clickup-theme-storage',
    }
  )
);
