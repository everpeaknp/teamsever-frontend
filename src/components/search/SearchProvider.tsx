'use client';

import { GlobalSearch } from './GlobalSearch';
import { useSearchShortcut } from '@/hooks/useSearchShortcut';

export function SearchProvider({ children }: { children: React.ReactNode }) {
  useSearchShortcut();

  return (
    <>
      {children}
      <GlobalSearch />
    </>
  );
}
