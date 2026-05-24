// ======================================================
// Firebase Cloud Messaging - Service Worker
// ======================================================
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDFJA5o-yyDGfafnMHtKHVAXGE5ikBEuqQ",
  authDomain: "weather-egypt-app.firebaseapp.com",
  projectId: "weather-egypt-app",
  storageBucket: "weather-egypt-app.firebasestorage.app",
  messagingSenderId: "315256962760",
  appId: "1:315256962760:web:629e22a4125b3ec5c22ffd"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// استقبال الإشعارات في الخلفية (لما يكون الموقع مقفول)
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM] رسالة في الخلفية:', payload);
  
  const notificationTitle = payload.notification?.title || 'تنبيه طقس جديد 🌤️';
  const notificationOptions = {
    body: payload.notification?.body || 'تحقق من آخر تحديثات الطقس.',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200],
    data: payload.data,
    actions: [
      { action: 'open', title: 'فتح التطبيق' },
      { action: 'close', title: 'تجاهل' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// معالجة النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(clients.openWindow('/'));
  }
});