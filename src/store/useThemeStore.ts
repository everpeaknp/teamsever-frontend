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

// Workspace color palette
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

// Hex to HSL conversion helper
export const hexToHsl = (hex: string): string => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

// Utility to apply theme variables to root
export const applyThemeVariables = (accent: AccentColor, mode: ThemeMode) => {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const color = accentColors[accent] || accentColors.mint;
  const hsl = hexToHsl(color);
  
  root.style.setProperty('--primary', hsl);
  root.style.setProperty('--ring', hsl);
  root.style.setProperty('--accent-color', color);
  
  if (mode === 'dark') {
    root.classList.add('dark');
  } else if (mode === 'light') {
    root.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      themeMode: 'auto',
      accentColor: 'mint',
      
      setThemeMode: (mode: ThemeMode) => {
        set({ themeMode: mode });
        // Auto-apply when changed manually
        const state = useThemeStore.getState();
        applyThemeVariables(state.accentColor, mode);
      },
      setAccentColor: (color: AccentColor) => {
        set({ accentColor: color });
        // Auto-apply when changed manually
        const state = useThemeStore.getState();
        applyThemeVariables(color, state.themeMode);
      },
    }),
    {
      name: 'workspace-theme-storage',
    }
  )
);
