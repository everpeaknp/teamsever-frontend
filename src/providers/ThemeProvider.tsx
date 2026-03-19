'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, ThemeProviderProps } from 'next-themes';
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
  
  React.useEffect(() => {
    // Determine effective theme mode
    // If system settings are available, and user hasn't customized (defaulting to 'light'/'mint'), use system defaults
    const effectiveMode = userThemeMode === 'light' && systemThemeMode !== 'light' 
      ? systemThemeMode 
      : userThemeMode;

    // Determine effective accent color
    const effectiveAccent = userAccentColor === 'mint' && systemAccentColor !== 'mint'
      ? systemAccentColor as AccentColor
      : userAccentColor;
      
    // Apply all variables and classes to root
    applyThemeVariables(effectiveAccent, effectiveMode as any);
    
  }, [userThemeMode, systemThemeMode, userAccentColor, systemAccentColor]);
  
  return <>{children}</>;
}
