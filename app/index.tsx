import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/useAppStore';
import { AnimatedLoader } from '../src/components/ui/AnimatedLoader';

export default function SplashIndex() {
  const router = useRouter();
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const isGuest = useAppStore(state => state.isGuest);
  const user = useAppStore(state => state.user);
  const isAppInitializing = useAppStore(state => state.isAppInitializing);
  const hasHydrated = useAppStore(state => state.hasHydrated);
  const pendingDeepLink = useAppStore(state => state.pendingDeepLink);
  const setPendingDeepLink = useAppStore(state => state.setPendingDeepLink);

  useEffect(() => {
    const executeRedirect = () => {
      // If there's an incoming deep link caught by Layout, redirect to IT instead of wiping it!
      if (pendingDeepLink) {
        router.replace(pendingDeepLink as any);
        setPendingDeepLink(null); // Clear the intent
        return;
      }

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
    };

    if (!isAppInitializing && hasHydrated) {
      executeRedirect();
      return;
    }

    // Web & Resilience Fallback: If initialization hangs or is delayed, force redirect after 600ms
    const fallbackTimer = setTimeout(() => {
      console.log('[SplashIndex] Triggering initialization fallback redirect');
      useAppStore.getState().setIsAppInitializing(false);
      useAppStore.getState().setHasHydrated(true);
      executeRedirect();
    }, 600);

    return () => clearTimeout(fallbackTimer);
  }, [isAuthenticated, isGuest, user, isAppInitializing, hasHydrated]);

  return (
    <View style={styles.container}>
      <AnimatedLoader size={80} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: Platform.OS === 'web' ? ('100vh' as any) : '100%',
    width: '100%',
    backgroundColor: '#050506',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
