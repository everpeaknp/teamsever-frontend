'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/axios';
import { useSocket } from '@/contexts/SocketContext';
import { useNotificationStore, Notification } from '@/store/useNotificationStore';
import { toast } from 'sonner';
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Loader2,
  UserPlus,
  MessageSquare,
  Calendar,
  Mail,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell() {
  const router = useRouter();
  const { socket } = useSocket();
  const {
    notifications,
    unreadCount,
    setNotifications,
    addNotification,
    markAsRead,
    removeNotification,
    setUnreadCount,
    setLoading,
  } = useNotificationStore();

  const [isOpen, setIsOpen] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications on mount
  useEffect(() => {
    // Check if user is authenticated before fetching
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (!token || token === 'undefined' || token === 'null') {
        // User not authenticated, skip fetch
        return;
      }
    }
    
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  // Socket listener for real-time notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: { notification: Notification }) => {
      console.log('[NotificationBell] New notification received:', data);
      addNotification(data.notification);
      
      // Play notification sound (optional)
      // playNotificationSound();
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, addNotification]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      // Check if user is authenticated
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (!token || token === 'undefined' || token === 'null') {
          return;
        }
      }
      
      setLoading(true);
      // Only fetch unread notifications for the bell dropdown
      const response = await api.get('/notifications?limit=20&unreadOnly=true');
      setNotifications(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      // Check if user is authenticated
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (!token || token === 'undefined' || token === 'null') {
          return;
        }
      }
      
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string, notificationType: string) => {
    try {
      // Call backend API
      await api.patch(`/notifications/${notificationId}/read`);
      
      // Always remove the notification from the bell dropdown
      // (since we only show unread notifications in the bell)
      removeNotification(notificationId);
      
      // Refresh unread count from server
      await fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleAcceptInvitation = async (notification: Notification) => {
    if (!notification.data?.token) {
      toast.error('Invalid invitation');
      return;
    }

    try {
      setAccepting(notification._id);
      
      const response = await api.post(`/invites/accept/${notification.data.token}`);
      const data = response.data.data;

      // Mark notification as read
      await handleMarkAsRead(notification._id, notification.type);

      // Show success message
      toast.success(`Successfully joined ${data.workspace.name}!`);

      // Refresh the page to update sidebar with new workspace
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

  const handleDeclineInvitation = async (notification: Notification) => {
    // Just mark as read
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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-9 w-9 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#262626] rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-card rounded-lg shadow-2xl border border-border z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={async () => {
                  try {
                    // Call backend API to mark all as read
                    await api.patch('/notifications/read-all');
                    
                    // Clear all notifications from the bell dropdown
                    const { clearNotifications } = useNotificationStore.getState();
                    clearNotifications();
                    
                    // Refresh unread count (should be 0)
                    await fetchUnreadCount();
                  } catch (error) {
                    console.error('Failed to mark all as read:', error);
                  }
                }}
                className="text-xs text-primary hover:text-primary/80 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-4 hover:bg-accent transition-colors ${
                      !notification.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-medium text-foreground">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
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

                        {/* Invitation Actions */}
                        {notification.type === 'INVITATION' && !notification.read && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleAcceptInvitation(notification)}
                              disabled={accepting === notification._id}
                              className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {accepting === notification._id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Accepting...
                                </>
                              ) : (
                                <>
                                  <Check className="w-3 h-3" />
                                  Accept
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDeclineInvitation(notification)}
                              disabled={accepting === notification._id}
                              className="px-3 py-1.5 border border-border text-muted-foreground text-sm font-medium rounded-lg hover:bg-accent transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              Decline
                            </button>
                          </div>
                        )}

                        {/* Standard Mark as Read */}
                        {notification.type !== 'INVITATION' && !notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification._id, notification.type)}
                            className="text-xs text-primary hover:text-primary/80 font-medium"
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

          {/* Footer */}
          <div className="p-3 border-t border-border">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/notifications');
              }}
              className="w-full text-center text-sm text-primary hover:text-primary/80 font-medium"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
