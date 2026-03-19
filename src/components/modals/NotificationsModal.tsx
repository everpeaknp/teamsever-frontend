'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useNotificationStore } from '@/store/useNotificationStore';
import { toast } from 'sonner';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Loader2,
  UserPlus,
  MessageSquare,
  Calendar,
  Mail,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsModal({ isOpen, onClose }: NotificationsModalProps) {
  const {
    notifications,
    unreadCount,
    setNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotificationStore();

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

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

  const handleMarkAsRead = async (notificationId: string, notificationType: string) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      
      const isMessageNotification = [
        'MESSAGE',
        'DIRECT_MESSAGE', 
        'CHAT_MESSAGE',
        'NEW_MESSAGE',
        'COMMENT_ADDED',
        'MENTION'
      ].includes(notificationType);
      
      if (isMessageNotification) {
        removeNotification(notificationId);
      } else {
        markAsRead(notificationId);
      }
      
      const response = await api.get('/notifications/unread-count');
      const { setUnreadCount } = useNotificationStore.getState();
      setUnreadCount(response.data.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      markAllAsRead();
      
      const response = await api.get('/notifications/unread-count');
      const { setUnreadCount } = useNotificationStore.getState();
      setUnreadCount(response.data.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleAcceptInvitation = async (notification: any) => {
    if (!notification.data?.token) {
      toast.error('Invalid invitation');
      return;
    }

    try {
      setAccepting(notification._id);
      
      const response = await api.post(`/invites/accept/${notification.data.token}`);
      const data = response.data.data;

      await handleMarkAsRead(notification._id, notification.type);

      toast.success(`Successfully joined ${data.workspace.name}!`);

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      toast.error(error.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setAccepting(null);
    }
  };

  const handleDeclineInvitation = async (notification: any) => {
    await handleMarkAsRead(notification._id, notification.type);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'INVITATION':
        return <Mail className="w-5 h-5 text-purple-500" />;
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">Notifications</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                variant="outline"
                size="sm"
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => setFilter('all')}
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
            >
              All ({notifications.length})
            </Button>
            <Button
              onClick={() => setFilter('unread')}
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
            >
              Unread ({unreadCount})
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-180px)]">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <BellOff className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </h3>
                <p className="text-muted-foreground text-sm">
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
                    className={`rounded-lg border p-4 transition-all ${
                      notification.read
                        ? 'border-border hover:border-border/80'
                        : 'border-primary/50 bg-primary/5 hover:border-primary'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-medium">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.body}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>

                        {notification.type === 'INVITATION' && !notification.read && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              onClick={() => handleAcceptInvitation(notification)}
                              disabled={accepting === notification._id}
                              size="sm"
                              className="flex-1"
                            >
                              {accepting === notification._id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Accepting...
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Accept
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => handleDeclineInvitation(notification)}
                              disabled={accepting === notification._id}
                              variant="outline"
                              size="sm"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Decline
                            </Button>
                          </div>
                        )}

                        {notification.type !== 'INVITATION' && !notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification._id, notification.type)}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
