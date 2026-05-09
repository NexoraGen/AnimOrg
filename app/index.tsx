import { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { colors, typography } from '../src/theme';
import { useAppStore } from '../src/store/useAppStore';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const isLoadingAuth = useAppStore(state => state.isLoadingAuth);
  
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 1000 });
    scale.value = withTiming(1, { 
      duration: 1000, 
      easing: Easing.out(Easing.back(1.5)) 
    });
  }, []);

  // Wait for Firebase auth to resolve before navigating
  useEffect(() => {
    if (isLoadingAuth) return;

    const timeout = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/login');
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [isLoadingAuth, isAuthenticated]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Background Image layer for cinematic effect */}
      <Image 
        source={require('../assets/splash.png')} 
        style={StyleSheet.absoluteFillObject} 
        resizeMode="cover"
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(15, 15, 15, 0.85)' }]} />

      <Animated.View style={[styles.logoContainer, animatedStyle]}>
        <Image 
          source={require('../assets/icon.png')} 
          style={styles.logoImage} 
        />
        <Text style={styles.logoText}>Ani<Text style={styles.accentText}>Verse</Text></Text>
        <View style={styles.taglineBorder} />
        <Text style={styles.tagline}>Discover Your Next Story</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 16,
    borderRadius: 24,
  },
  logoText: {
    color: colors.text,
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.black as any,
    letterSpacing: 2,
  },
  accentText: {
    color: colors.primary,
  },
  taglineBorder: {
    height: 2,
    width: 60,
    backgroundColor: colors.primary,
    marginVertical: 12,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
});
