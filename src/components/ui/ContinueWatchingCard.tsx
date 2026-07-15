import React, { useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Platform,
  useWindowDimensions
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { WatchHistoryEntry } from '../../types';

interface ContinueWatchingCardProps {
  entry: WatchHistoryEntry;
  onPress: (animeId: string) => void;
}

export const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = ({
  entry,
  onPress
}) => {
  const themeColors = useThemeColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const totalEpisodes = entry.totalEpisodes || 0;
  const progress = totalEpisodes > 0 ? (entry.episodeProgress || 0) / totalEpisodes : 0;
  const nextEpisode = (entry.lastWatchedEpisode || 0) + 1;
  const hasStarted = (entry.lastWatchedEpisode || 0) > 0;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={() => onPress(entry.animeId)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        <Image
          source={entry.posterPath ? { uri: entry.posterPath } : { uri: 'https://images.unsplash.com/photo-1578632738908-48c104e8d89e?q=80&w=600' }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {entry.title}
          </Text>
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitle}>
              {hasStarted ? `Next: Episode ${nextEpisode}` : 'Start Watching'}
            </Text>
            <Text style={styles.dot}> • </Text>
            <Text style={styles.timeLabel}>
              {getRelativeTime(entry.lastViewedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.playIconContainer}>
          <View style={styles.playBlur}>
            <Feather name="play" size={24} color="#FFF" style={{ marginLeft: 4 }} />
          </View>
        </View>

        <View style={[styles.progressContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
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
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 240,
    height: 140,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    elevation: 10,
    shadowColor: colors.primaryDark || colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  pressable: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    position: 'absolute',
    bottom: spacing.M,
    left: spacing.M,
    right: spacing.M,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900' as any,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    color: '#E50914',
    fontSize: 12,
    fontWeight: 'bold' as any,
  },
  dot: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  timeLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600' as any,
  },
  playIconContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  playBlur: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(183, 28, 28, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressBar: {
    height: '100%',
  },
});
