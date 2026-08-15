// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDX-56B0mIqTKZdWBZx7rI0vkrGRKJNrBg",
  authDomain: "invest-x-505513.firebaseapp.com",
  projectId: "invest-x-505513",
  storageBucket: "invest-x-505513.firebasestorage.app",
  messagingSenderId: "829926289619",
  appId: "1:829926289619:web:a1b2c3d4e5f6g7h8i9j0"
};

firebase.initializeApp(firebaseConfig);
export const auth = firebase.auth();
export const storage = firebase.storage();
