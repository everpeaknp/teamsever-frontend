'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronRight,
  Folder,
  Plus,
  MoreHorizontal,
  Star,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useModalStore } from '@/store/useModalStore';
import { usePermissions } from '@/store/useAuthStore';
import { HierarchyItem } from '@/types/hierarchy';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HierarchyItemProps {
  item: HierarchyItem;
  level: number;
  workspaceId: string;
  parentSpaceId?: string;
}

const INDENT_SIZE = 22; // Increased for better tree visibility like in Lively
// Tree connectors should live in the gutter (left of the next level's chevron),
// otherwise the dot/line visually collides with the expand arrow.
const TREE_CONNECTOR_X_OFFSET = -10;

export const HierarchyItemComponent = React.memo(function HierarchyItemComponent({ item, level, workspaceId, parentSpaceId }: HierarchyItemProps) {
  const pathname = usePathname();
  
  // Optimized selectors
  const expandedIds = useUIStore(state => state.expandedIds);
  const toggleExpanded = useUIStore(state => state.toggleExpanded);
  const favoriteIds = useUIStore(state => state.favoriteIds);
  const toggleFavorite = useUIStore(state => state.toggleFavorite);
  
  const openModal = useModalStore(state => state.openModal);
  const { isAdmin, isOwner } = usePermissions();
  
  const [isHovered, setIsHovered] = useState(false);
  const [canCreateContent, setCanCreateContent] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Check if user is admin or owner
  const isAdminOrOwner = isAdmin() || isOwner();

  // Get userId from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserId = localStorage.getItem('userId');
      setUserId(storedUserId);
    }
  }, []);

  // Check if user can create content
  useEffect(() => {
    if (userId) {
      setCanCreateContent(isAdminOrOwner);
    }
  }, [userId, isAdminOrOwner]);

  // Admins and owners can rename spaces/folders/lists
  const canEdit = isAdminOrOwner;

  const isExpanded = expandedIds.includes(item._id);
  const isFavorite = favoriteIds.includes(item._id);

  // Determine if item has children
  const hasChildren =
    (item.type === 'space' && ((item.folders && item.folders.length > 0) || ((item as any).lists && (item as any).lists.length > 0))) ||
    (item.type === 'folder' && item.lists && item.lists.length > 0);

  // Get icon based on type
  const getIcon = () => {
    switch (item.type) {
      case 'space':
        return <Folder className="h-4 w-4 text-slate-500 dark:text-slate-400" />;
      case 'folder':
        const folderColor = (item as any).color || '#6366f1';
        return <Folder className="h-4 w-4" style={{ color: folderColor }} />;
      case 'list':
        return null; // No icon for lists like in the Lively screenshot
      default:
        return null;
    }
  };

  // Get route based on type
