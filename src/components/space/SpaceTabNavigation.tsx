'use client';

import { FileText, Github, Table as TableIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type SpaceTab = 'lists' | 'tables' | 'commits';

interface SpaceTabNavigationProps {
  activeTab: SpaceTab;
  onChange: (tab: SpaceTab) => void;
  tableCount: number;
}

const tabs: Array<{ id: SpaceTab; label: string; icon: typeof FileText }> = [
  { id: 'lists', label: 'Lists', icon: FileText },
  { id: 'tables', label: 'Tables', icon: TableIcon },
  { id: 'commits', label: 'Commits', icon: Github },
];

export function SpaceTabNavigation({ activeTab, onChange, tableCount }: SpaceTabNavigationProps) {
  return (
    <div role="tablist" aria-label="Space sections" className="mb-5 grid grid-cols-3 gap-1 border-b border-border sm:mb-6 sm:gap-4">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activeTab === id}
          onClick={() => onChange(id)}
          className={`flex min-h-11 min-w-0 items-center justify-center gap-1.5 border-b-2 px-1.5 py-2 text-xs font-medium transition-colors sm:gap-2 sm:px-4 sm:text-sm ${
            activeTab === id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{label}</span>
          {id === 'tables' && tableCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-5 shrink-0 px-1.5 text-[10px] sm:ml-1 sm:text-xs">
              {tableCount}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}
