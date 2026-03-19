'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useActivityStore } from '@/store/useActivityStore';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowLeft, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function ActivityLogPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  
  const { activities, loading, fetchActivities } = useActivityStore();

  useEffect(() => {
    if (workspaceId) {
      fetchActivities({ workspaceId });
    }
  }, [workspaceId, fetchActivities]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'created_space':
        return 'created space';
      case 'completed_task':
        return 'completed task';
      case 'deactivated_space':
        return 'deactivated space';
      case 'activated_space':
        return 'activated space';
      case 'deleted_space':
        return 'deleted space';
      case 'created_task':
        return 'created task';
      case 'updated_task':
        return 'updated task';
      case 'deleted_task':
        return 'deleted task';
      default:
        return action.replace(/_/g, ' ');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/workspace/${workspaceId}`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="w-8 h-8" />
                Activity Log
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {activities.length} activities recorded
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activities.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Activity Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Activity will appear here as your team works
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {activities.map((activity) => (
                  <div
                    key={activity._id}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={activity.user.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {getInitials(activity.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-base">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {activity.user.name}
                          </span>
                          {' '}
                          <span className="text-gray-600 dark:text-gray-400">
                            {activity.type === 'comment' ? 'commented on' : 'updated'}
                          </span>
                          {' '}
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {activity.task.title}
                          </span>
                        </p>
                        {activity.content && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                            {activity.content}
                          </p>
                        )}
                        {activity.fieldChanged && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Changed {activity.fieldChanged}: {activity.oldValue} → {activity.newValue}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(activity.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
