import { create } from 'zustand';
import { requestNotificationPermission, onMessageListener } from '@/lib/firebase';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

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
  processedNotificationIds: Set<string>;
  
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
  initializeFCM: (isRetry?: boolean) => Promise<void>;
  setFCMToken: (token: string | null) => void;
  nuclearReset: () => Promise<void>;
  syncPermission: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  permission: (typeof window !== 'undefined' && typeof Notification !== 'undefined') ? Notification.permission : 'default',
  isLoading: false,
  fcmToken: null,
  processedNotificationIds: new Set(),

  setNotifications: (notifications) => {
    const deduped = notifications.filter(
      (n, idx, arr) => arr.findIndex((x) => x._id === n._id) === idx
    );
    const unreadCount = deduped.filter((n) => !n.read).length;
    set({ notifications: deduped, unreadCount });
  },

  addNotification: (notification) => {
    const { notifications } = get();
    // Prevent duplicate inserts when same event arrives via multiple paths.
    if (notifications.some((n) => n._id === notification._id)) {
      return;
    }
    const newNotifications = [notification, ...notifications];
    const unreadCount = newNotifications.filter((n) => !n.read).length;
    
    set({ notifications: newNotifications, unreadCount });

    // Backgrounded tab: use native/browser notification path.
    if (typeof document !== 'undefined' && document.hidden) {
      get().showBrowserNotification(notification.title, notification.body, {
        ...(notification.data || {}),
        notificationId: notification._id,
        _id: notification._id,
      });
      return;
    }

    // Active tab: show a small in-app toast so webhook/system events are still visible
    // without forcing a browser popup.
    toast.info(notification.title, {
      description: notification.body,
      duration: 5000,
    });
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
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      console.warn('⚠️ Notifications not supported in this environment');
      return 'denied';
    }

    try {
      console.log('🔔 Requesting browser notification permission...');
      
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
      }
      
      return permission;
    } catch (error) {
      console.error('❌ Failed to request notification permission:', error);
      return 'denied';
    }
  },

  showBrowserNotification: async (title, body, data) => {
    if (typeof window === 'undefined') return;

    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      toast.info(title, { description: body });
      return;
    }

    const { permission } = get();

    if (permission === 'granted') {
      try {
        const options = {
          body,
          icon: '/teamsever_logo.png', // Corrected path to logo
          badge: '/teamsever_logo.png',
          tag: data?.notificationId || data?._id || data?.resourceId || data?.conversationId || 'default',
          renotify: true,
          vibrate: [200, 100, 200],
          data: data,
          requireInteraction: true, // Keep it visible until user interacts
        };

        // Try using Service Worker registration first (more reliable)
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          if (registration) {
            await registration.showNotification(title, options);
            return;
          }
        }

        // Fallback to standard Notification API
        const notification = new Notification(title, options);
        notification.onclick = () => {
          window.focus();
          notification.close();
          if (data?.workspaceId) {
            window.location.href = `/workspace/${data.workspaceId}/chat`;
          } else if (data?.conversationId) {
            window.location.href = `/workspace/${data.workspaceId || 'current'}/inbox?id=${data.conversationId}`;
          }
        };
      } catch (error) {
        console.error('Failed to show native notification:', error);
        toast.info(title, { description: body });
      }
    } else {
      // Fallback to toast if permission not granted
      toast.info(title, {
        description: body,
        duration: 5000,
        action: data?.workspaceId || data?.conversationId ? {
          label: 'View',
          onClick: () => {
            if (data?.workspaceId) {
              window.location.href = `/workspace/${data.workspaceId}/chat`;
            } else if (data?.conversationId) {
              window.location.href = `/workspace/${data.workspaceId || 'current'}/inbox?id=${data.conversationId}`;
            }
          }
        } : undefined
      });
    }
  },

  initializeFCM: async (isRetry: boolean = false) => {
    try {
      console.log('🔔 Initializing FCM...');
      
      // Check if VAPID key is configured
      let vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error('❌ VAPID key not configured in environment variables');
        return;
      }
      
      vapidKey = vapidKey.trim();
      console.log(`✅ VAPID key found (Length: ${vapidKey.length})`);
      
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
            await api.post('/notifications/devices/fcm-token', { fcmToken: token });
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
          const data = payload.data;
          
          if (notification) {
            // Check if we already have this notification in our store to prevent duplicates
            const notificationId = data?.notificationId || data?._id;
            if (notificationId) {
              const isProcessed = get().processedNotificationIds.has(notificationId);
              if (isProcessed) {
                console.log('🚫 Skipping duplicate FCM notification (already handled by socket)');
                return;
              }
              // Mark as processed
              get().processedNotificationIds.add(notificationId);
            }

            // Generate a tag for de-duplication (matches SocketContext)
            const tag = data?.conversationId 
              ? `dm_${data.conversationId}` 
              : data?.workspaceId 
                ? `chat_${data.workspaceId}` 
                : undefined;

            const rawTitle = notification.title || 'New Notification';
            const normalizedType = String(data?.type || '').toUpperCase();
            let formattedTitle = rawTitle;
            let formattedBody = notification.body || '';

            if (normalizedType === 'DM_NEW') {
              const senderName =
                data?.senderName ||
                rawTitle.replace(/^Message from\s+/i, '').trim() ||
                'Someone';
              formattedTitle = senderName;
              formattedBody = notification.body || data?.message || 'Message';
            }

            if (normalizedType === 'GROUP_CHAT_NEW') {
              const senderName = data?.senderName || 'Someone';
              const groupName = data?.channelName || data?.groupName || 'Group';
              formattedTitle = `${senderName} to ${groupName}`;
              formattedBody = notification.body || data?.message || 'Message';
            }

            // Backward-compatible fallback:
            // Some payloads still come with generic title "New Group Message"
            // without normalized `type`. Format them anyway using data fields.
            if (
              normalizedType !== 'GROUP_CHAT_NEW' &&
              /^new group message$/i.test(rawTitle)
            ) {
              const senderName = data?.senderName || data?.userName || 'Someone';
              const groupName = data?.channelName || data?.groupName || data?.channel || 'Group';
              formattedTitle = `${senderName} to ${groupName}`;
              formattedBody = notification.body || data?.message || 'Message';
            }

            get().showBrowserNotification(
              formattedTitle,
              formattedBody,
              { ...data, tag }
            );
          }
        });
        
        console.log('✅ FCM initialization complete');
      } else {
        console.warn('⚠️ Failed to get FCM token');
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      
      // If it's the annoying AbortError or push service error, log it once and STOP. 
      // Do not throw, do not retry indefinitely, and do not break the UI.
      if (errorMsg.includes('push service error') || errorMsg.includes('AbortError')) {
        console.warn('⚠️ Browser Push Service is unavailable. Falling back to Socket-only notifications.');
        set({ fcmToken: null, isLoading: false });
        return;
      }

      console.error('❌ Failed to initialize FCM:', error);
      set({ fcmToken: null, isLoading: false });
    }
  },

  setFCMToken: (token) => {
    set({ fcmToken: token });
  },

  nuclearReset: async () => {
    if (typeof window === 'undefined') return;
    if (!confirm('This will unregister all service workers and reload the page. Continue?')) return;
    
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }
      alert('Service workers cleared. Reloading...');
      setTimeout(() => window.location.reload(), 1000);
    }
  },

  syncPermission: () => {
    if (typeof window !== 'undefined' && typeof Notification !== 'undefined') {
      const currentPermission = Notification.permission;
      console.log('🔄 Syncing permission:', currentPermission);
      set({ permission: currentPermission });
    }
  },
}));
