'use client';

import { useState, Suspense, lazy } from 'react';
import { FileText, Table as TableIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TablesSkeleton } from '@/components/skeletons/SpaceSkeletons';

interface LazyTabsProps {
  spaceId: string;
  workspaceId: string;
  spaceColor: string;
  canCreateContent: boolean;
  isOwner: boolean;
  tables: any[];
  onCreateTable: () => void;
  onDeleteTable: (tableId: string, tableName: string) => void;
}

export function LazyTabs({
  spaceId,
  workspaceId,
  spaceColor,
  canCreateContent,
  isOwner,
  tables,
  onCreateTable,
  onDeleteTable
}: LazyTabsProps) {
  const [activeTab, setActiveTab] = useState<'lists' | 'tables'>('lists');
  const [hasLoadedTables, setHasLoadedTables] = useState(false);

  const handleTabClick = (tab: 'lists' | 'tables') => {
    setActiveTab(tab);
    if (tab === 'tables' && !hasLoadedTables) {
      setHasLoadedTables(true);
    }
  };

  return (
    <>
      {/* Tabs Navigation */}
      <div className="flex items-center gap-4 mb-6 border-b border-border">
        <button
          onClick={() => handleTabClick('lists')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'lists'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Lists & Folders</span>
          </div>
        </button>
        <button
          onClick={() => handleTabClick('tables')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'tables'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4" />
            <span>Tables</span>
            {tables.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {tables.length}
              </Badge>
            )}
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'tables' && hasLoadedTables && (
        <Suspense fallback={<TablesSkeleton />}>
          <TablesContent
            spaceId={spaceId}
            workspaceId={workspaceId}
            spaceColor={spaceColor}
            canCreateContent={canCreateContent}
            isOwner={isOwner}
            tables={tables}
            onCreateTable={onCreateTable}
            onDeleteTable={onDeleteTable}
          />
        </Suspense>
      )}
    </>
  );
}

// Lazy-loaded Tables content
function TablesContent({
  spaceId,
  workspaceId,
  spaceColor,
  canCreateContent,
  isOwner,
  tables,
  onCreateTable,
  onDeleteTable
}: Omit<LazyTabsProps, 'activeTab'>) {
  // This component will be lazy-loaded only when the Tables tab is clicked
  // For now, we'll keep the existing tables logic here
  // In a future optimization, we could fetch tables data here instead of in the parent
  
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Tables section loaded on-demand. Content will be rendered here.
      </p>
    </div>
  );
}
