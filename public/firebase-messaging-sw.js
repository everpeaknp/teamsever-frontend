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
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png',
    badge: '/badge.png',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
