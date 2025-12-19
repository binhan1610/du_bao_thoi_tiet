// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js');

// Khởi tạo app trong SW
firebase.initializeApp({
  apiKey: "AIzaSyDKLDWGtFABeQUZGSgvAPthc-5kXPox21I",
  authDomain: "storage-image-80802.firebaseapp.com",
  projectId: "storage-image-80802",
  storageBucket: "storage-image-80802.appspot.com",
  messagingSenderId: "1003874933380",
  appId: "1:1003874933380:web:d1503d83f5df09888f80d1",
  measurementId: "G-XXTE0XSGPV"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // 1. Lấy thêm biến 'image' từ data (nếu backend có gửi)
  // Lưu ý: Đảm bảo backend gửi key tên là 'image', nếu họ gửi 'img' hay 'photo' thì phải sửa lại tên ở đây
  const { message, subject, image } = payload.data;

  // 2. Định nghĩa icon mặc định nếu không có ảnh
  // Lưu ý: Trong Service Worker, nên dùng đường dẫn tuyệt đối (bắt đầu bằng dấu /)
  const defaultIcon = '/assets/icons/default-logo.png'; // Sửa lại đường dẫn tới ảnh trong project của bạn
  const ptitLogo = 'http://127.0.0.1:5500/an.jpg';

  self.registration.showNotification(subject, {
    body: message,
    

    icon: ptitLogo, 
    

    image: image || ptitLogo, 
    

    data: {
        url: payload.data.url || '/' // Backend nên gửi kèm link cần mở
    }
  });
});
