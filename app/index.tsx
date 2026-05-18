import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { useAppStore } from '../src/store/useAppStore';

export default function PremiumSplashScreen() {
  const router = useRouter();
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const isLoadingAuth = useAppStore(state => state.isLoadingAuth);
  const hasHydrated = useAppStore(state => state.hasHydrated);
  const isGuest = useAppStore(state => state.isGuest);
  const user = useAppStore(state => state.user);

  useEffect(() => {
    if (!hasHydrated || isLoadingAuth) return;

    // Check if the authenticated user has a complete and claimed unique username
    const hasValidUsername = user?.username && /^[a-z0-9_]{3,20}$/.test(user.username);
    const needsOnboarding = isAuthenticated && (!hasValidUsername || !user?.hasCompletedOnboarding);

    if (isGuest) {
      router.replace('/(tabs)/home');
    } else if (isAuthenticated) {
      if (needsOnboarding) {
        router.replace('/(auth)/onboarding' as any);
      } else {
        router.replace('/(tabs)/home');
      }
    } else {
      router.replace('/(auth)/login');
    }
  }, [hasHydrated, isLoadingAuth, isAuthenticated, isGuest, user]);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050506', // Premium matching cinematic dark
  },
});
