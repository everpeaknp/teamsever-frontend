'use client';

import { useMemo, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, AlertCircle, List as ListIcon, Loader2 } from 'lucide-react';
import { Task } from '@/types';
import Link from 'next/link';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

interface YourTasksProps {
  tasks: Task[];
  userId: string;
  workspaceId: string;
  mode?: 'all' | 'delayed-open';
}

interface ListMembership {
  _id: string;
  name: string;
  space: string;
  taskCount: number;
  completedCount: number;
}

export function YourTasks({ tasks, userId, workspaceId, mode = 'all' }: YourTasksProps) {
  const [myLists, setMyLists] = useState<ListMembership[]>([]);
  const { hierarchy } = useWorkspaceStore();
  const [loadingLists, setLoadingLists] = useState(false);

  const myTasks = useMemo(() => {
    return tasks.filter(task => {
      const assigneeId = typeof task.assignee === 'string' ? task.assignee : task.assignee?._id;
      return assigneeId === userId;
    });
  }, [tasks, userId]);

  const validListToSpaceMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!hierarchy?.spaces) return map;

    hierarchy.spaces.forEach((space: any) => {
      const sid = String(space?._id || '');
      if (!sid) return;

      (space?.lists || []).forEach((list: any) => {
        const lid = String(list?._id || '');
        if (lid) map.set(lid, sid);
      });

      (space?.folders || []).forEach((folder: any) => {
        (folder?.lists || []).forEach((list: any) => {
          const lid = String(list?._id || '');
          if (lid) map.set(lid, sid);
        });
      });
    });

    return map;
  }, [hierarchy]);

  const getTaskDestination = (task: Task) => {
    const rawList = task.list as any;
    const listId =
      typeof rawList === 'string' ? rawList : String(rawList?._id || '');
    if (!listId) return null;

    const mappedSpaceId = validListToSpaceMap.get(listId);
    if (!mappedSpaceId) return null;

    return `/workspace/${workspaceId}/spaces/${mappedSpaceId}/lists/${listId}`;
  };

  // Derive myLists from hierarchy
  useEffect(() => {
    if (!hierarchy) {
      setMyLists([]);
      return;
    }

    const userLists: ListMembership[] = [];

    hierarchy.spaces.forEach((space: any) => {
      const spaceLists = Array.isArray(space?.lists) ? space.lists : [];
      const spaceFolders = Array.isArray(space?.folders) ? space.folders : [];

      // Check standalone lists
      spaceLists.forEach((list: any) => {
        if (list.isMember) {
          userLists.push({
            _id: list._id,
            name: list.name,
            space: space._id,
            taskCount: list.taskCount || 0,
            completedCount: list.completedCount || 0,
          });
        }
      });

      // Check folders
      spaceFolders.forEach((folder: any) => {
        const folderLists = Array.isArray(folder?.lists) ? folder.lists : [];

        folderLists.forEach((list: any) => {
          if (list.isMember) {
            userLists.push({
              _id: list._id,
              name: list.name,
              space: space._id,
              taskCount: list.taskCount || 0,
              completedCount: list.completedCount || 0,
            });
          }
        });
      });
    });

    setMyLists(userLists);
  }, [hierarchy, userId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'inprogress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'review':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return <Circle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'inprogress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'review':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
      case 'low':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <Card>
      <div className="px-6 py-4 border-b">
        <h4 className="font-bold">Your Assigned Work</h4>
        <p className="text-xs text-muted-foreground mt-1">
          {mode === 'delayed-open'
            ? `${myTasks.length} delayed open tasks`
            : `${myTasks.length} tasks • ${myLists.length} lists`}
        </p>
      </div>
      <CardContent className="p-6">
        <div className="space-y-6 max-h-[400px] overflow-y-auto">
          {/* Lists Section */}
          {mode !== 'delayed-open' && loadingLists ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : mode !== 'delayed-open' && myLists.length > 0 ? (
            <div>
              <h5 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <ListIcon className="w-3.5 h-3.5" />
                Your Lists ({myLists.length})
              </h5>
              <div className="space-y-2">
                {myLists.map((list) => {
                  const completionRate = list.taskCount > 0 
                    ? Math.round((list.completedCount / list.taskCount) * 100) 
                    : 0;
                  
                  return (
                    <Link
                      key={list._id}
                      href={`/workspace/${workspaceId}/spaces/${list.space}/lists/${list._id}`}
                      className="block p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <ListIcon className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{list.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {list.completedCount}/{list.taskCount}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {completionRate}%
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Tasks Section */}
          {myTasks.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {mode === 'delayed-open' ? `Delayed Open Tasks (${myTasks.length})` : `Your Tasks (${myTasks.length})`}
              </h5>
              <div className="space-y-2">
                {myTasks.map((task) => {
                  const destination = getTaskDestination(task);
                  const cardClass =
                    'block p-3 rounded-lg border transition-colors';

                  const content = (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getStatusIcon(task.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                            {task.status}
                          </Badge>
                          {task.priority && (
                            <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );

                  if (!destination) {
                    return (
                      <button
                        key={task._id}
                        type="button"
                        className={`${cardClass} w-full text-left opacity-80 hover:bg-slate-50 dark:hover:bg-slate-800`}
                        onClick={() => toast.error('This task is linked to a list that no longer exists.')}
                      >
                        {content}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={task._id}
                      href={destination}
                      className={`${cardClass} hover:bg-slate-50 dark:hover:bg-slate-800`}
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loadingLists && myLists.length === 0 && myTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">
                {mode === 'delayed-open'
                  ? 'No delayed open tasks. Great job staying on track!'
                  : 'No lists or tasks assigned to you'}
              </p>
              {mode !== 'delayed-open' && (
                <p className="text-xs mt-1">Ask an admin to add you to a list</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
