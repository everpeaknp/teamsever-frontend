'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Folder, FileText, Plus, ChevronDown, ChevronRight, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSpaceListsMetadata } from '@/hooks/queries/useSpace';

interface SpaceListsProps {
  spaceId: string;
  workspaceId: string;
  spaceColor: string;
  canCreateContent: boolean;
  shouldShowAdminButtons: boolean;
  isReadOnly: boolean;
  onCreateFolder: () => void;
  onCreateList: (folderId?: string) => void;
  onDeleteList: (listId: string, listName: string) => void;
  folders: any[];
}

export function SpaceLists({
  spaceId,
  workspaceId,
  spaceColor,
  canCreateContent,
  shouldShowAdminButtons,
  isReadOnly,
  onCreateFolder,
  onCreateList,
  onDeleteList,
  folders
}: SpaceListsProps) {
  const router = useRouter();
  const { data: lists = [] } = useSpaceListsMetadata(spaceId);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  // Separate lists by folder
  const unassignedLists = lists.filter((list: any) => !list.folderId);
  
  // Group lists by folder
  const foldersWithLists = folders.map(folder => ({
    ...folder,
    lists: lists.filter((list: any) => list.folderId === folder._id)
  }));

  if (lists.length === 0 && folders.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${spaceColor}20` }}>
            <FileText className="w-8 h-8" style={{ color: spaceColor }} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Get Started</h3>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-md px-4">
            Create folders to organize your lists. Lists can only be created inside folders.
          </p>
          {canCreateContent && (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-4">
              <Button variant="outline" onClick={onCreateFolder} className="w-full sm:w-auto">
                <Folder className="w-4 h-4 mr-2" />
                Create Folder
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {foldersWithLists.map((folder) => (
        <Card key={folder._id}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 border-b">
              <button 
                onClick={() => toggleFolder(folder._id)} 
                className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity min-w-0"
              >
                {expandedFolders[folder._id] ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" 
                  style={{ backgroundColor: `${folder.color || spaceColor}20` }}
                >
                  <Folder className="w-5 h-5" style={{ color: folder.color || spaceColor }} />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{folder.name}</h3>
                  <p className="text-sm text-muted-foreground">{folder.lists?.length || 0} lists</p>
                </div>
              </button>
              {canCreateContent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateList(folder._id);
                  }}
                  className="ml-2 flex-shrink-0"
                >
                  <Plus className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Add List</span>
                </Button>
              )}
            </div>
            {expandedFolders[folder._id] && (
              <div className="divide-y">
                {folder.lists?.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-muted-foreground mb-3">No lists in this folder</p>
                    {canCreateContent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCreateList(folder._id)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create First List
                      </Button>
                    )}
                  </div>
                ) : (
                  folder.lists?.map((list: any) => (
                    <ListItem
                      key={list._id}
                      list={list}
                      spaceColor={spaceColor}
                      workspaceId={workspaceId}
                      spaceId={spaceId}
                      canManage={shouldShowAdminButtons}
                      isReadOnly={isReadOnly}
                      onDelete={onDeleteList}
                    />
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      
      {unassignedLists.length > 0 && (
        <div className="space-y-2">
          {unassignedLists.map((list: any) => (
            <ListItem
              key={list._id}
              list={list}
              spaceColor={spaceColor}
              workspaceId={workspaceId}
              spaceId={spaceId}
              canManage={shouldShowAdminButtons}
              isReadOnly={isReadOnly}
              onDelete={onDeleteList}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ListItemProps {
  list: any;
  spaceColor: string;
  workspaceId: string;
  spaceId: string;
  canManage: boolean;
  isReadOnly: boolean;
  onDelete: (listId: string, listName: string) => void;
}

function ListItem({ list, spaceColor, workspaceId, spaceId, canManage, isReadOnly, onDelete }: ListItemProps) {
  const router = useRouter();
  const taskCount = list.taskCount || 0;
  const completedCount = list.completedCount || 0;
  const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50" 
      onClick={() => router.push(`/workspace/${workspaceId}/spaces/${spaceId}/lists/${list._id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${spaceColor}20` }}>
              <FileText className="w-5 h-5" style={{ color: spaceColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{list.name}</h4>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-sm text-muted-foreground">{completedCount}/{taskCount} tasks</span>
                <div className="flex-1 max-w-[100px]">
                  <Progress value={progress} className="h-1.5" />
                </div>
                <span className="text-xs text-muted-foreground">{progress}%</span>
              </div>
            </div>
          </div>
          {canManage && !isReadOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="p-1 hover:bg-accent rounded transition-colors">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit List
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onDelete(list._id, list.name); 
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
