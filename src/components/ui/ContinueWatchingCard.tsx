import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Animated,
  StyleSheet,
  useWindowDimensions
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';

export interface ContinueWatchingEntry {
  animeId: string;
  title: string;
  posterPath: string;
  lastWatchedEpisode: number;
  nextEpisode?: number;
  totalEpisodes?: number;
  releasedCount?: number;
  progressFraction?: number;
  lastViewedAt?: string;
}

export interface ContinueWatchingCardProps {
  entry: ContinueWatchingEntry;
  onPress: (animeId: string) => void;
  onPlayPress?: (animeId: string, nextEpisode?: number) => void;
}

export const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = React.memo(({
  entry,
  onPress,
  onPlayPress
}) => {
  const themeColors = useThemeColors();
  const cardScale = useRef(new Animated.Value(1)).current;
  const playScale = useRef(new Animated.Value(1)).current;

  const handleCardPressIn = () => {
    Animated.spring(cardScale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handleCardPressOut = () => {
    Animated.spring(cardScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePlayPressIn = () => {
    Animated.spring(playScale, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePlayPressOut = () => {
    Animated.spring(playScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const getRelativeTime = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const now = new Date();
      const past = new Date(dateString);
      const diffMs = now.getTime() - past.getTime();
      if (isNaN(diffMs) || diffMs < 0) return null;

      const diffMins = Math.round(diffMs / 60000);
      const diffHours = Math.round(diffMins / 60);
      const diffDays = Math.round(diffHours / 24);

      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return null;
    }
  };

  const lastWatched = entry.lastWatchedEpisode || 0;
  const nextEp = entry.nextEpisode || lastWatched + 1;
  const total = entry.totalEpisodes || entry.releasedCount || 0;

  // Compute progress fraction safely between 0 and 1
  let progressFraction = entry.progressFraction;
  if (progressFraction === undefined || progressFraction === null) {
    progressFraction = total > 0 ? lastWatched / total : 0;
  }
  progressFraction = Math.min(Math.max(progressFraction, 0), 1);
  const progressPercent = Math.round(progressFraction * 100);

  const relativeTimeStr = getRelativeTime(entry.lastViewedAt);

  const handlePlay = (e: any) => {
    e.stopPropagation?.();
    if (onPlayPress) {
      onPlayPress(entry.animeId, nextEp);
    } else {
      onPress(entry.animeId);
    }
  };

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: cardScale }] }]}>
      <Pressable
        onPress={() => onPress(entry.animeId)}
        onPressIn={handleCardPressIn}
        onPressOut={handleCardPressOut}
        style={[
          styles.container,
          {
            backgroundColor: themeColors.surface,
            borderColor: 'rgba(255,255,255,0.06)'
          }
        ]}
      >
        {/* Left: Large Anime Poster */}
        <View style={styles.posterContainer}>
          <Image
            source={entry.posterPath ? { uri: entry.posterPath } : { uri: 'https://images.unsplash.com/photo-1578632738908-48c104e8d89e?q=80&w=600' }}
            style={styles.poster}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        </View>

        {/* Middle: Details & Progress */}
        <View style={styles.infoContainer}>
          <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
            {entry.title}
          </Text>

          <View style={styles.episodeRow}>
            <Text style={[styles.nextEpisodeText, { color: colors.primary }]}>
              Ep {nextEp}
            </Text>
            <Text style={styles.dot}> • </Text>
            <Text style={[styles.watchedText, { color: themeColors.textDim }]}>
              {total > 0 ? `${lastWatched}/${total} Watched` : `${lastWatched} Watched`}
            </Text>
          </View>

          {/* Viewing Progress Bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: colors.primary
                }
              ]}
            />
          </View>

          {/* Progress Percentage and Recency Badge */}
          <View style={styles.metaRow}>
            <Text style={[styles.percentText, { color: themeColors.textDim }]}>
              {progressPercent}% completed
            </Text>
            {relativeTimeStr ? (
              <Text style={[styles.timeText, { color: themeColors.textDim }]}>
                {relativeTimeStr}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Right: Independent Play Button */}
        <Animated.View style={{ transform: [{ scale: playScale }] }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePlay}
            onPressIn={handlePlayPressIn}
            onPressOut={handlePlayPressOut}
            style={[styles.playButton, { backgroundColor: colors.primary }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="play" size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.M,
    marginBottom: spacing.M,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm + 4,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  posterContainer: {
    width: 80,
    height: 112,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  nextEpisodeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dot: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    marginHorizontal: 4,
  },
  watchedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
});
