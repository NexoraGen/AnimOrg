import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Linking } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../theme';
import { formatRating } from '../../utils/formatters';
import { PLACEHOLDER_BACKDROP } from '../../constants/images';

interface HeroBannerProps {
  media: any; // Media type from app
  onPress: (id: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = React.memo(({ media, onPress }) => {
  const theme = useThemeColors();
  const opacity = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animate opacity when media changes
  useEffect(() => {
    // Smoother cross-fade effect
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 0.4,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous pulse for trailer visibility
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [media?.id]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Image
        source={media.backdropPath || PLACEHOLDER_BACKDROP}
        style={styles.backdrop}
        contentFit="cover"
        transition={500}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(11, 11, 11, 1)']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>TOP RATED</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {media.title}
          </Text>
          <View style={styles.metadataRow}>
            <Text style={[styles.metadataText, { color: theme.primary }]}>
              ⭐ {formatRating(media.rating)}
            </Text>
            <Text style={styles.metadataDivider}>•</Text>
            <Text style={[styles.metadataText, { color: theme.textDim }]}>
              {media.genres?.slice(0, 2).join(' • ')}
            </Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={() => onPress(media.id)}
            >
              <Feather name="info" size={20} color="#FFF" />
              <Text style={styles.buttonText}>View Details</Text>
            </TouchableOpacity>

            {media.trailerUrl && (
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[styles.glassButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                  onPress={() => Linking.openURL(media.trailerUrl)}
                >
                  <Feather name="play" size={20} color="#FFF" fill="#FFF" />
                  <Text style={styles.buttonText}>Trailer</Text>
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
    height: 420,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  badge: {
    backgroundColor: 'rgba(183, 28, 28, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '900' as any,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  metadataText: {
    fontSize: 14,
    fontWeight: '700' as any,
  },
  metadataDivider: {
    color: 'rgba(255,255,255,0.4)',
    marginHorizontal: 8,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  glassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '800' as any,
    fontSize: 15,
    marginLeft: 8,
  },
});
