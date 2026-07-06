import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Linking, useWindowDimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../theme';
import { formatRating } from '../../utils/formatters';
import { PLACEHOLDER_BACKDROP, PLACEHOLDER_POSTER } from '../../constants/images';

// Creating an Animated wrapper for expo-image to enable scale transforms
const AnimatedImage = Animated.createAnimatedComponent(Image);

interface HeroBannerProps {
  media: any; // Media type from app
  onPress: (id: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = React.memo(({ media, onPress }) => {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;
  const zoomAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isMobile = screenWidth < 768;

  // Premium, 40-50% screen height max on mobile, to avoid feeling awkwardly stretched
  const bannerHeight = isMobile
    ? Math.min(screenWidth * 1.0, screenHeight * 0.48) // Cinematic portrait
    : 450; // Landscaped desktop cinematic ratio

  // Use poster for mobile if preferred, or backdrop. Backdrop covers better with slow pan.
  const imageSource = media.posterPath || media.backdropPath || PLACEHOLDER_BACKDROP;

  // Animate opacity when media changes and start slow zoom
  useEffect(() => {
    // Reset animations
    opacity.setValue(0);
    zoomAnim.setValue(1);

    Animated.timing(opacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Infinite slow scale for cinematic effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(zoomAnim, { toValue: 1.05, duration: 18000, useNativeDriver: true }),
        Animated.timing(zoomAnim, { toValue: 1, duration: 18000, useNativeDriver: true }),
      ])
    ).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 2500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [media?.id]);

  return (
    <Animated.View style={[styles.container, { height: bannerHeight, opacity }]}>
      <AnimatedImage
        source={imageSource}
        style={[styles.backdrop, { transform: [{ scale: zoomAnim }] }]}
        contentFit="cover"
        contentPosition="top center"
        transition={600}
        cachePolicy="memory-disk"
        priority="high"
      />

      {/* Extreme top padding gradient to ensure text readability under header */}
      <LinearGradient
        colors={['rgba(5, 5, 6, 0.5)', 'transparent']}
        locations={[0, 1]}
        style={[StyleSheet.absoluteFillObject, { height: 120 }]}
      />

      {/* Vignette edge blending */}
      <LinearGradient
        colors={['transparent', 'rgba(5, 5, 6, 0.2)', 'rgba(5, 5, 6, 0.4)']}
        locations={[0, 0.8, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Primary absolute black fade for content blending */}
      <LinearGradient
        colors={[
          'transparent',
          'transparent',
          'rgba(5, 5, 6, 0.5)',
          'rgba(5, 5, 6, 0.85)',
          'rgba(5, 5, 6, 1)',
        ]}
        locations={[0, 0.4, 0.7, 0.85, 1]}
        style={styles.gradient}
      >
        <View style={[styles.content, { paddingBottom: 20 }]}>
          <Text
            style={[
              styles.title,
              { color: '#FFFFFF', fontSize: isMobile ? 26 : 36 },
            ]}
            numberOfLines={2}
          >
            {media.title}
          </Text>

          <View style={styles.metadataRow}>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>⭐ {formatRating(media.rating)}</Text>
            </View>
            {media.genres && media.genres.length > 0 && (
              <>
                <Text style={styles.metadataDivider}>•</Text>
                <Text style={styles.metadataText}>
                  {media.genres.slice(0, 3).join(' • ')}
                </Text>
              </>
            )}
            {media.type && (
              <>
                <Text style={styles.metadataDivider}>•</Text>
                <Text style={styles.metadataText}>{media.type.toUpperCase()}</Text>
              </>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#E50914' }]} // Netflix style red
              onPress={() => onPress(media.id)}
              activeOpacity={0.8}
            >
              <Feather name="play" size={18} color="#FFF" fill="#FFF" />
              <Text style={styles.primaryButtonText}>View Details</Text>
            </TouchableOpacity>

            {media.trailerUrl && (
              <Animated.View style={[styles.secondaryButtonWrapper, { transform: [{ scale: pulseAnim }] }]}>
                <TouchableOpacity
                  style={[styles.glassButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
                  onPress={() => Linking.openURL(media.trailerUrl)}
                  activeOpacity={0.8}
                >
                  <Feather name="video" size={18} color="#FFF" />
                  <Text style={styles.secondaryButtonText}>Trailer</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
  },
  content: {
    alignItems: 'center', // Centers everything inside horizontally for cinematic balance
    width: '100%',
  },
  title: {
    fontWeight: '900' as any,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
    textAlign: 'center', // Center title text
    width: '100%', // Prevent squishing
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center metadata row
    marginBottom: spacing.xl,
  },
  ratingBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800' as any,
    color: '#FFF',
  },
  metadataText: {
    fontSize: 13,
    fontWeight: '600' as any,
    color: 'rgba(255,255,255,0.7)',
  },
  metadataDivider: {
    color: 'rgba(255,255,255,0.4)',
    marginHorizontal: 8,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center action buttons
    width: '100%',
    gap: spacing.md, // Clean equal gap between buttons
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    minWidth: 150,
    height: 48,
    borderRadius: 24, // highly rounded Pill shape
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6, // Better shadows on android
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: '800' as any,
    fontSize: 15,
    marginLeft: 8,
  },
  secondaryButtonWrapper: {
    minWidth: 140,
  },
  glassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    height: 48,
    borderRadius: 24, // highly rounded Pill shape
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryButtonText: {
    color: '#FFF',
    fontWeight: '800' as any,
    fontSize: 15,
    marginLeft: 8,
  },
});
