'use client';

import { Search } from 'lucide-react';
import { useSearchStore } from '@/store/useSearchStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SearchButton({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { openSearch } = useSearchStore();

  return (
    <Button
      variant="outline"
      aria-label={compact ? 'Search' : undefined}
      className={cn(
        'relative h-11 text-sm text-muted-foreground',
        compact ? 'w-11 justify-center px-0' : 'w-full justify-start',
        className
      )}
      onClick={openSearch}
    >
      <Search className={cn('h-4 w-4', !compact && 'mr-2')} aria-hidden="true" />
      {!compact && (
        <>
          <span className="hidden lg:inline-flex">Search tasks, spaces, lists...</span>
          <span className="inline-flex lg:hidden">Search...</span>
          <kbd className="pointer-events-none absolute right-2 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </>
      )}
    </Button>
  );
}
