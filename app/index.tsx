import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/useAppStore';

// This is a self-healing landing screen at the route "/".
// It resolves initial mounting race conditions in Expo Router web deployment packs.
export default function SplashIndex() {
  const router = useRouter();
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const isGuest = useAppStore(state => state.isGuest);
  const user = useAppStore(state => state.user);
  const isAppInitializing = useAppStore(state => state.isAppInitializing);
  const hasHydrated = useAppStore(state => state.hasHydrated);

  useEffect(() => {
    if (isAppInitializing || !hasHydrated) return;

    if (isGuest) {
      router.replace('/(tabs)/home');
    } else if (isAuthenticated) {
      const hasValidUsername = user?.username && /^[a-z0-9_]{3,20}$/.test(user.username);
      const onboardingComplete = user?.hasCompletedOnboarding || (user as any)?.usernameClaimed;
      const needsOnboarding = !hasValidUsername || !onboardingComplete;

      if (needsOnboarding) {
        router.replace('/(auth)/onboarding' as any);
      } else {
        router.replace('/(tabs)/home');
      }
    } else {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isGuest, user, isAppInitializing, hasHydrated]);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050506',
  },
});
