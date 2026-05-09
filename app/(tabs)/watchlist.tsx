import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Dimensions,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { colors, spacing, typography } from '../../src/theme';
import { GlassHeader, PosterCard } from '../../src/components/ui';
import { useAppStore } from '../../src/store/useAppStore';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { WatchlistItem, Media } from '../../src/types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.md * 3) / 2;

export default function WatchlistScreen() {
  const router = useRouter();
  const watchlist = useAppStore((state) => state.watchlist);
  const [activeTab, setActiveTab] = useState<string>('all');
  
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
    rating: item.rating || 0,
    description: '',
    backdropPath: '',
    releaseYear: 0,
    genres: item.genres || [],
    type: 'anime',
  });

  return (
    <View style={styles.container}>
      <GlassHeader title="My Watchlist" />
      
      <View style={styles.tabsContainer}>
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
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'favorites' 
              ? "You haven't added any favorites." 
              : "Start adding anime you want to watch!"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredWatchlist}
          keyExtractor={(item) => item.mediaId}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.cardContainer}>
              <PosterCard 
                media={mapWatchlistItemToMedia(item)} 
                onPress={() => router.push(`/details/${item.mediaId}`)} 
              />
            </View>
          )}
        />
      )}

      <View style={styles.premiumBanner}>
        <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
        <Text style={styles.premiumText}>Unlock unlimited watchlists and offline viewing.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabsContainer: {
    paddingTop: 100,
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
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
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
    width: '48%',
    marginBottom: spacing.md,
    marginRight: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
  premiumBanner: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
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
