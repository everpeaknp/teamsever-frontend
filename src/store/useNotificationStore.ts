import { create } from 'zustand';
import { requestNotificationPermission, onMessageListener } from '@/lib/firebase';
import { api } from '@/lib/axios';

export interface Notification {
  _id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data?: {
    token?: string;
    workspaceId?: string;
    inviteUrl?: string;
    workspaceName?: string;
    inviterName?: string;
    resourceId?: string;
    resourceType?: string;
    [key: string]: any;
  };
  createdAt: string;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  permission: NotificationPermission;
  isLoading: boolean;
  fcmToken: string | null;
  
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearNotifications: () => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  requestPermission: () => Promise<NotificationPermission>;
  showBrowserNotification: (title: string, body: string, data?: any) => void;
  initializeFCM: () => Promise<void>;
  setFCMToken: (token: string | null) => void;
  syncPermission: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  permission: typeof window !== 'undefined' ? Notification.permission : 'default',
  isLoading: false,
  fcmToken: null,

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount });
  },

  addNotification: (notification) => {
    const { notifications } = get();
    const newNotifications = [notification, ...notifications];
    const unreadCount = newNotifications.filter((n) => !n.read).length;
    
    set({ notifications: newNotifications, unreadCount });

    // Show browser notification if permission granted
    if (get().permission === 'granted' && !notification.read) {
      get().showBrowserNotification(notification.title, notification.body, notification.data);
    }
  },

  markAsRead: (notificationId) => {
    const { notifications } = get();
    const updatedNotifications = notifications.map((n) =>
      n._id === notificationId ? { ...n, read: true } : n
    );
    const unreadCount = updatedNotifications.filter((n) => !n.read).length;
    
    set({ notifications: updatedNotifications, unreadCount });
  },

  markAllAsRead: () => {
    const { notifications } = get();
    const updatedNotifications = notifications.map((n) => ({ ...n, read: true }));
    
    set({ notifications: updatedNotifications, unreadCount: 0 });
  },

  removeNotification: (notificationId) => {
    const { notifications } = get();
    const updatedNotifications = notifications.filter((n) => n._id !== notificationId);
    const unreadCount = updatedNotifications.filter((n) => !n.read).length;
    
    set({ notifications: updatedNotifications, unreadCount });
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  setUnreadCount: (count) => {
    set({ unreadCount: count });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  requestPermission: async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.error('❌ Notifications not supported in this browser');
      return 'denied';
    }

    try {
      console.log('🔔 Requesting browser notification permission...');
      console.log('🔔 Current permission:', Notification.permission);
      
      // If already granted, just initialize FCM
      if (Notification.permission === 'granted') {
        console.log('✅ Permission already granted');
        set({ permission: 'granted' });
        await get().initializeFCM();
        return 'granted';
      }
      
      // Request permission
      const permission = await Notification.requestPermission();
      console.log('🔔 Permission response:', permission);
      
      set({ permission });
      
      // If permission granted, initialize FCM
      if (permission === 'granted') {
        console.log('✅ Permission granted, initializing FCM...');
        await get().initializeFCM();
      } else {
        console.log('⚠️ Permission not granted:', permission);
      }
      
      return permission;
    } catch (error) {
      console.error('❌ Failed to request notification permission:', error);
      return 'denied';
    }
  },

  showBrowserNotification: (title, body, data) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body,
          icon: '/logo.png',
          badge: '/badge.png',
          tag: data?.resourceId || 'default',
          requireInteraction: false,
          silent: false,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          
          // Navigate to relevant page if data provided
          if (data?.workspaceId) {
            window.location.href = `/workspace/${data.workspaceId}`;
          } else if (data?.inviteUrl) {
            window.location.href = data.inviteUrl;
          }
        };
      } catch (error) {
        console.error('Failed to show browser notification:', error);
      }
    }
  },

  initializeFCM: async () => {
    try {
      console.log('🔔 Initializing FCM...');
      
      // Check if VAPID key is configured
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error('❌ VAPID key not configured in environment variables');
        console.error('❌ Please add NEXT_PUBLIC_FIREBASE_VAPID_KEY to .env.local');
        return;
      }
      
      console.log('✅ VAPID key found');
      
      // Request FCM token
      const token = await requestNotificationPermission();
      
      if (token) {
        console.log('✅ FCM Token received:', token.substring(0, 50) + '...');
        set({ fcmToken: token });
        
        // Send token to backend
        try {
          const authToken = localStorage.getItem('authToken');
          if (authToken) {
            console.log('📤 Sending FCM token to backend...');
            await api.post('/notifications/fcm-token', { fcmToken: token });
            console.log('✅ FCM Token sent to backend');
          } else {
            console.warn('⚠️ No auth token found, skipping backend registration');
          }
        } catch (error) {
          console.error('❌ Failed to send FCM token to backend:', error);
        }
        
        // Listen for foreground messages
        console.log('👂 Setting up foreground message listener...');
        onMessageListener((payload) => {
          console.log('📨 Foreground message received:', payload);
          
          const notification = payload.notification;
          if (notification) {
            get().showBrowserNotification(
              notification.title || 'New Notification',
              notification.body || '',
              payload.data
            );
          }
        });
        
        console.log('✅ FCM initialization complete');
      } else {
        console.warn('⚠️ Failed to get FCM token');
      }
    } catch (error: any) {
      console.error('❌ Failed to initialize FCM:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
  },

  setFCMToken: (token) => {
    set({ fcmToken: token });
  },

  syncPermission: () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const currentPermission = Notification.permission;
      console.log('🔄 Syncing permission:', currentPermission);
      set({ permission: currentPermission });
    }
  },
}));
