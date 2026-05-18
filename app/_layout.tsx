import { useEffect, useState } from 'react';
import { View, Platform, ActivityIndicator, Text, StyleSheet, Animated } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/theme';
import { useAppStore } from '../src/store/useAppStore';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might cause this to error, which is ok */
});

// Conditionally import GestureHandlerRootView for native, use plain View on web
let GestureHandlerRootView: any = View;
if (Platform.OS !== 'web') {
  try {
    GestureHandlerRootView = require('react-native-gesture-handler').GestureHandlerRootView;
  } catch (e) {
    // Fallback to View if gesture handler is not available
  }
}

import { CinematicOverlay } from '../src/components/ui/CinematicOverlay';

export default function RootLayout() {
  const initializeAuth = useAppStore(state => state.initializeAuth);
  const isLoadingAuth = useAppStore(state => state.isLoadingAuth);
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const isGuest = useAppStore(state => state.isGuest);
  const user = useAppStore(state => state.user);
  const modalCount = useAppStore(state => state.modalCount);
  const isAppInitializing = useAppStore(state => state.isAppInitializing);
  const hasHydrated = useAppStore(state => state.hasHydrated);

  const router = useRouter();
  const segments = useSegments();

  // Root Layout Global Intercept and Onboarding Guardian
  useEffect(() => {
    if (isLoadingAuth || !hasHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';

    // Check if the authenticated user has a complete and claimed unique username
    const hasValidUsername = user?.username && /^[a-z0-9_]{3,20}$/.test(user.username);
    const needsOnboarding = isAuthenticated && (!hasValidUsername || !user?.hasCompletedOnboarding);

    if (isGuest) {
      // Guest users can browse the tabs, but if they get stuck in onboarding, push them back to tabs
      const isOnOnboarding = segments[0] === '(auth)' && (segments[1] as any) === 'onboarding';
      if (isOnOnboarding) {
        router.replace('/(tabs)/home');
      }
    } else if (isAuthenticated) {
      if (needsOnboarding) {
        const isOnOnboarding = segments[0] === '(auth)' && (segments[1] as any) === 'onboarding';
        if (!isOnOnboarding) {
          // Force forward users needing unique username setup
          router.replace('/(auth)/onboarding' as any);
        }
      } else {
        // Redirection out of auth stack once onboarding is fully satisfied
        if (inAuthGroup) {
          router.replace('/(tabs)/home');
        }
      }
    } else {
      // If not authenticated and not guest, redirect to login if attempting access to protected pages
      const inTabs = segments[0] === '(tabs)';
      const isOnOnboarding = segments[0] === '(auth)' && (segments[1] as any) === 'onboarding';
      if (inTabs || isOnOnboarding) {
        router.replace('/(auth)/login');
      }
    }
  }, [isAuthenticated, isGuest, user, isLoadingAuth, hasHydrated, segments]);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (modalCount > 0) {
        document.body.style.overflow = 'hidden';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        document.body.style.position = 'fixed';
      } else {
        document.body.style.overflow = 'auto';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.position = '';
      }
    }
  }, [modalCount]);

  useEffect(() => {
    if (!isAppInitializing && hasHydrated) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [isAppInitializing, hasHydrated]);

  if (isAppInitializing || !hasHydrated) {
    return <CinematicStartupSplash />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, overflow: Platform.OS === 'web' ? 'hidden' : undefined }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: Platform.OS === 'web' ? 'none' : 'fade_from_bottom',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ animation: Platform.OS === 'web' ? 'none' : 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: Platform.OS === 'web' ? 'none' : 'fade' }} />
          <Stack.Screen name="details/[id]" options={{ presentation: Platform.OS === 'web' ? 'card' : 'modal' }} />
          <Stack.Screen name="category/[type]" options={{ animation: Platform.OS === 'web' ? 'none' : 'slide_from_right' }} />
          <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
          <Stack.Screen name="create-post" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
        <CinematicOverlay visible={modalCount > 0} />
        <StatusBar style="light" />
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const ANIME_PHRASES = [
  "Mapping your Watchlist...",
  "Summoning the Release Hub...",
  "Powering up your Anime Identity...",
  "Connecting to AnimOrg communities...",
  "Loading premium layout settings..."
];

function CinematicStartupSplash() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start(() => {
        setPhraseIdx(prev => (prev + 1) % ANIME_PHRASES.length);
      });
    }, 2500);

    return () => clearInterval(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#050506', '#09090C', '#040405']}
      locations={[0, 0.5, 1]}
      style={splashStyles.container}
    >
      <View style={splashStyles.content}>
        <View style={splashStyles.glowContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
        <Animated.Text style={[splashStyles.phrase, { opacity: fadeAnim }]}>
          {ANIME_PHRASES[phraseIdx]}
        </Animated.Text>
        <Text style={splashStyles.brand}>AnimOrg</Text>
      </View>
    </LinearGradient>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 20
  },
  glowContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 9, 20, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.15)',
  },
  phrase: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 10,
    textAlign: 'center'
  },
  brand: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginTop: 30,
    opacity: 0.6
  }
});
