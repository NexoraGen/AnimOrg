import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore - Exported natively inside Firebase core, ignore typing errors
import { initializeAuth, getAuth, Auth, getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase configuration from google-services.json
const firebaseConfig = {
    apiKey: "AIzaSyCTgVGBV60FJpkk8CebCA5CppPFKvrV5YY",
    authDomain: "animorg-nexora.firebaseapp.com",
    projectId: "animorg-nexora",
    storageBucket: "animorg-nexora.firebasestorage.app",
    messagingSenderId: "177485044340",
    appId: "1:177485044340:web:5e0ec2630cb585b7860f21",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
if (Platform.OS === 'web') {
    auth = getAuth(app);
} else {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
}

// Ensure offline persistence is heavily enforced for Resilience & Reliability mode
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager() // Native/Web-safe resilient offline local caching
    })
});

const storage = getStorage(app);

export { auth, db, storage };
