// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js');

// Khởi tạo app trong SW
firebase.initializeApp({
  apiKey: "AIzaSyC3dPh2_ukDrU2NWwRtrJ8llRM4MchktY0",

  authDomain: "safegate-network.firebaseapp.com",

  projectId: "safegate-network",

  storageBucket: "safegate-network.firebasestorage.app",

  messagingSenderId: "915726319235",

  appId: "1:915726319235:web:5fb6c38c8a8256fb20e5b6",

  measurementId: "G-TQ6691JSGX"
});

const messaging = firebase.messaging();

// Lắng nghe noti khi trang tắt (background)
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const { message, subject} = payload.data;

  self.registration.showNotification(subject, {
    body: message,
    icon: icon || image || 'default-icon.png', // Ưu tiên icon nếu có, sau đó là image
    image: image || 'default-icon.png', // hiển thị ảnh lớn (nếu trình duyệt hỗ trợ)
  });
});
