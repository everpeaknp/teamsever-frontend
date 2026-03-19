'use client';

import { useMemo, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, AlertCircle, List as ListIcon, Loader2 } from 'lucide-react';
import { Task } from '@/types';
import Link from 'next/link';
import { api } from '@/lib/axios';

interface YourTasksProps {
  tasks: Task[];
  userId: string;
  workspaceId: string;
}

interface ListMembership {
  _id: string;
  name: string;
  space: string;
  taskCount: number;
  completedCount: number;
}

export function YourTasks({ tasks, userId, workspaceId }: YourTasksProps) {
  const [myLists, setMyLists] = useState<ListMembership[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const myTasks = useMemo(() => {
    return tasks.filter(task => {
      const assigneeId = typeof task.assignee === 'string' ? task.assignee : task.assignee?._id;
      return assigneeId === userId;
    });
  }, [tasks, userId]);

  // Fetch lists where user is a member
  useEffect(() => {
    const fetchMyLists = async () => {
      try {
        setLoadingLists(true);
        // Get all spaces in workspace
        const spacesRes = await api.get(`/workspaces/${workspaceId}/spaces`);
        const spaces = spacesRes.data.data || [];

        const userLists: ListMembership[] = [];

        // Check each space for lists where user is a member
        for (const space of spaces) {
          try {
            const listsRes = await api.get(`/spaces/${space._id}/lists`);
            const lists = listsRes.data.data || [];

            for (const list of lists) {
              try {
                // Check if user is a list member
                const membersRes = await api.get(`/lists/${list._id}/list-members`);
                const members = membersRes.data.data || [];
                
                const isMember = members.some((m: any) => 
                  m._id === userId && m.hasOverride === true
                );

                if (isMember) {
                  userLists.push({
                    _id: list._id,
                    name: list.name,
                    space: space._id,
                    taskCount: list.taskCount || 0,
                    completedCount: list.completedCount || 0,
                  });
                }
              } catch (err) {
                console.error(`Failed to fetch members for list ${list._id}:`, err);
              }
            }
          } catch (err) {
            console.error(`Failed to fetch lists for space ${space._id}:`, err);
          }
        }

        setMyLists(userLists);
      } catch (error) {
        console.error('Failed to fetch user lists:', error);
      } finally {
        setLoadingLists(false);
      }
    };

    if (userId && workspaceId) {
      fetchMyLists();
    }
  }, [userId, workspaceId]);

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
          {myTasks.length} tasks • {myLists.length} lists
        </p>
      </div>
      <CardContent className="p-6">
        <div className="space-y-6 max-h-[400px] overflow-y-auto">
          {/* Lists Section */}
          {loadingLists ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : myLists.length > 0 ? (
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
                Your Tasks ({myTasks.length})
              </h5>
              <div className="space-y-2">
                {myTasks.map((task) => (
                  <Link
                    key={task._id}
                    href={`/workspace/${workspaceId}/spaces/${task.space}/lists/${task.list}`}
                    className="block p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
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
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loadingLists && myLists.length === 0 && myTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No lists or tasks assigned to you</p>
              <p className="text-xs mt-1">Ask an admin to add you to a list</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
