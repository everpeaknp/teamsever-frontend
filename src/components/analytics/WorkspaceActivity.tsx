'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  Plus, 
  Edit, 
  Trash2, 
  Users,
  FolderPlus,
  ListPlus,
  UserPlus,
  UserMinus,
  Clock,
  Building2
} from 'lucide-react';
import { api } from '@/lib/axios';

interface WorkspaceActivityProps {
  workspaceId: string;
  userId: string;
}

export function WorkspaceActivity({ workspaceId, userId }: WorkspaceActivityProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const INITIAL_LIMIT = 7;
  const LOAD_MORE_LIMIT = 10;

  useEffect(() => {
    fetchActivities(true);
  }, [workspaceId]);

  const fetchActivities = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
        setSkip(0);
      } else {
        setLoadingMore(true);
      }
      
      const currentSkip = isInitial ? 0 : skip;
      const limit = isInitial ? INITIAL_LIMIT : LOAD_MORE_LIMIT;
      
      console.log('[WorkspaceActivity] Fetching activities for workspace:', workspaceId);
      const response = await api.get(`/workspaces/${workspaceId}/activity`, {
        params: {
          limit: limit + 1, // Fetch one extra to check if there are more
          skip: currentSkip,
        },
      });
      
      console.log('[WorkspaceActivity] Response:', response.data);
      const fetchedActivities = response.data.data || [];
      
      // Check if there are more activities
      const hasMoreActivities = fetchedActivities.length > limit;
      const activitiesToAdd = hasMoreActivities ? fetchedActivities.slice(0, limit) : fetchedActivities;
      
      setHasMore(hasMoreActivities);
      
      if (isInitial) {
        setActivities(activitiesToAdd);
      } else {
        setActivities(prev => [...prev, ...activitiesToAdd]);
      }
      
      setSkip(currentSkip + activitiesToAdd.length);
      
      console.log('[WorkspaceActivity] Activities count:', activitiesToAdd.length);
      console.log('[WorkspaceActivity] Has more:', hasMoreActivities);
    } catch (error: any) {
      console.error('[WorkspaceActivity] Failed to fetch workspace activities:', error);
      console.error('[WorkspaceActivity] Error response:', error.response?.data);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchActivities(false);
    }
  };

  const handleSeeLess = () => {
    // Reset to initial state - show only first 7 activities
    setActivities(prev => prev.slice(0, INITIAL_LIMIT));
    setSkip(INITIAL_LIMIT);
    setHasMore(true); // Assume there might be more
  };

  // Group activities by date
  const groupedActivities = activities.reduce((groups: any, activity) => {
    const date = new Date(activity.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateKey: string;
    if (date.toDateString() === today.toDateString()) {
      dateKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = 'Yesterday';
    } else {
      dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
    return groups;
  }, {});

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getActivityIcon = (activity: any) => {
    // Workspace-level activities
    const iconMap: any = {
      workspace_created: <Building2 className="w-4 h-4 text-blue-500" />,
      workspace_updated: <Edit className="w-4 h-4 text-blue-500" />,
      member_joined: <UserPlus className="w-4 h-4 text-green-500" />,
      member_added: <UserPlus className="w-4 h-4 text-green-500" />,
      member_removed: <UserMinus className="w-4 h-4 text-red-500" />,
      space_created: <FolderPlus className="w-4 h-4 text-purple-500" />,
      space_updated: <Edit className="w-4 h-4 text-purple-500" />,
      space_deleted: <Trash2 className="w-4 h-4 text-red-500" />,
      list_created: <ListPlus className="w-4 h-4 text-emerald-500" />,
      list_updated: <Edit className="w-4 h-4 text-emerald-500" />,
      list_deleted: <Trash2 className="w-4 h-4 text-red-500" />,
      space_member_added: <Users className="w-4 h-4 text-amber-500" />,
      space_member_removed: <Users className="w-4 h-4 text-orange-500" />,
      list_member_added: <Users className="w-4 h-4 text-teal-500" />,
      list_member_removed: <Users className="w-4 h-4 text-pink-500" />,
    };
    
    if (iconMap[activity.type]) {
      return iconMap[activity.type];
    }

    // Task activities (comment/update)
    if (activity.type === 'comment') {
      return <Activity className="w-4 h-4 text-blue-500" />;
    }
    
    if (activity.type === 'update') {
      if (activity.fieldChanged === 'title' && !activity.oldValue) {
        return <Plus className="w-4 h-4 text-green-500" />;
      }
      return <Edit className="w-4 h-4 text-slate-500" />;
    }
    
    return <Activity className="w-4 h-4 text-slate-500" />;
  };

  const getActivityDescription = (activity: any) => {
    const user = activity.user || { name: 'Unknown User' };
    const targetUser = activity.targetUser || null;
    
    // Workspace-level activities (have description field)
    if (activity.description) {
      return (
        <>
          <span className="font-semibold">{user.name}</span>
          {' '}
          {activity.description}
          {targetUser && activity.type !== 'member_joined' && (
            <>
              {' '}
              <span className="font-semibold">{targetUser.name}</span>
            </>
          )}
        </>
      );
    }

    // Task activities (comment/update)
    let taskTitle = 'Unknown Task';
    if (activity.task) {
      if (typeof activity.task === 'string') {
        taskTitle = 'Task';
      } else {
        taskTitle = activity.task.title || 'Unknown Task';
      }
    }

    if (activity.type === 'comment') {
      return (
        <>
          <span className="font-semibold">{user.name}</span>
          {' commented on '}
          <span className="text-blue-600 dark:text-blue-400 font-medium">{taskTitle}</span>
        </>
      );
    } else if (activity.type === 'update') {
      const fieldLabels: any = {
        status: 'status',
        assignee: 'assignee',
        priority: 'priority',
        dueDate: 'due date',
        startDate: 'start date',
        title: 'title',
        description: 'description',
      };
      
      const field = fieldLabels[activity.fieldChanged] || activity.fieldChanged;
      
      // Task creation
      if (activity.fieldChanged === 'title' && !activity.oldValue) {
        return (
          <>
            <span className="font-semibold">{user.name}</span>
            {' created task '}
            <span className="text-blue-600 dark:text-blue-400 font-medium">{taskTitle}</span>
          </>
        );
      }
      
      // Task update
      return (
        <>
          <span className="font-semibold">{user.name}</span>
          {' changed '}
          <span className="font-medium">{field}</span>
          {' on '}
          <span className="text-blue-600 dark:text-blue-400 font-medium">{taskTitle}</span>
        </>
      );
    }
    
    return <span className="text-muted-foreground">Activity</span>;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      todo: { label: 'To Do', color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400' },
      inprogress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
      review: { label: 'Review', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' },
      done: { label: 'Done', color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
    };
    
    const config = statusConfig[status] || statusConfig.todo;
    return <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <div className="px-6 py-4 border-b">
          <h4 className="font-bold">Workspace Activity</h4>
          <p className="text-xs text-muted-foreground mt-1">Recent changes and updates</p>
        </div>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="px-6 py-4 border-b">
        <h4 className="font-bold">Workspace Activity</h4>
        <p className="text-xs text-muted-foreground mt-1">
          {activities.length} recent {activities.length === 1 ? 'activity' : 'activities'}
        </p>
      </div>
      <CardContent className="p-6">
        {/* Activity Timeline */}
        <div className="space-y-6">
          {activities.length === 0 && !loading ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground text-sm">No activities found</p>
              <p className="text-xs text-muted-foreground mt-2">
                Activities will appear here when you create spaces, lists, tasks, or make changes
              </p>
            </div>
          ) : (
            <>
              {Object.entries(groupedActivities).map(([date, dateActivities]: [string, any]) => (
                <div key={date} className="space-y-4">
                  {/* Date Header */}
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="px-3 py-1 text-xs">
                      {date}
                    </Badge>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Activities for this date */}
                  <div className="space-y-3 pl-4 border-l-2 border-border">
                    {dateActivities.map((activity: any) => {
                      const user = activity.user || { name: 'Unknown User', avatar: null };
                      
                      return (
                        <div key={activity._id} className="flex gap-3 group">
                          {/* Avatar */}
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <p className="text-sm">
                                  {getActivityDescription(activity)}
                                </p>
                                
                                {/* Show change details for status/priority changes */}
                                {activity.type === 'update' && activity.oldValue && activity.newValue && (
                                  <div className="flex items-center gap-2 mt-2">
                                    {activity.fieldChanged === 'status' && (
                                      <>
                                        {getStatusBadge(activity.oldValue)}
                                        <span className="text-xs text-muted-foreground">→</span>
                                        {getStatusBadge(activity.newValue)}
                                      </>
                                    )}
                                    {activity.fieldChanged !== 'status' && (
                                      <span className="text-xs text-muted-foreground">
                                        {activity.oldValue} → {activity.newValue}
                                      </span>
                                    )}
                                  </div>
                                )}
                                
                                {/* Show comment content */}
                                {activity.type === 'comment' && activity.content && (
                                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                                    {activity.content}
                                  </div>
                                )}
                              </div>
                              
                              {/* Icon */}
                              <div className="flex-shrink-0">
                                {getActivityIcon(activity)}
                              </div>
                            </div>
                            
                            {/* Timestamp */}
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {formatTime(activity.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* See More / See Less Buttons */}
              <div className="flex justify-center gap-3 pt-4">
                {/* See Less Button - Show when more than initial limit */}
                {activities.length > INITIAL_LIMIT && (
                  <button
                    onClick={handleSeeLess}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  >
                    See Less
                  </button>
                )}

                {/* See More Button - Show when there are more activities to load */}
                {hasMore && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      'See More'
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
