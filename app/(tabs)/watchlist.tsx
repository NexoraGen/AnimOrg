import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../src/theme';
import { GlassHeader, PosterCard, HEADER_HEIGHT, Button } from '../../src/components/ui';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { useAppStore } from '../../src/store/useAppStore';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useState } from 'react';
import { WatchlistItem, Media } from '../../src/types';



export default function WatchlistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { watchlist, animeProgress } = useAppStore();
  const [activeTab, setActiveTab] = useState<string>('all');
  const themeColors = useThemeColors();
  const { width } = useWindowDimensions();

  const numColumns = width > 1024 ? 5 : width > 768 ? 4 : 2;
  const cardWidth = (width - spacing.md * 2 - spacing.md * (numColumns - 1)) / numColumns;

  const TABS = [
    { id: 'all', label: 'All' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'watching', label: 'Watching' },
    { id: 'completed', label: 'Completed' },
    { id: 'plan-to-watch', label: 'Planned' },
    { id: 'dropped', label: 'Dropped' },
  ];

  const filteredWatchlist = watchlist.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'favorites') return item.isFavorite;
    return item.status === activeTab;
  });

  const mapWatchlistItemToMedia = (item: WatchlistItem): Media => ({
    id: item.mediaId,
    title: item.title || 'Unknown Title',
    posterPath: item.posterPath || '',
    rating: item.rating,
    description: '',
    backdropPath: '',
    releaseYear: 0,
    genres: item.genres || [],
    type: 'anime',
  });

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GlassHeader title="My Watchlist" showLogo={true} />

      <View style={[styles.tabsContainer, { paddingTop: insets.top + HEADER_HEIGHT + 20 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filteredWatchlist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: themeColors.surfaceVariant }]}>
            <Feather name="bookmark" size={48} color={themeColors.textDim} />
            <View style={[styles.emptyIconBadge, { backgroundColor: themeColors.primary }]}>
              <Feather name="plus" size={16} color="#FFF" />
            </View>
          </View>
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>Your Library is Empty</Text>
          <Text style={[styles.emptySubtitle, { color: themeColors.textMuted }]}>
            {activeTab === 'favorites'
              ? "You haven't added any favorites to your collection yet."
              : "Discover masterpieces and track your progress in real-time."}
          </Text>
          <Button
            title="Start Discovering"
            onPress={() => router.push('/(tabs)/home')}
            style={styles.emptyButton}
            variant="primary"
          />
        </View>
      ) : (
        <FlashList
          data={filteredWatchlist}
          keyExtractor={(item) => item.mediaId}
          numColumns={numColumns}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const progressRec = animeProgress[item.mediaId];
            const watchedCount = progressRec ? Object.values(progressRec.watchedEpisodes).filter(v => v).length : 0;
            const total = item.episodes || 0;
            const percentage = total > 0 ? watchedCount / total : 0;

            return (
              <View style={[styles.cardContainer, { width: cardWidth }]}>
                <PosterCard
                  media={mapWatchlistItemToMedia(item)}
                  onPress={() => router.push(`/details/${item.mediaId}`)}
                  width={cardWidth}
                  showProgress={item.status === 'watching' && percentage > 0}
                  progress={percentage}
                />
              </View>
            );
          }}
        />
      )}

    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabsContainer: {
    paddingBottom: spacing.sm,
  },
  tabsScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTab: {
    backgroundColor: 'rgba(183, 28, 28, 0.2)',
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: typography.weights.bold as any,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },
  cardContainer: {
    marginBottom: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  emptyIconBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0F0F0F',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  emptyButton: {
    minWidth: 200,
  },
  premiumBanner: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(183, 28, 28, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(183, 28, 28, 0.3)',
    alignItems: 'center',
  },
  premiumTitle: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    marginBottom: 4,
  },
  premiumText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
});
