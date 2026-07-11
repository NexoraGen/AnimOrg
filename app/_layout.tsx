import { useEffect, useState, useRef } from 'react';
import { View, Platform, ActivityIndicator, Text, StyleSheet, Animated } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/theme';
import { useAppStore } from '../src/store/useAppStore';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';
import * as SplashScreen from 'expo-splash-screen';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

let isHotRefresh = false;

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
  const [shouldShowSplash] = useState(() => {
    if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
      if (sessionStorage.getItem('hasPlayedSplash') === 'true') return false;
      sessionStorage.setItem('hasPlayedSplash', 'true');
      return true;
    }
    const isCold = !isHotRefresh;
    isHotRefresh = true;
    return isCold;
  });

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
    if (isLoadingAuth || !hasHydrated || isAppInitializing) return;

    const performRedirect = () => {
      const segmentsList = segments as string[];
      const inAuthGroup = segmentsList[0] === '(auth)';
      const isOnOnboarding = segmentsList[0] === '(auth)' && segmentsList[1] === 'onboarding';
      const isLoginScreen = segmentsList[0] === '(auth)' && segmentsList[1] === 'login';
      const isRegisterScreen = segmentsList[0] === '(auth)' && segmentsList[1] === 'register';

      if (isGuest) {
        // Guest users are allowed anywhere EXCEPT auth screens
        if (inAuthGroup) {
          router.replace('/(tabs)/home');
        }
      } else if (isAuthenticated) {
        // Check if the authenticated user has a complete and claimed unique username
        const hasValidUsername = user?.username && /^[a-z0-9_]{3,20}$/.test(user.username);
        const onboardingComplete = user?.hasCompletedOnboarding || (user as any)?.usernameClaimed;
        const needsOnboarding = !hasValidUsername || !onboardingComplete;

        if (needsOnboarding) {
          if (!isOnOnboarding) {
            router.replace('/(auth)/onboarding' as any);
          }
        } else {
          // Fully onboarded — redirect out of auth stack
          if (inAuthGroup) {
            router.replace('/(tabs)/home');
          }
        }
      } else {
        // Unauthenticated -> force into login (allow register screen too)
        const inTabs = segmentsList[0] === '(tabs)';

        if (inTabs || isOnOnboarding || !segmentsList[0]) {
          router.replace('/(auth)/login');
        }
      }
    };

    if (Platform.OS === 'web') {
      const timer = setTimeout(performRedirect, 50);
      return () => clearTimeout(timer);
    } else {
      performRedirect();
    }
  }, [isAuthenticated, isGuest, user, isLoadingAuth, hasHydrated, isAppInitializing, segments]);

  useEffect(() => {
    const unsubscribe = initializeAuth();

    // Aggressive cleanup sweep of legacy oversized cache objects
    // Fixes SQLite Full crashes globally on startup for corrupted devices
    const performCleanupSweep = async () => {
      try {
        const legacyOverloads = [
          'animorg_seasonal_airing_schedule_v2',
          'swr_cache_schedule'
        ];
        await AsyncStorage.multiRemove(legacyOverloads);
      } catch (e) {
        // fail silently 
      }
    };
    performCleanupSweep();

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

  // Pre-emptively dismiss the Android 12+ native splash dialog as soon as 
  // the React Native Javascript root mounts. This transitions instantly and
  // seamlessly to the custom CinematicStartupSplash which covers the full screen.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => { });
  }, []);

  useEffect(() => {
    const unsubscribe = initializeAuth();

    // Aggressive cleanup sweep of legacy oversized cache objects
    // Fixes SQLite Full crashes globally on startup for corrupted devices
    const performCleanupSweep = async () => {
      try {
        const legacyOverloads = [
          'animorg_seasonal_airing_schedule_v2',
          'swr_cache_schedule'
        ];
        await AsyncStorage.multiRemove(legacyOverloads);
      } catch (e) {
        // fail silently 
      }
    };
    performCleanupSweep();

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

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, overflow: Platform.OS === 'web' ? 'hidden' : undefined }}>
        {hasHydrated && (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: Platform.OS === 'web' ? 'none' : 'fade',
              animationDuration: 300,
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
        )}
        <CinematicOverlay visible={modalCount > 0} />
        <StatusBar style="light" />
        {(shouldShowSplash || !hasHydrated) && <CinematicStartupSplash isReady={!isAppInitializing && hasHydrated} />}
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

// ─── CINEMATIC STARTUP SPLASH ─────────────────────────────────────────────
// Beautiful JS splash that covers raw Web exports and gracefully fades out 
// once absolute hydration finishes. Prevents abrupt unmounting flashes.

function CinematicStartupSplash({ isReady }: { isReady: boolean }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0.95)).current;
  const [isUnmounted, setIsUnmounted] = useState(false);

  useEffect(() => {
    // Elegant breathing animation for the loading content
    const pulseSequence = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.05,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 0.95,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(pulseSequence).start();
  }, []);

  useEffect(() => {
    if (isReady) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setIsUnmounted(true));
    }
  }, [isReady]);

  if (isUnmounted) return null;

  return (
    <Animated.View style={[splashStyles.container, { opacity: fadeAnim }]}>
      <Image
        source={require('../assets/splash.png')}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
      />
      <LinearGradient
        colors={['rgba(11,11,11,0)', 'rgba(11,11,11,0.6)', '#0B0B0B']}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View style={[splashStyles.content, { transform: [{ scale: pulseAnim }] }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={splashStyles.brand}>AnimOrg</Text>
      </Animated.View>
    </Animated.View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    backgroundColor: '#0B0B0B'
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20
  },
  brand: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 12,
    textTransform: 'uppercase',
    marginTop: 12,
    opacity: 0.95,
    textShadowColor: 'rgba(229, 9, 20, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20
  }
});


