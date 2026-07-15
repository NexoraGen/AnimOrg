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
import { SwipeableTabs } from '../../src/components/layout/SwipeableTabs';

interface WatchlistTabFeedProps {
  tabId: string;
  filteredWatchlist: WatchlistItem[];
  animeProgress: any;
  numColumns: number;
  cardWidth: number;
  router: any;
  themeColors: any;
}

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

const WatchlistTabFeed: React.FC<WatchlistTabFeedProps> = React.memo(({
  tabId,
  filteredWatchlist,
  animeProgress,
  numColumns,
  cardWidth,
  router,
  themeColors
}) => {
  if (filteredWatchlist.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: themeColors.surfaceVariant }]}>
          <Feather name="bookmark" size={48} color={themeColors.textDim} />
          <View style={[styles.emptyIconBadge, { backgroundColor: themeColors.primary }]}>
            <Feather name="plus" size={16} color="#FFF" />
          </View>
        </View>
        <Text style={[styles.emptyTitle, { color: themeColors.text }]}>Your Library is Empty</Text>
        <Text style={[styles.emptySubtitle, { color: themeColors.textMuted }]}>
          {tabId === 'favorites'
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
    );
  }

  return (
    <FlashList<WatchlistItem>
      data={filteredWatchlist}
      keyExtractor={(item) => item.mediaId}
      numColumns={numColumns}
      contentContainerStyle={styles.listContent}
      {...{ estimatedItemSize: 180 } as any}
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
              height={cardWidth * 1.5}
              showProgress={item.status === 'watching' && percentage > 0}
              progress={percentage}
            />
          </View>
        );
      }}
    />
  );
}, (prevProps, nextProps) => {
  if (prevProps.tabId !== nextProps.tabId) return false;
  if (prevProps.numColumns !== nextProps.numColumns) return false;
  if (prevProps.cardWidth !== nextProps.cardWidth) return false;
  if (prevProps.themeColors !== nextProps.themeColors) return false;

  // Verify list array references
  if (prevProps.filteredWatchlist !== nextProps.filteredWatchlist) {
    if (prevProps.filteredWatchlist.length !== nextProps.filteredWatchlist.length) return false;
    for (let i = 0; i < prevProps.filteredWatchlist.length; i++) {
      if (prevProps.filteredWatchlist[i].mediaId !== nextProps.filteredWatchlist[i].mediaId) return false;
      if (prevProps.filteredWatchlist[i].isFavorite !== nextProps.filteredWatchlist[i].isFavorite) return false;
      if (prevProps.filteredWatchlist[i].status !== nextProps.filteredWatchlist[i].status) return false;
    }
  }

  // Verify progress states only for loaded list items
  for (const item of prevProps.filteredWatchlist) {
    const id = item.mediaId;
    if (prevProps.animeProgress[id] !== nextProps.animeProgress[id]) return false;
  }

  return true;
});

export default function WatchlistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const watchlist = useAppStore(state => state.watchlist);
  const animeProgress = useAppStore(state => state.animeProgress);
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

  const filteredListMap = React.useMemo(() => {
    return {
      all: watchlist,
      favorites: watchlist.filter(item => item.isFavorite),
      watching: watchlist.filter(item => item.status === 'watching'),
      completed: watchlist.filter(item => item.status === 'completed'),
      'plan-to-watch': watchlist.filter(item => item.status === 'plan-to-watch'),
      dropped: watchlist.filter(item => item.status === 'dropped'),
    };
  }, [watchlist]);

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GlassHeader title="My Watchlist" showLogo={true} />

      <View style={{ flex: 1, paddingTop: insets.top + HEADER_HEIGHT }}>
        <SwipeableTabs
          tabs={TABS.map(t => t.label)}
          activeTab={TABS.find(t => t.id === activeTab)?.label || 'All'}
          onTabChange={(label) => {
            const found = TABS.find(t => t.label === label);
            if (found) setActiveTab(found.id);
          }}
        >
          {TABS.map(tab => (
            <WatchlistTabFeed
              key={tab.id}
              tabId={tab.id}
              filteredWatchlist={filteredListMap[tab.id as keyof typeof filteredListMap] || []}
              animeProgress={animeProgress}
              numColumns={numColumns}
              cardWidth={cardWidth}
              router={router}
              themeColors={themeColors}
            />
          ))}
        </SwipeableTabs>
      </View>
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
    paddingTop: spacing.md,
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
