'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  AlertCircle,
  Mail,
  ArrowLeft,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const router = useRouter();
  
  const {
    notifications,
    unreadCount,
    permission,
    setNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    requestPermission,
    syncPermission,
  } = useNotificationStore();

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [accepting, setAccepting] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Sync permission state with browser
    syncPermission();
    
    fetchNotifications();
    
    // Check permission and set banner visibility
    const checkPermission = () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const currentPermission = Notification.permission;
        console.log('🔔 [NOTIFICATION CHECK]');
        console.log('🔔 Browser Notification.permission:', currentPermission);
        console.log('🔔 Store permission:', permission);
        console.log('🔔 Should show banner:', currentPermission !== 'granted');
        console.log('🔔 Banner state will be set to:', currentPermission !== 'granted');
        
        // Always show banner if permission is not granted
        const shouldShow = currentPermission !== 'granted';
        setShowBanner(shouldShow);
        
        console.log('🔔 Banner visibility set to:', shouldShow);
      } else {
        console.log('❌ Notifications not supported or window not available');
      }
    };
    
    checkPermission();
    
    // Debug: Log permission status
    console.log('🔔 Initial notification permission status:', permission);
  }, []);

  useEffect(() => {
    // Update banner when permission changes
    console.log('🔔 [PERMISSION CHANGED]');
    console.log('🔔 New permission value:', permission);
    
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const currentPermission = Notification.permission;
      const shouldShow = currentPermission !== 'granted';
      
      console.log('🔔 Browser permission:', currentPermission);
      console.log('🔔 Setting banner to:', shouldShow);
      
      setShowBanner(shouldShow);
    }
  }, [permission]);

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
      
      // Check if it's a message notification
      const isMessageNotification = [
        'MESSAGE',
        'DIRECT_MESSAGE', 
        'CHAT_MESSAGE',
        'NEW_MESSAGE',
        'COMMENT_ADDED',
        'MENTION'
      ].includes(notificationType);
      
      if (isMessageNotification) {
        // Remove message notifications from the list
        removeNotification(notificationId);
      } else {
        // Just mark as read for other notifications
        markAsRead(notificationId);
      }
      
      // Refresh unread count
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
      
      // Refresh unread count
      const response = await api.get('/notifications/unread-count');
      const { setUnreadCount } = useNotificationStore.getState();
      setUnreadCount(response.data.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      console.log('🔔 Requesting notification permission...');
      
      // First, request basic browser notification permission
      if (!('Notification' in window)) {
        alert('This browser does not support notifications');
        return;
      }

      console.log('🔔 Current permission:', Notification.permission);
      
      const result = await requestPermission();
      console.log('🔔 Permission result:', result);
      
      if (result === 'granted') {
        setShowBanner(false);
        console.log('✅ Notification permission granted!');
        alert('Browser notifications enabled! You will now receive notifications.');
      } else if (result === 'denied') {
        console.log('❌ Notification permission denied');
        alert('Notification permission was denied. Please enable it in your browser settings.');
      } else {
        console.log('⚠️ Notification permission dismissed');
        alert('Please allow notifications to receive updates.');
      }
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      alert('Failed to enable notifications. Please check browser console for details.');
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

  const handleDeclineInvitation = async (notification: any) => {
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

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#111111]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111111]">
      {/* Header */}
      <header className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-[#262626] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-[#262626] rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-[#262626] rounded-lg transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-[#262626]'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'unread'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-[#262626]'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Debug Info - Remove this after testing */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-gray-100 dark:bg-[#262626] rounded-lg text-xs font-mono">
            <div className="text-gray-700 dark:text-slate-300">
              <strong>Debug Info:</strong>
            </div>
            <div className="text-gray-600 dark:text-slate-400">
              Browser Permission: {typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'N/A'}
            </div>
            <div className="text-gray-600 dark:text-slate-400">
              Store Permission: {permission}
            </div>
            <div className="text-gray-600 dark:text-slate-400">
              Show Banner: {showBanner ? 'Yes' : 'No'}
            </div>
            <div className="text-gray-600 dark:text-slate-400">
              Banner Should Show: {typeof window !== 'undefined' && 'Notification' in window ? (Notification.permission !== 'granted' ? 'Yes' : 'No') : 'N/A'}
            </div>
          </div>
        )}

        {/* Browser Notification Permission */}
        {showBanner && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-1">
                  Enable Desktop Notifications
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                  Get notified even when TaskHub is in the background
                </p>
                <button
                  onClick={handleEnableNotifications}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
            <div className="w-16 h-16 bg-gray-100 dark:bg-[#262626] rounded-full flex items-center justify-center mx-auto mb-4">
              <BellOff className="w-8 h-8 text-gray-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-gray-600 dark:text-slate-400">
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
                className={`bg-white dark:bg-[#1a1a1a] rounded-lg border transition-all ${
                  notification.read
                    ? 'border-gray-200 dark:border-[#262626] hover:border-gray-300 dark:hover:border-[#333]'
                    : 'border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-900/10 hover:border-purple-300 dark:hover:border-purple-700'
                }`}
              >
                <div className="p-4 flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                      {notification.body}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mb-2">
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
                          className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {accepting === notification._id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Accepting...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Accept
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeclineInvitation(notification)}
                          disabled={accepting === notification._id}
                          className="px-4 py-2 border border-gray-300 dark:border-[#262626] text-gray-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-[#262626] transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Decline
                        </button>
                      </div>
                    )}

                    {/* Standard Mark as Read */}
                    {notification.type !== 'INVITATION' && !notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification._id, notification.type)}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
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
      </main>
    </div>
  );
}
