'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, ThemeProviderProps } from 'next-themes';
import { useThemeStore } from '@/store/useThemeStore';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeSyncComponent>{children}</ThemeSyncComponent>
    </NextThemesProvider>
  );
}

// Component to sync useThemeStore with next-themes
function ThemeSyncComponent({ children }: { children: React.ReactNode }) {
  const { themeMode } = useThemeStore();
  
  React.useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    
    if (themeMode === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [themeMode]);
  
  return <>{children}</>;
}
