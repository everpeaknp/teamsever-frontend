'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { useNotificationStore } from '@/store/useNotificationStore';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Loader2,
  Settings,
  Trash2,
  UserPlus,
  MessageSquare,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  
  const {
    notifications,
    unreadCount,
    permission,
    setNotifications,
    markAsRead,
    markAllAsRead,
    requestPermission,
  } = useNotificationStore();

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchNotifications();
  }, [workspaceId]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleEnableNotifications = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      alert('Browser notifications enabled!');
    } else {
      alert('Please enable notifications in your browser settings.');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'INVITE_ACCEPTED':
      case 'MEMBER_JOINED':
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'TASK_ASSIGNED':
      case 'TASK_UPDATED':
        return <CheckCheck className="w-5 h-5 text-green-500" />;
      case 'COMMENT_ADDED':
      case 'MENTION':
        return <MessageSquare className="w-5 h-5 text-purple-500" />;
      case 'DUE_DATE_REMINDER':
        return <Calendar className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Notifications</h1>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent sm:w-auto"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'unread'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Browser Notification Permission */}
        {permission !== 'granted' && (
          <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-foreground mb-1">
                  Enable Desktop Notifications
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                   Get notified even when Teamsever is in the background
                </p>
                <button
                  onClick={handleEnableNotifications}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
                >
                  Enable Notifications
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <BellOff className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-muted-foreground">
              {filter === 'unread'
                ? "You're all caught up!"
                : "We'll notify you when something important happens"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <div
                key={notification._id}
                className={`bg-card rounded-lg border transition-all cursor-pointer ${
                  notification.read
                    ? 'border-border hover:border-border/80'
                    : 'border-primary/20 bg-primary/5 hover:border-primary/30'
                }`}
                onClick={() => {
                  if (!notification.read) {
                    handleMarkAsRead(notification._id);
                  }
                  // Navigate to relevant page if data provided
                  if (notification.data?.workspaceId) {
                    router.push(`/workspace/${notification.data.workspaceId}`);
                  }
                }}
              >
                <div className="flex items-start gap-3 p-4 sm:gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium text-foreground">
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.body}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>

                  {/* Actions */}
                  {!notification.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification._id);
                      }}
                      className="flex-shrink-0 p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
