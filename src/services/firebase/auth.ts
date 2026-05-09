import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { firestoreService } from './firestore';

// Configure Google Sign-In
// Note: You must provide a valid webClientId from Firebase Console for Google Sign-In to work.
GoogleSignin.configure({
  webClientId: 'PLEASE_REPLACE_WITH_YOUR_WEB_CLIENT_ID', 
});

export const firebaseAuthService = {
  // Listen for auth state changes
  onAuthStateChanged: (callback: (user: any) => void) => {
    return auth().onAuthStateChanged(callback);
  },

  // Register with email and password
  registerWithEmail: async (email: string, password: string, username: string) => {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Create user profile in Firestore
    await firestoreService.createUserProfile(user.uid, {
      id: user.uid,
      email: user.email || '',
      username,
      favoriteGenres: [],
      watchStats: {
        animeCount: 0,
        totalHours: 0,
      }
    });

    return user;
  },

  // Login with email and password
  loginWithEmail: async (email: string, password: string) => {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    return userCredential.user;
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    // Check if device supports Google Play Services
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    // Get the users ID token
    const signInResult = await GoogleSignin.signIn();
    const idToken = signInResult?.data?.idToken;
    if (!idToken) {
      throw new Error('Google Sign-In failed: No ID token received.');
    }
    
    // Create a Google credential with the token
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    
    // Sign-in the user with the credential
    const userCredential = await auth().signInWithCredential(googleCredential);
    const user = userCredential.user;

    // Ensure profile exists in Firestore
    const existingProfile = await firestoreService.getUserProfile(user.uid);
    if (!existingProfile) {
      await firestoreService.createUserProfile(user.uid, {
        id: user.uid,
        email: user.email || '',
        username: user.displayName || 'Anime Fan',
        avatarUrl: user.photoURL || undefined,
        favoriteGenres: [],
        watchStats: {
          animeCount: 0,
          totalHours: 0,
        }
      });
    }

    return user;
  },

  // Logout
  logout: async () => {
    await auth().signOut();
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      // Ignore if not signed in with Google
    }
  },

  // Send password reset email
  sendPasswordResetEmail: async (email: string) => {
    await auth().sendPasswordResetEmail(email);
  },
  
  // Get current user
  getCurrentUser: () => {
    return auth().currentUser;
  }
};
