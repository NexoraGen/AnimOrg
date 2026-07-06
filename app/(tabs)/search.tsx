import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  TouchableOpacity
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppStore } from '../../src/store/useAppStore';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { colors, spacing, borderRadius, typography } from '../../src/theme';
import {
  PosterCard,
  GlassHeader,
  SkeletonLoader,
  HEADER_HEIGHT,
  GenreChip,
  SectionHeader,
  CharacterSearchCard
} from '../../src/components/ui';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { useRouter } from 'expo-router';
import { animeApi } from '../../src/services/animeApi';
import { useDebounce } from '../../src/hooks/useDebounce';
import { Media } from '../../src/types';
import { RecommendationService, RecommendationResult } from '../../src/services/RecommendationService';
import { RecommendationModal } from '../../src/components/features/RecommendationModal';

const THEME_MAP: Record<string, number> = {
  'Action': 1, 'Adventure': 2, 'Comedy': 4, 'Romance': 22,
  'Psychological': 40, 'Fantasy': 10, 'Thriller': 41,
  'Shonen': 27, 'Seinen': 42, 'Sports': 30, 'Sci-Fi': 24,
  'Mystery': 7, 'Slice of Life': 36, 'Samurai': 21,
  'Magic': 16, 'Mecha': 18, 'Survival': 73, 'Horror': 14,
  'School Life': 23, 'Isekai': 62, 'Supernatural': 37,
  'Military': 38
};

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const { width } = useWindowDimensions();

  const searchHistory = useAppStore(state => state.searchHistory);
  const addToSearchHistory = useAppStore(state => state.addToSearchHistory);
  const clearSearchHistory = useAppStore(state => state.clearSearchHistory);
  const setModalActive = useAppStore(state => state.setModalActive);

  const [query, setQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [minScore, setMinScore] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 500);

  const [results, setResults] = useState<Media[]>([]);
  const [characterResults, setCharacterResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isDiscoverMode, setIsDiscoverMode] = useState(false);
  const [recommendationResult, setRecommendationResult] = useState<RecommendationResult | null>(null);
  const [nextRecommendationMode, setNextRecommendationMode] = useState<'personalized' | 'community'>('personalized');
  const [showRecModal, setShowRecModal] = useState(false);

  useEffect(() => {
    setModalActive(showRecModal);
  }, [showRecModal]);
  const [isRecLoading, setIsRecLoading] = useState(false);

  const watchlist = useAppStore(state => state.watchlist);
  const userRatings = useAppStore(state => state.userRatings);
  const getFavoriteGenres = useAppStore(state => state.getFavoriteGenres);
  const notInterested = useAppStore(state => state.notInterested);
  const addToNotInterested = useAppStore(state => state.addToNotInterested);
  const recommendationHistory = useAppStore(state => state.recommendationHistory);
  const addToRecommendationHistory = useAppStore(state => state.addToRecommendationHistory);
  const addToWatchlist = useAppStore(state => state.addToWatchlist);

  const numColumns = width > 1024 ? 5 : width > 768 ? 4 : 2;
  const cardWidth = (width - spacing.md * 2 - spacing.md * (numColumns - 1)) / numColumns;

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleGenre = (id: number) => {
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleDiscover = async () => {
    triggerHaptic();
    setIsRecLoading(true);
    setShowRecModal(true);
    try {
      const favoriteGenres = getFavoriteGenres();
      const result = await RecommendationService.getSmartRecommendation(
        watchlist,
        userRatings,
        favoriteGenres,
        notInterested,
        recommendationHistory,
        nextRecommendationMode
      );

      if (result) {
        setRecommendationResult(result);
        addToRecommendationHistory(result.anime.id);

        // Alternate between personalized and community modes for subsequent clicks
        setNextRecommendationMode(prev => prev === 'personalized' ? 'community' : 'personalized');
      } else {
        setRecommendationResult(null);
      }
    } catch (error) {
      console.error(error);
      setRecommendationResult(null);
    } finally {
      setIsRecLoading(false);
    }
  };

  const handleNotInterested = async (id: string) => {
    await addToNotInterested(id);
    setShowRecModal(false);
  };

  const handleRecommendAgain = () => {
    handleDiscover();
  };

  const [isAddingToWatchlist, setIsAddingToWatchlist] = useState(false);
  const [isAddedToWatchlist, setIsAddedToWatchlist] = useState(false);

  useEffect(() => {
    if (showRecModal) {
      setIsAddedToWatchlist(false);
      setIsAddingToWatchlist(false);
    }
  }, [showRecModal]);

  const handleAddToWatchlist = async (media: Media) => {
    if (isAddedToWatchlist) return;

    setIsAddingToWatchlist(true);
    triggerHaptic();
    try {
      await addToWatchlist(media, 'plan-to-watch');
      setIsAddedToWatchlist(true);
      triggerHaptic(); // Double haptic for success

      // Wait a bit to show the "Added" state before closing
      setTimeout(() => {
        setShowRecModal(false);
        router.push('/(tabs)/watchlist');
      }, 1000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAddingToWatchlist(false);
    }
  };

  useEffect(() => {
    const fetchResults = async () => {
      const hasFilters = selectedGenres.length > 0 || minScore || status;
      if (debouncedQuery.trim() === '' && !hasFilters) {
        if (!isDiscoverMode) {
          setResults([]);
          setCharacterResults([]);
        }
        setIsLoading(false);
        setPage(1);
        return;
      }

      setIsLoading(true);
      setIsDiscoverMode(false);
      setPage(1);
      try {
        // Parallel fetch for anime and characters utilizing strict thematic sorting boundaries
        const [animeResponse, charResponse] = await Promise.all([
          animeApi.searchAnime(debouncedQuery, 1, selectedGenres, undefined, 'score', 'desc'),
          debouncedQuery.trim() !== ''
            ? animeApi.searchCharacters(debouncedQuery, 1)
            : Promise.resolve({ data: [], hasNextPage: false })
        ]);

        setResults(animeResponse.data);
        setHasNextPage(animeResponse.hasNextPage);

        // Enhance character results with parent anime hints if they exist in anime results
        const enhancedChars = charResponse.data.map(char => {
          // Smart matching: see if any anime result matches the character's typical context
          // Since Jikan list doesn't have it, we just provide what we have.
          return char;
        });
        setCharacterResults(enhancedChars);

      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery, selectedGenres, minScore, status]);

  const loadMore = async () => {
    if (isMoreLoading || !hasNextPage || isLoading || isDiscoverMode) return;

    setIsMoreLoading(true);
    const nextPage = page + 1;
    try {
      const response = await animeApi.searchAnime(debouncedQuery, nextPage, selectedGenres, undefined, 'score', 'desc');
      setResults(prev => [...prev, ...response.data]);
      setPage(nextPage);
      setHasNextPage(response.hasNextPage);
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setIsMoreLoading(false);
    }
  };

  const handleMediaPress = (id: string) => {
    if (query.trim()) addToSearchHistory(query.trim());
    router.push(`/details/${id}`);
  };

  const handleCharacterPress = (charId: string) => {
    // For now, since we don't have separate character pages, 
    // we can either show a modal or navigate to a specialized search for that character's anime
    // Or just search for the character name as anime
    setQuery(results[0]?.title || query); // Fallback to first result or current query
  };

  const renderSectionHeader = (title: string) => (
    <View style={styles.listSectionHeader}>
      <SectionHeader title={title} />
    </View>
  );

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GlassHeader title="Discovery" showLogo={true} />

      <View style={[styles.content, { paddingTop: insets.top + HEADER_HEIGHT + spacing.md }]}>
        <View style={[styles.searchContainer, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Feather name="search" color={themeColors.primary} size={20} />
          <TextInput
            style={[styles.input, { color: themeColors.text }]}
            placeholder="Search anime, characters..."
            placeholderTextColor={themeColors.textDim}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {(query.length > 0 || selectedGenres.length > 0) && (
            <TouchableOpacity onPress={() => { setQuery(''); setSelectedGenres([]); setResults([]); setCharacterResults([]); }} activeOpacity={0.7}>
              <View style={[styles.clearButton, { backgroundColor: themeColors.surfaceVariant }]}>
                <Feather name="x" color={themeColors.text} size={14} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ALWAYS SHOW SELECTED THEMES OR ALL THEMES WHEN FILTERING */}
        {(selectedGenres.length > 0 || query.length > 0) && (
          <View style={{ marginBottom: spacing.sm }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.sm }}>
              {Object.entries(THEME_MAP).map(([name, id]) => (
                <GenreChip
                  key={id}
                  label={name}
                  selected={selectedGenres.includes(id)}
                  onPress={() => toggleGenre(id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {isLoading ? (
          <View style={styles.resultsGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonLoader
                key={i}
                width={cardWidth}
                height={cardWidth * 1.5}
                style={{ marginBottom: spacing.md, borderRadius: 12 }}
              />
            ))}
          </View>
        ) : (results.length > 0 || characterResults.length > 0 || selectedGenres.length > 0 || debouncedQuery.trim() !== '') ? (
          <FlashList<Media>
            showsVerticalScrollIndicator={false}
            data={results}
            numColumns={numColumns}
            {...{ estimatedItemSize: 250 } as any}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListHeaderComponent={
              results.length > 0 ? (
                <View style={styles.listSectionHeader}>
                  <SectionHeader title="Anime Series" icon="monitor" />
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <View style={[styles.gridItem, { width: cardWidth }]}>
                <PosterCard
                  media={item}
                  onPress={handleMediaPress}
                  width={cardWidth}
                />
              </View>
            )}
            ListFooterComponent={
              <>
                {characterResults.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader title="Characters" icon="users" />
                    {characterResults.map(char => (
                      <CharacterSearchCard
                        key={char.id}
                        character={char}
                        onPress={handleCharacterPress}
                      />
                    ))}
                  </View>
                )}

                {results.length === 0 && characterResults.length === 0 && !isLoading && (
                  <View style={{ alignItems: 'center', marginTop: 80, paddingHorizontal: spacing.xl }}>
                    <Feather name="alert-circle" size={48} color={themeColors.textDim} style={{ marginBottom: spacing.md }} />
                    <Text style={{ color: themeColors.textDim, fontSize: 16, textAlign: 'center', fontWeight: 'bold' }}>No results found.</Text>
                    <Text style={{ color: themeColors.textMuted, fontSize: 14, textAlign: 'center', marginTop: spacing.xs }}>
                      (Jikan API may be overloaded. Please try again later or clear filters.)
                    </Text>
                  </View>
                )}

                {isMoreLoading && (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator color={themeColors.primary} size="small" />
                  </View>
                )}
              </>
            }
          />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
            {/* ONLY SHOW THE BIG GRID OF THEMES IF THERE'S NO QUERY AND NO GENRE SELECTED */}
            {selectedGenres.length === 0 && debouncedQuery.trim() === '' && (
              <>
                <View style={{ marginBottom: spacing.sm, paddingHorizontal: spacing.md }}>
                  <Text style={{ color: themeColors.text, fontSize: 18, fontWeight: '800' }}>Anime Themes</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.themeScroll}
                  contentContainerStyle={styles.themeContent}
                >
                  <View style={styles.themeGrid}>
                    {Object.entries(THEME_MAP).map(([name, id]) => (
                      <GenreChip
                        key={id}
                        label={name}
                        selected={selectedGenres.includes(id)}
                        onPress={() => toggleGenre(id)}
                      />
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              style={[styles.discoverHero]}
              onPress={handleDiscover}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[themeColors.primary, '#800000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.4)', 'transparent']}
                start={{ x: 0.5, y: 1 }}
                end={{ x: 0.5, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.discoverIconWrapper}>
                <Feather name="zap" color="#FFF" size={20} />
              </View>
              <View style={styles.discoverTextContainer}>
                <Text style={styles.discoverTitle}>Surprise Me!</Text>
                <Text style={styles.discoverSubtitle}>Find something you'll love</Text>
              </View>
              <View style={[styles.goButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Feather name="arrow-right" color="#FFF" size={16} />
              </View>
            </TouchableOpacity>

            {searchHistory.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Recent Searches"
                  onViewAll={clearSearchHistory}
                  viewAllLabel="Clear"
                />
                <View style={styles.historyList}>
                  {searchHistory.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.historyItem}
                      onPress={() => setQuery(item)}
                    >
                      <Feather name="clock" color={themeColors.textDim} size={18} />
                      <Text style={[styles.historyText, { color: themeColors.textMuted }]}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <SectionHeader title="Trending Topics" icon="trending-up" />
              <View style={[styles.trendingGrid, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                {['Solo Leveling', 'One Piece', 'Jujutsu Kaisen', 'Oshi no Ko'].map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.trendingItem,
                      { borderBottomColor: index === 3 ? 'transparent' : themeColors.border }
                    ]}
                    onPress={() => setQuery(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.trendingRankWrapper, { backgroundColor: `${themeColors.primary}15` }]}>
                      <Text style={[styles.trendingRank, { color: themeColors.primary }]}>{index + 1}</Text>
                    </View>
                    <Text style={[styles.trendingText, { color: themeColors.text }]}>{item}</Text>
                    <Feather name="arrow-up-right" color={themeColors.primary} size={16} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      <RecommendationModal
        visible={showRecModal}
        isLoading={isRecLoading}
        isAdded={isAddedToWatchlist}
        isAdding={isAddingToWatchlist}
        recommendation={recommendationResult}
        onClose={() => setShowRecModal(false)}
        onRecommendAgain={handleDiscover}
        onNotInterested={handleNotInterested}
        onAddToWatchlist={handleAddToWatchlist}
        onViewDetails={(id) => {
          setShowRecModal(false);
          router.push(`/details/${id}`);
        }}
      />
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 52,
    borderWidth: 1.5,
    marginBottom: spacing.xl,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeScroll: {
    marginBottom: spacing.lg,
  },
  themeContent: {
    paddingRight: spacing.xl,
    paddingLeft: spacing.md,
  },
  themeGrid: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    height: 100, // Forces wrapping into 2 rows correctly across horizontal axis
    alignContent: 'flex-start',
    rowGap: spacing.sm,
    columnGap: spacing.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  historyList: {
    gap: spacing.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  historyText: {
    fontSize: typography.sizes.md,
    marginLeft: spacing.md,
  },
  trendingGrid: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
  },
  trendingRankWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  trendingRank: {
    fontSize: 14,
    fontWeight: '900',
  },
  trendingText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    marginBottom: spacing.md,
  },
  footerLoader: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  discoverHero: {
    height: 72,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  discoverIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  discoverTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  discoverTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800' as any,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  discoverSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  goButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listSectionHeader: {
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  }
});
