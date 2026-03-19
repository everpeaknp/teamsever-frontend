'use client';

import { useEffect } from 'react';
import { useSearchStore } from '@/store/useSearchStore';

export function useSearchShortcut() {
  const { openSearch } = useSearchStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for CMD+K (Mac) or CTRL+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); // Prevent browser's default search/address bar focus
        openSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openSearch]);
}
