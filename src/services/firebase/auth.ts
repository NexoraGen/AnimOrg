import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword as fbUpdatePassword,
  updateEmail as fbUpdateEmail,
  deleteUser,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential
} from 'firebase/auth';
import { Platform } from 'react-native';
import { auth } from './config';
import { firestoreService } from './firestore';
import { getRandomAnimeAvatar } from '../../constants/avatars';

export const firebaseAuthService = {
  // Listen for auth state changes
  onAuthStateChanged: (callback: (user: FirebaseUser | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  // Register with email and password
  registerWithEmail: async (email: string, password: string, username: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const avatarUrl = getRandomAnimeAvatar();

      // Create user profile in Firestore
      await firestoreService.createUserProfile(user.uid, {
        id: user.uid,
        email: user.email || '',
        username,
        avatarUrl,
        favoriteGenres: [],
        watchStats: {
          animeCount: 0,
          totalHours: 0,
        }
      });

      return user;
    } catch (error) {
      console.error('[AuthService] Registration Error:', error);
      throw error;
    }
  },

  // Login with email and password
  loginWithEmail: async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Ensure profile exists (for robust systems)
      const existingProfile = await firestoreService.getUserProfile(user.uid);
      if (!existingProfile) {
        await firestoreService.createUserProfile(user.uid, {
          id: user.uid,
          email: user.email || '',
          username: user.displayName || email.split('@')[0],
          avatarUrl: user.photoURL || getRandomAnimeAvatar(),
          favoriteGenres: [],
          watchStats: {
            animeCount: 0,
            totalHours: 0,
          }
        });
      }

      return user;
    } catch (error) {
      console.error('[AuthService] Login Error:', error);
      throw error;
    }
  },

  // Logout
  logout: async () => {
    await signOut(auth);
  },

  // Send password reset email
  sendPasswordResetEmail: async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  },

  // Get current user
  getCurrentUser: () => {
    return auth.currentUser;
  },

  // Account management
  updatePassword: async (newPassword: string) => {
    if (!auth.currentUser) throw new Error('No user logged in');
    await fbUpdatePassword(auth.currentUser, newPassword);
    return true;
  },

  updateEmail: async (newEmail: string) => {
    if (!auth.currentUser) throw new Error('No user logged in');
    await fbUpdateEmail(auth.currentUser, newEmail);
    // Update firestore profile as well
    await firestoreService.updateUserProfile(auth.currentUser.uid, { email: newEmail });
    return true;
  },

  deleteAccount: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');
    // In a real production app, we would clean up Firestore data here too
    // But let's stick to the auth part first.
    await deleteUser(user);
    return true;
  },

  // Google Sign-In
  signInWithGoogle: async (idToken?: string) => {
    try {
      let user;
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        user = result.user;
      } else {
        if (!idToken) throw new Error('ID Token is required for Native Google Sign-In');
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        user = result.user;
      }

      if (user) {
        return await firebaseAuthService._handleFirebaseUser(user);
      }
      return null;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  },

  // Internal helper to ensure firestore profile exists
  _handleFirebaseUser: async (user: FirebaseUser) => {
    const existingProfile = await firestoreService.getUserProfile(user.uid);
    if (!existingProfile) {
      await firestoreService.createUserProfile(user.uid, {
        id: user.uid,
        email: user.email || '',
        username: user.displayName || user.email?.split('@')[0] || 'User',
        avatarUrl: user.photoURL || getRandomAnimeAvatar(),
        favoriteGenres: [],
        watchStats: {
          animeCount: 0,
          totalHours: 0,
        }
      });
    }
    return user;
  },

  // Re-authentication would be needed for sensitive ops
  logoutAllDevices: async () => {
    // Firebase Auth doesn't have a simple client-side "logout all"
    // Usually this requires a backend/admin SDK to revoke tokens.
    // For this pass, we'll just sign out the current user and 
    // maybe set a 'reauthRequired' flag in Firestore if we wanted to be fancy.
    // Let's stick to local logout for now but keep the method name for the UI.
    await signOut(auth);
  },
};
