'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Folder, List, CheckSquare, Command, Plus } from 'lucide-react';
import { useSearchStore } from '@/store/useSearchStore';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const typeIcons = {
  space: Folder,
  list: List,
  task: CheckSquare,
};

const typeLabels = {
  space: 'Space',
  list: 'List',
  task: 'Task',
};

export function GlobalSearch() {
  const router = useRouter();
  const {
    isOpen,
    query,
    results,
    selectedIndex,
    isSearching,
    openSearch,
    closeSearch,
    setQuery,
    setSelectedIndex,
  } = useSearchStore();

  useGlobalSearch();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        closeSearch();
      }

      // Arrow navigation
      if (isOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(Math.min(selectedIndex + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(Math.max(selectedIndex - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (results[selectedIndex]) {
            handleNavigate(results[selectedIndex].url);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, openSearch, closeSearch, setSelectedIndex]);

  const handleNavigate = useCallback((url: string) => {
    router.push(url);
    closeSearch();
  }, [router, closeSearch]);

  const handleCreateTask = useCallback(() => {
    // This would open a create task modal
    closeSearch();
  }, [closeSearch]);

  if (!isOpen) return null;

  // Group results by type
  const groupedResults = {
    space: results.filter(r => r.type === 'space'),
    list: results.filter(r => r.type === 'list'),
    task: results.filter(r => r.type === 'task'),
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-150"
        onClick={closeSearch}
      />

      {/* Search Modal */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 animate-in zoom-in-95 fade-in duration-150">
        <div className="bg-white dark:bg-[#1a1a1a] rounded-lg shadow-2xl border border-slate-200 dark:border-[#262626] overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-[#262626]">
            <Search className="w-5 h-5 text-slate-400" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search spaces, lists, and tasks..."
              className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base bg-transparent"
            />
            {isSearching && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <kbd className="px-2 py-1 bg-slate-100 dark:bg-[#262626] rounded border border-slate-200 dark:border-[#333] font-mono">
                <Command className="w-3 h-3 inline" />K
              </kbd>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {!query.trim() ? (
              <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Start typing to search...</p>
                <p className="text-xs mt-1">Search across spaces, lists, and tasks</p>
              </div>
            ) : results.length === 0 && !isSearching ? (
              <div className="px-4 py-8 text-center">
                <div className="text-slate-500 dark:text-slate-400 mb-4">
                  <p className="text-sm mb-1">No tasks or spaces found for</p>
                  <p className="font-medium text-slate-900 dark:text-white">"{query}"</p>
                </div>
                <Button
                  onClick={handleCreateTask}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New Task
                </Button>
              </div>
            ) : (
              <div className="py-2">
                {/* Spaces */}
                {groupedResults.space.length > 0 && (
                  <div className="mb-2">
                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Spaces
                    </div>
                    {groupedResults.space.map((result, index) => {
                      const globalIndex = results.indexOf(result);
                      const Icon = typeIcons[result.type];
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleNavigate(result.url)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            globalIndex === selectedIndex
                              ? 'bg-primary/10 dark:bg-primary/20'
                              : 'hover:bg-slate-50 dark:hover:bg-[#262626]'
                          )}
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 dark:text-white truncate">
                              {result.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {typeLabels[result.type]}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Lists */}
                {groupedResults.list.length > 0 && (
                  <div className="mb-2">
                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Lists
                    </div>
                    {groupedResults.list.map((result, index) => {
                      const globalIndex = results.indexOf(result);
                      const Icon = typeIcons[result.type];
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleNavigate(result.url)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            globalIndex === selectedIndex
                              ? 'bg-primary/10 dark:bg-primary/20'
                              : 'hover:bg-slate-50 dark:hover:bg-[#262626]'
                          )}
                        >
                          <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 dark:text-white truncate">
                              {result.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {result.path.join(' > ')}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Tasks */}
                {groupedResults.task.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tasks
                    </div>
                    {groupedResults.task.map((result, index) => {
                      const globalIndex = results.indexOf(result);
                      const Icon = typeIcons[result.type];
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleNavigate(result.url)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            globalIndex === selectedIndex
                              ? 'bg-primary/10 dark:bg-primary/20'
                              : 'hover:bg-slate-50 dark:hover:bg-[#262626]'
                          )}
                        >
                          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 dark:text-white truncate">
                              {result.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {result.path.join(' > ')}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-200 dark:border-[#262626] bg-slate-50 dark:bg-[#0f0f0f] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#262626] rounded border border-slate-200 dark:border-[#333] font-mono text-[10px]">
                  ↑↓
                </kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#262626] rounded border border-slate-200 dark:border-[#333] font-mono text-[10px]">
                  ↵
                </kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#262626] rounded border border-slate-200 dark:border-[#333] font-mono text-[10px]">
                  ESC
                </kbd>
                <span>Close</span>
              </div>
            </div>
            <div>{results.length} results</div>
          </div>
        </div>
      </div>
    </>
  );
}
