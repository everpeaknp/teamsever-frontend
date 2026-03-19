import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth } from 'firebase/auth';
import { getMessaging, getToken, onMessage, Messaging, isSupported } from 'firebase/messaging';

// Firebase configuration from your project
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: any;
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined';

if (isConfigValid) {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
} else {
  // Graceful fallback during build or if keys are missing
  console.warn("Firebase API Key is missing. Skipping initialization.");
  app = { name: '[DEFAULT]', options: {}, automaticDataCollectionEnabled: false }; 
}

// Initialize Firebase Auth
export const auth: Auth = isConfigValid ? getAuth(app) : {} as Auth;

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};

// Initialize Firebase Messaging
let messaging: Messaging | null = null;

export const initializeMessaging = async (): Promise<Messaging | null> => {
  try {
    // Check if messaging is supported (not supported in all browsers)
    const messagingSupported = await isSupported();
    if (!messagingSupported) {
      console.warn('Firebase Messaging is not supported in this browser');
      return null;
    }

    if (!messaging) {
      messaging = getMessaging(app);
    }
    return messaging;
  } catch (error) {
    console.error('Failed to initialize Firebase Messaging:', error);
    return null;
  }
};

// Global registration state to prevent race conditions
let swRegistration: ServiceWorkerRegistration | null = null;
let isRegistering = false;

// Request notification permission and get FCM token
export const requestNotificationPermission = async (): Promise<string | null> => {
  if (typeof window === 'undefined' || typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  // Prevent concurrent registrations
  if (isRegistering) {
    console.log('🔄 SW registration already in progress, waiting...');
    while (isRegistering) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (swRegistration) {
      // If another call finished registration, we still need to proceed to get the token
      return getFCMTokenInternal(swRegistration);
    }
  }

  try {
    const messagingInstance = await initializeMessaging();
    if (!messagingInstance) {
      return null;
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('VAPID key not configured');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Ensure Service Worker is registered
    if (!swRegistration) {
      isRegistering = true;
      try {
        console.log('👷 Registering Service Worker...');
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      } finally {
        isRegistering = false;
      }
    }

    return await getFCMTokenInternal(swRegistration);
  } catch (error: any) {
    console.error('Failed to get FCM token:', error);
    throw error;
  }
};

// Internal helper to get token once SW is ready
async function getFCMTokenInternal(registration: ServiceWorkerRegistration): Promise<string | null> {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return null;
  const messagingInstance = await initializeMessaging();
  if (!messagingInstance) return null;

  try {
    // NATIVE PUSH TEST (Bypassing Firebase to see raw error)
    try {
      console.log('🧪 Attempting native PushManager subscription...');
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey.trim()
      });
      console.log('✅ Native subscription successful! Unsubscribing to let Firebase take over...', sub);
      await sub.unsubscribe();
    } catch (nativeErr: any) {
      console.error('❌ NATIVE Push Error:', nativeErr);
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('✅ Service Worker ready. Waiting 2s for stability...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Ensure we are active
    if (registration.installing) {
      console.log('⏳ Waiting for SW installation...');
      await new Promise<void>((resolve) => {
        registration.installing!.addEventListener('statechange', (e: any) => {
          if (e.target.state === 'activated') resolve();
        });
      });
    }

    // --- THE FIX: Unsubscribe from old conflicting subscriptions ---
    try {
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        console.log('🗑️ Found old subscription, clearing it...');
        await existingSub.unsubscribe();
        console.log('✅ Old subscription cleared');
      }
    } catch (subErr) {
      console.warn('⚠️ Error clearing old subscription:', subErr);
    }
    
    console.log('✅ Service Worker ready and active');

    // Pass the registration directly to getToken
    const token = await getToken(messagingInstance, { 
      vapidKey: vapidKey.trim(),
      serviceWorkerRegistration: registration
    });
    
    console.log('✅ FCM Token received:', token ? 'YES' : 'NO');
    return token;
  } catch (swError: any) {
    console.error('❌ Service Worker / FCM Error:', swError);
    throw swError;
  }
}

// Listen for foreground messages
export const onMessageListener = async (callback: (payload: any) => void) => {
  try {
    const messagingInstance = await initializeMessaging();
    if (!messagingInstance) {
      return () => {};
    }

    return onMessage(messagingInstance, (payload) => {
      console.log('Message received in foreground:', payload);
      callback(payload);
    });
  } catch (error) {
    console.error('Failed to listen for messages:', error);
    return () => {};
  }
};

export default app;
