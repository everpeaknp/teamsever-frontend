'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, ThemeProviderProps, useTheme } from 'next-themes';
import { useThemeStore, AccentColor, applyThemeVariables } from '@/store/useThemeStore';
import { useSystemSettings } from '@/hooks/useSystemSettings';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeSyncComponent>{children}</ThemeSyncComponent>
    </NextThemesProvider>
  );
}

// Component to sync useThemeStore and System Settings with document root
function ThemeSyncComponent({ children }: { children: React.ReactNode }) {
  const { themeMode: userThemeMode, accentColor: userAccentColor } = useThemeStore();
  const { themeMode: systemThemeMode, accentColor: systemAccentColor } = useSystemSettings();
  const { setTheme, theme: nextTheme } = useTheme();
  
  React.useEffect(() => {
    // Logic: 
    // 1. If user has explicitly chosen 'light' or 'dark', use that.
    // 2. If user has 'auto' (the default), check system settings.
    // 3. Fallback to 'light' if nothing else is clear.
    
    let effectiveMode: 'light' | 'dark' = userThemeMode as any;
    
    if (userThemeMode === 'auto') {
      // If system settings are not loaded yet, wait or default to 'light'
      effectiveMode = systemThemeMode === 'auto' ? (nextTheme === 'dark' ? 'dark' : 'light') : (systemThemeMode as any || 'light');
    }

    // Sync with next-themes if they differ
    // Note: next-themes uses 'system' instead of 'auto'
    const nextThemeMode = userThemeMode === 'auto' ? 'system' : userThemeMode;
    if (nextTheme !== nextThemeMode) {
      setTheme(nextThemeMode);
    }

    // Determine effective accent color
    const effectiveAccent = userAccentColor === 'mint' && systemAccentColor !== 'mint'
      ? systemAccentColor as AccentColor
      : userAccentColor;
      
    // Apply all variables and classes to root
    applyThemeVariables(effectiveAccent, effectiveMode as any);
    
  }, [userThemeMode, systemThemeMode, userAccentColor, systemAccentColor, nextTheme, setTheme]);
  
  return <>{children}</>;
}
