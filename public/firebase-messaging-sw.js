// Give the service worker access to Firebase Messaging.
// v1.0.3 - Force update for new VAPID key and Sender ID alignment
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Force the service worker to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyAABzTocHiI8xvfevE4QvZwkUj7hF5PIxI",
  authDomain: "teamsever-44340.firebaseapp.com",
  projectId: "teamsever-44340",
  storageBucket: "teamsever-44340.firebasestorage.app",
  messagingSenderId: "279440133056",
  appId: "1:279440133056:web:7ba552b4f6716490e8d625"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const data = payload?.data || {};
  const rawType = String(data?.type || '').toUpperCase();
  const senderName = data?.senderName || data?.sender || '';
  const groupName = data?.channelName || data?.groupName || data?.channel || 'Group';
  const fallbackTitle = payload?.notification?.title || 'New Notification';
  const fallbackBody = payload?.notification?.body || data?.message || 'Message';

  let notificationTitle = fallbackTitle;
  let notificationBody = fallbackBody;

  if (rawType === 'DM_NEW') {
    notificationTitle = senderName || fallbackTitle;
    notificationBody = data?.message || fallbackBody;
  } else if (rawType === 'GROUP_CHAT_NEW') {
    notificationTitle = `${senderName || 'Someone'} to ${groupName || 'Group'}`;
    notificationBody = data?.message || fallbackBody;
  } else if (senderName && groupName && data?.resourceType === 'chat') {
    // Backward-compatible fallback when `type` isn't explicitly provided.
    notificationTitle = `${senderName} to ${groupName}`;
    notificationBody = data?.message || fallbackBody;
  }

  const notificationOptions = {
    body: notificationBody,
    icon: '/teamsever_logo.png',
    badge: '/teamsever_logo.png',
    data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
