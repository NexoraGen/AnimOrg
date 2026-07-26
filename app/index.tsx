import React from 'react';
import { Redirect } from 'expo-router';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAppStore } from '../src/store/useAppStore';

// Declarative landing screen at route "/".
// Resolves initial mounting race conditions in Expo Router web deployment packs.
export default function SplashIndex() {
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const isGuest = useAppStore(state => state.isGuest);
  const user = useAppStore(state => state.user);
  const isAppInitializing = useAppStore(state => state.isAppInitializing);
  const hasHydrated = useAppStore(state => state.hasHydrated);

  if (isAppInitializing || !hasHydrated) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#E50914" />
      </View>
    );
  }

  if (isGuest) {
    return <Redirect href="/(tabs)/home" />;
  }

  if (isAuthenticated) {
    const hasValidUsername = user?.username && /^[a-z0-9_]{3,20}$/.test(user.username);
    const onboardingComplete = user?.hasCompletedOnboarding || (user as any)?.usernameClaimed;
    const needsOnboarding = !hasValidUsername || !onboardingComplete;

    if (needsOnboarding) {
      return <Redirect href="/(auth)/onboarding" />;
    }
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
