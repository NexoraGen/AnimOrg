import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  useWindowDimensions,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, spacing, typography, borderRadius } from '../../src/theme';
import { GlassHeader, PosterCard, HEADER_HEIGHT, SkeletonLoader } from '../../src/components/ui';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { animeApi } from '../../src/services/animeApi';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { Media } from '../../src/types';

export default function CategoryScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const themeColors = useThemeColors();
  
  const [data, setData] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('popularity');
  
  const numColumns = viewMode === 'grid' ? (width > 1024 ? 5 : width > 768 ? 4 : 2) : 1;
  const cardWidth = viewMode === 'grid' 
    ? (width - spacing.md * 2 - spacing.md * (numColumns - 1)) / numColumns
    : width - spacing.md * 2;



  const getTitle = () => {
    switch (type) {
      case 'trending': return 'Trending Now';
      case 'seasonal': return 'Airing This Season';
      case 'upcoming': return 'Upcoming Anime';
      case 'top-rated': return 'Top Rated';
      case 'action': return 'Action Anime';
      case 'romance': return 'Romance Anime';
      case 'fantasy': return 'Fantasy Anime';
      case 'comedy': return 'Comedy Anime';
      default: return 'Anime List';
    }
  };

  const fetchCategoryData = async (pageNum: number) => {
    try {
      // Note: sortBy would normally be passed to API, using mock logic for now
      switch (type) {
        case 'trending': return await animeApi.getTrendingAnime(pageNum);
        case 'seasonal': return await animeApi.getSeasonalAnime(pageNum);
        case 'upcoming': return await animeApi.getUpcomingAnime(pageNum);
        case 'top-rated': return await animeApi.getTopAnime(pageNum);
        case 'action': return await animeApi.getAnimeByGenre(1, pageNum);
        case 'romance': return await animeApi.getAnimeByGenre(22, pageNum);
        case 'fantasy': return await animeApi.getAnimeByGenre(10, pageNum);
        case 'comedy': return await animeApi.getAnimeByGenre(4, pageNum);
        default: return [];
      }
    } catch (error) {
      console.error('Error fetching category data:', error);
      return [];
    }
  };

  const initialFetch = async () => {
    setIsLoading(true);
    setPage(1);
    const results = await fetchCategoryData(1);
    setData(results);
    setIsLoading(false);
  };

  const loadMore = async () => {
    if (isMoreLoading) return;
    setIsMoreLoading(true);
    const nextPage = page + 1;
    const results = await fetchCategoryData(nextPage);
    if (results.length > 0) {
      setData(prev => [...prev, ...results]);
      setPage(nextPage);
    }
    setIsMoreLoading(false);
  };

  useEffect(() => {
    initialFetch();
  }, [type, sortBy]);

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
  };

  const SORT_OPTIONS = [
    { id: 'popularity', label: 'Popularity' },
    { id: 'score', label: 'Score' },
    { id: 'newest', label: 'Newest' },
  ];

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GlassHeader 
        title={getTitle()} 
        leftComponent={
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="chevron-left" color={themeColors.text} size={28} />
          </TouchableOpacity>
        }
        rightComponent={
          <TouchableOpacity onPress={toggleViewMode} style={styles.viewToggle}>
            <Feather name={viewMode === 'grid' ? 'list' : 'grid'} color={themeColors.text} size={22} />
          </TouchableOpacity>
        }
      />
      
      <View style={{ flex: 1, paddingTop: insets.top + HEADER_HEIGHT }}>
        {/* Filter Bar (Phase 6.1) */}
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity 
                key={opt.id} 
                style={[
                  styles.filterChip, 
                  { backgroundColor: themeColors.surfaceVariant },
                  sortBy === opt.id && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
                ]}
                onPress={() => setSortBy(opt.id)}
              >
                <Text style={[
                  styles.filterText, 
                  { color: themeColors.textMuted },
                  sortBy === opt.id && { color: '#FFF', fontWeight: 'bold' }
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={[styles.resultCount, { color: themeColors.textDim }]}>
            {data.length > 0 ? `${data.length}+ anime` : ''}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.gridContainer}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <SkeletonLoader 
                key={i} 
                width={cardWidth} 
                height={viewMode === 'grid' ? cardWidth * 1.5 : 100}
                style={{ marginBottom: spacing.md, borderRadius: 12 }} 
              />
            ))}
          </View>
        ) : (
          <FlashList
            data={data}
            numColumns={numColumns}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={[styles.cardContainer, { width: cardWidth }]}>
                <PosterCard 
                  media={item} 
                  onPress={(id) => router.push(`/details/${id}`)} 
                  width={cardWidth}
                  variant={viewMode === 'list' ? 'list' : 'default'}
                />
              </View>
            )}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={isMoreLoading ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={themeColors.primary} size="small" />
              </View>
            ) : <View style={{ height: 100 }} />}
          />
        )}
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 4,
  },
  viewToggle: {
    padding: 4,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterText: {
    fontSize: 12,
  },
  resultCount: {
    fontSize: 10,
    marginLeft: spacing.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  cardContainer: {
    marginBottom: spacing.md,
  },
  footerLoader: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
});