const getRoute = () => {
  switch (item.type) {
    case 'space':
      return `/workspace/${workspaceId}/spaces/${item._id}`;

    case 'folder':
      if (!parentSpaceId) return '#';
      return `/workspace/${workspaceId}/spaces/${parentSpaceId}?folder=${item._id}`;

    case 'list':
      if (!parentSpaceId) return '#';
      return `/workspace/${workspaceId}/spaces/${parentSpaceId}/lists/${item._id}`;

    default:
      return '#';
  }
};

  const route = getRoute();
  const isActive = pathname === route;

  // Handle click on chevron
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasChildren) {
      toggleExpanded(item._id);
    }
  };

  // Handle add action
  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Determine what to create based on current item type
    if (item.type === 'space') {
      // Create folder in space
      openModal('folder', item._id, 'space', item.name);
    } else if (item.type === 'folder') {
      // Create list in folder - pass spaceId as 5th parameter
      const spaceId = parentSpaceId || (item as any).space || (item as any).spaceId;
      openModal('list', item._id, 'folder', item.name, spaceId);
    }
  };

  // Handle favorite toggle
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(item._id);
  };

  return (
    <div>
      {/* Main Item Row */}
      <div
        className="group relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ paddingLeft: `${level * INDENT_SIZE}px` }}
      >
        <div className={cn(
          "flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all duration-200 glass-hover",
          isActive ? "bg-primary/10 dark:bg-primary/20" : ""
        )}>
          {/* Chevron - Only show if has children */}
          <button
            onClick={handleToggle}
            className={cn(
              'flex items-center justify-center h-5 w-5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors flex-shrink-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/25',
              !hasChildren && 'invisible'
            )}
            aria-label={hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : undefined}
            type="button"
          >
            {hasChildren && (
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200",
                  isExpanded && "rotate-90"
                )}
              />
            )}
          </button>

          {/* Icon */}
          <div className="flex-shrink-0 opacity-90">{getIcon()}</div>

          {/* Name - Clickable Link */}
          <Link
            href={route}
            className={cn(
              'flex-1 text-[13.5px] truncate tracking-tight py-0.5',
              isActive && 'text-slate-900 dark:text-white font-semibold',
              !isActive && 'text-slate-500 dark:text-slate-400 font-medium'
            )}
          >
            {item.name}
          </Link>

          {/* Favorite Star */}
          {isFavorite && (
            <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
          )}

          {/* Hover Actions */}
          {isHovered && isAdminOrOwner && (
            <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Add Button - For spaces: create folder */}
              {item.type === 'space' && canCreateContent && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 dark:hover:bg-slate-700"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAdd(e);
                  }}
                  title="Create folder"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
              
              {/* Add Button - For folders: create list */}
              {item.type === 'folder' && canCreateContent && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 dark:hover:bg-slate-700"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAdd(e);
                  }}
                  title="Create list"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}

              {/* More Menu */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 dark:hover:bg-slate-700"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-48 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(e);
                    }}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  </DropdownMenuItem>
                  
                  {/* Edit options for owner only */}
                  {canEdit && (
                    <>
                      <DropdownMenuSeparator />
                      {item.type === 'space' && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openModal('editSpace', item._id, 'space', item.name);
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4 mr-2" />
                          Rename space
                        </DropdownMenuItem>
                      )}
                      {item.type === 'folder' && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openModal('editFolder', item._id, 'folder', item.name);
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4 mr-2" />
                          Rename folder
                        </DropdownMenuItem>
                      )}
                      {item.type === 'list' && (
                        <>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // For lists, parent is either folder or space
                              const parentType = (item as any).folder ? 'folder' : 'space';
                              openModal('editList', item._id, parentType, item.name);
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4 mr-2" />
                            Rename list
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const parentType = (item as any).folder ? 'folder' : 'space';
                              const spaceId = parentSpaceId || (item as any).space || (item as any).spaceId;
                              openModal('deleteList', item._id, parentType, item.name, spaceId);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete list
                          </DropdownMenuItem>
                        </>
                      )}
                      {item.type === 'folder' && (
                         <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const spaceId = parentSpaceId || (item as any).space || (item as any).spaceId;
                              openModal('deleteFolder', item._id, 'space', item.name, spaceId);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete folder
                          </DropdownMenuItem>
                      )}
                      {item.type === 'space' && (
                         <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openModal('deleteSpace', item._id, 'workspace', item.name, item._id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete space
                          </DropdownMenuItem>
                      )}
                    </>
                  )}
                  
                  {/* Create actions */}
                  {canCreateContent && (
                    <>
                      <DropdownMenuSeparator />
                      {item.type === 'space' && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openModal('folder', item._id, 'space', item.name);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          New folder
                        </DropdownMenuItem>
                      )}
                      {item.type === 'folder' && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const spaceId = parentSpaceId || (item as any).space || (item as any).spaceId;
                            openModal('list', item._id, 'folder', item.name, spaceId);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          New list
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

{isExpanded && (
    <div className="mt-1 tree-line-container">
    {/* Vertical Line for children - starts from this item's icon center */}
    <div 
      className="tree-v-line" 
      style={{ 
        left: `${(level + 1) * INDENT_SIZE + TREE_CONNECTOR_X_OFFSET}px`,
      }} 
    />

    {/* SPACE CHILDREN */}
    {item.type === 'space' && (
      <>
        {/* Render folders */}
        {item.folders?.map((folder) => (
          <div key={folder._id} className="relative">
            <div className="tree-elbow" style={{ left: `${(level + 1) * INDENT_SIZE + TREE_CONNECTOR_X_OFFSET}px` }} />
            <div className="tree-dot" style={{ left: `${(level + 1) * INDENT_SIZE + TREE_CONNECTOR_X_OFFSET}px` }} />
            <HierarchyItemComponent
              item={folder}
              level={level + 1}
              workspaceId={workspaceId}
              parentSpaceId={item._id}
            />
          </div>
        ))}

        {/* Render standalone lists (lists without folder) */}
        {(item as any).lists?.map((list: any) => (
          <div key={list._id} className="relative">
            <div className="tree-elbow" style={{ left: `${(level + 1) * INDENT_SIZE + TREE_CONNECTOR_X_OFFSET}px` }} />
            <div className="tree-dot" style={{ left: `${(level + 1) * INDENT_SIZE + TREE_CONNECTOR_X_OFFSET}px` }} />
            <HierarchyItemComponent
              item={list}
              level={level + 1}
              workspaceId={workspaceId}
              parentSpaceId={item._id}
            />
          </div>
        ))}
      </>
    )}

    {/* FOLDER CHILDREN */}
    {item.type === 'folder' && (
      <>
        {item.lists?.map((list) => (
          <div key={list._id} className="relative">
            <div className="tree-elbow" style={{ left: `${(level + 1) * INDENT_SIZE + TREE_CONNECTOR_X_OFFSET}px` }} />
            <div className="tree-dot" style={{ left: `${(level + 1) * INDENT_SIZE + TREE_CONNECTOR_X_OFFSET}px` }} />
            <HierarchyItemComponent
              item={list}
              level={level + 1}
              workspaceId={workspaceId}
              parentSpaceId={parentSpaceId}
            />
          </div>
        ))}
      </>
    )}
  </div>
)}
    </div>
  );
});
