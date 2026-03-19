'use client';

import { Search } from 'lucide-react';
import { useSearchStore } from '@/store/useSearchStore';
import { Button } from '@/components/ui/button';

export function SearchButton() {
  const { openSearch } = useSearchStore();

  return (
    <Button
      variant="outline"
      className="relative h-10 w-full justify-start text-sm text-muted-foreground"
      onClick={openSearch}
    >
      <Search className="mr-2 h-4 w-4" />
      <span className="hidden lg:inline-flex">Search tasks, spaces, lists...</span>
      <span className="inline-flex lg:hidden">Search...</span>
      <kbd className="pointer-events-none absolute right-2 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );
}
