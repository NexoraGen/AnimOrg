import React, { useRef } from 'react';
import { StyleSheet, Pressable, Text, View, Animated, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { Media } from '../../types';
import { formatRating, hasValidRating } from '../../utils/formatters';
import { useThemeColors } from '../../hooks/useThemeColors';
import { PLACEHOLDER_POSTER } from '../../constants/images';



interface PosterCardProps {
  media: Media;
  onPress: (id: string) => void;
  width?: number;
  height?: number;
  showProgress?: boolean;
  progress?: number;
  rank?: number;
  badge?: string;
  variant?: 'default' | 'list';
}

export const PosterCard: React.FC<PosterCardProps> = React.memo(({
  media,
  onPress,
  width = 180,
  height = 260,
  showProgress = false,
  progress = 0,
  rank,
  badge,
  variant = 'default'
}) => {
  const themeColors = useThemeColors();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  if (variant === 'list') {
    return (
      <Pressable
        onPress={() => onPress(media.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.listContainer,
          { backgroundColor: themeColors.surface, borderColor: themeColors.border },
          pressed && { opacity: 0.8 }
        ]}
      >
        <Image
          source={media.posterPath ? { uri: media.posterPath } : { uri: PLACEHOLDER_POSTER }}
          style={styles.listImage}
          contentFit="cover"
          transition={300}
        />
        <View style={styles.listContent}>
          <Text style={[styles.listTitle, { color: themeColors.text }]} numberOfLines={1}>
            {media.title}
          </Text>
          <View style={styles.listMeta}>
            <Text style={[styles.listRating, { color: themeColors.primary }]}>⭐ {formatRating(media.rating)}</Text>
            <Text style={[styles.listEpisodes, { color: themeColors.textDim }]}>• {media.episodes || '?'} eps</Text>
          </View>
          <Text style={[styles.listGenres, { color: themeColors.textMuted }]} numberOfLines={1}>
            {media.genres?.slice(0, 3).join(' • ')}
          </Text>
        </View>
        <Feather name="chevron-right" color={themeColors.textDim} size={20} style={styles.listChevron} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(media.id)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ marginHorizontal: spacing.sm }}
    >
      <Animated.View style={[
        styles.container,
        {
          width,
          height,
          transform: [{ scale }],
          backgroundColor: themeColors.surface,
          shadowColor: themeColors.primary,
          shadowOpacity: 0.4,
          shadowRadius: 12,
        }
      ]}>
        <Image
          source={media.posterPath ? { uri: media.posterPath } : { uri: PLACEHOLDER_POSTER }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          priority="high"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        >
          <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={2}>
            {media.title}
          </Text>
          {hasValidRating(media.rating) && (
            <View style={styles.ratingRow}>
              <Feather name="star" size={10} color={themeColors.primary} fill={themeColors.primary} />
              <Text style={[styles.ratingText, { color: themeColors.primary }]}>{formatRating(media.rating)}</Text>
            </View>
          )}
        </LinearGradient>

        {rank !== undefined && (
          <View style={styles.rankContainer}>
            <Text style={styles.rankText}>{rank}</Text>
          </View>
        )}

        {badge && (
          <View style={[styles.badgeContainer, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}

        {showProgress && progress > 0 && (
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: themeColors.primary
                }
              ]}
            />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
    padding: spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: '800' as any,
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '900' as any,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  rankContainer: {
    position: 'absolute',
    bottom: -10,
    left: -5,
  },
  rankText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: typography.sizes.xxxl,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  badgeContainer: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: 'bold',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressBar: {
    height: '100%',
  },
  listContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    height: 100,
  },
  listImage: {
    width: 60,
    height: 80,
    borderRadius: borderRadius.md,
  },
  listContent: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  listTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    marginBottom: 4,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  listRating: {
    fontSize: typography.sizes.xs,
    fontWeight: 'bold',
  },
  listEpisodes: {
    fontSize: typography.sizes.xs,
    marginLeft: 6,
  },
  listGenres: {
    fontSize: typography.sizes.xs,
  },
  listChevron: {
    marginLeft: spacing.sm,
  }
});
