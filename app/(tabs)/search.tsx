import React, { useState, useEffect, useRef, useMemo } from 'react';
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

// Memory cache for active search session (Page 1 results)
const SEARCH_SESSION_CACHE = new Map<string, {
  results: Media[];
  characterResults: any[];
  hasNextPage: boolean;
}>();

// Memoized Options & Landing View to prevent heavy rendering when typing
const ThemesAndOptionsView = React.memo(({
  themeColors,
  selectedGenres,
  toggleGenre,
  handleDiscover,
  searchHistory,
  setQuery,
  clearSearchHistory
}: {
  themeColors: any;
  selectedGenres: number[];
  toggleGenre: (id: number) => void;
  handleDiscover: () => void;
  searchHistory: string[];
  setQuery: (q: string) => void;
  clearSearchHistory: () => void;
}) => {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
      {selectedGenres.length === 0 && (
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
  );
});

// Memoized Skeleton Grid
const SkeletonLoaderGrid = React.memo(({
  cardWidth,
  themeColors,
  searchLoadingText
}: {
  cardWidth: number;
  themeColors: any;
  searchLoadingText: string | null;
}) => {
  return (
    <View style={[styles.resultsGrid, { marginTop: spacing.xl, justifyContent: 'center' }]}>
      {searchLoadingText && (
        <View style={{ width: '100%', alignItems: 'center', marginBottom: spacing.xl }}>
          <ActivityIndicator color={themeColors.primary} size="large" />
          <Text style={{ color: themeColors.textMuted, marginTop: spacing.md, fontSize: 16 }}>
            {searchLoadingText}
          </Text>
        </View>
      )}
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonLoader
          key={i}
          width={cardWidth}
          height={cardWidth * 1.5}
          style={{ marginBottom: spacing.md, borderRadius: 12 }}
        />
      ))}
    </View>
  );
});

// Memoized List View
const ResultsListView = React.memo(({
  results,
  characterResults,
  numColumns,
  cardWidth,
  themeColors,
  loadMore,
  isMoreLoading,
  searchError,
  isLoading,
  handleMediaPress,
  handleCharacterPress
}: {
  results: Media[];
  characterResults: any[];
  numColumns: number;
  cardWidth: number;
  themeColors: any;
  loadMore: () => void;
  isMoreLoading: boolean;
  searchError: string | null;
  isLoading: boolean;
  handleMediaPress: (id: string) => void;
  handleCharacterPress: (id: string) => void;
}) => {
  return (
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
              <Text style={{ color: themeColors.textDim, fontSize: 16, textAlign: 'center', fontWeight: 'bold' }}>
                {searchError ? "Oops!" : "No results found."}
              </Text>
              <Text style={{ color: themeColors.textMuted, fontSize: 14, textAlign: 'center', marginTop: spacing.xs }}>
                {searchError || "No anime found matching your search. Please try a different query or clear your filters."}
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
  );
});

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const { width } = useWindowDimensions();

  // Metrics profiling references
  const lastKeystrokeTimeRef = useRef<number>(0);
  const renderStartRef = useRef<number>(0);

  renderStartRef.current = performance.now();

  const searchHistory = useAppStore(state => state.searchHistory);
  const addToSearchHistory = useAppStore(state => state.addToSearchHistory);
  const clearSearchHistory = useAppStore(state => state.clearSearchHistory);
  const setModalActive = useAppStore(state => state.setModalActive);

  // Split immediate input value state from debounced search flow
  const [inputText, setInputText] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [minScore, setMinScore] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const debouncedQuery = useDebounce(inputText, 500);

  const [results, setResults] = useState<Media[]>([]);
  const [characterResults, setCharacterResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isDiscoverMode, setIsDiscoverMode] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoadingText, setSearchLoadingText] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [recommendationResult, setRecommendationResult] = useState<RecommendationResult | null>(null);
  const [nextRecommendationMode, setNextRecommendationMode] = useState<'personalized' | 'community'>('personalized');
  const [showRecModal, setShowRecModal] = useState(false);

  // Keep reference of active abort controller to cancel in-flight queries
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const handleInputChange = (text: string) => {
    lastKeystrokeTimeRef.current = Date.now();
    setInputText(text);
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

  const handleAddToWatchlist = async (media: Media) => {
    if (isAddedToWatchlist) return;

    setIsAddingToWatchlist(true);
    triggerHaptic();
    try {
      await addToWatchlist(media, 'plan-to-watch');
      setIsAddedToWatchlist(true);
      triggerHaptic();

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

  const [isAddingToWatchlist, setIsAddingToWatchlist] = useState(false);
  const [isAddedToWatchlist, setIsAddedToWatchlist] = useState(false);

  useEffect(() => {
    if (showRecModal) {
      setIsAddedToWatchlist(false);
      setIsAddingToWatchlist(false);
    }
  }, [showRecModal]);

  // Main SWR and query fetcher effect
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
        setSearchError(null);
        setSearchLoadingText(null);
        setSnackbarMessage(null);
        return;
      }

      // Check current session cache first (SWR pattern)
      const cacheKey = `q:${debouncedQuery.trim().toLowerCase()}_g:${selectedGenres.slice().sort().join(',')}`;
      const cached = SEARCH_SESSION_CACHE.get(cacheKey);

      if (cached) {
        // Render instantly
        setResults(cached.results);
        setCharacterResults(cached.characterResults);
        setHasNextPage(cached.hasNextPage);
        setIsLoading(false);
      } else {
        setIsLoading(true);
        setResults([]);
        setCharacterResults([]);
      }

      setIsDiscoverMode(false);
      setPage(1);
      setSearchError(null);
      setSearchLoadingText("Searching...");
      setSnackbarMessage(null);

      // Abort any active in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const onRetryStatus = (info: { attempt: number; maxAttempts: number; fallback: boolean; rawStatusMsg?: string }) => {
          const msg = info.rawStatusMsg || "Temporary network issue. Retrying...";
          setSearchLoadingText(msg);
          if (cached) setSnackbarMessage(msg);
        };

        if (debouncedQuery.trim() !== '' && lastKeystrokeTimeRef.current > 0) {
          const delay = Date.now() - lastKeystrokeTimeRef.current;
          console.log(`[Search Metrics] Debounce delay: ${delay}ms`);
        }

        const apiStart = Date.now();
        console.log(`[Search Metrics] [search.tsx] Request start timestamp: ${apiStart} | query: "${debouncedQuery}"`);
        const [animeResponse, charResponse] = await Promise.all([
          animeApi.searchAnime(debouncedQuery, 1, selectedGenres, undefined, 'score', 'desc', onRetryStatus, controller.signal),
          debouncedQuery.trim() !== ''
            ? animeApi.searchCharacters(debouncedQuery, 1, controller.signal).catch(err => {
              if (err.name === 'AbortError') throw err;
              console.warn("Character search failed silently:", err);
              return { data: [], hasNextPage: false };
            })
            : Promise.resolve({ data: [], hasNextPage: false })
        ]);

        const apiDuration = Date.now() - apiStart;
        console.log(`[Search Metrics] API response time: ${apiDuration}ms`);

        // Cache fresh results
        SEARCH_SESSION_CACHE.set(cacheKey, {
          results: animeResponse.data,
          characterResults: charResponse.data,
          hasNextPage: animeResponse.hasNextPage
        });

        setResults(animeResponse.data);
        setHasNextPage(animeResponse.hasNextPage);
        setSnackbarMessage(null);
        setCharacterResults(charResponse.data);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log(`[Search] Search query "${debouncedQuery}" cancelled.`);
          return;
        }
        console.error('Search error:', error);
        setSearchError("We had trouble reaching the search service. Please try again in a moment.");
      } finally {
        setIsLoading(false);
        setSearchLoadingText(null);
      }
    };

    fetchResults();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
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
    if (inputText.trim()) addToSearchHistory(inputText.trim());
    router.push(`/details/${id}`);
  };

  const handleCharacterPress = (charId: string) => {
    handleInputChange(results[0]?.title || inputText);
  };

  // Profile render paint duration
  useEffect(() => {
    const elapsed = performance.now() - renderStartRef.current;
    console.log(`[Search Metrics] Render time: ${elapsed.toFixed(2)}ms`);
  });

  const showResults = results.length > 0 || characterResults.length > 0 || selectedGenres.length > 0 || debouncedQuery.trim() !== '';

  const isDebouncing = inputText.trim() !== '' && inputText !== debouncedQuery;
  const showSkeletons = isLoading || isDebouncing;

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
            value={inputText}
            onChangeText={handleInputChange}
            returnKeyType="search"
          />
          {(inputText.length > 0 || selectedGenres.length > 0) && (
            <TouchableOpacity onPress={() => { setInputText(''); setSelectedGenres([]); setResults([]); setCharacterResults([]); setSearchError(null); }} activeOpacity={0.7}>
              <View style={[styles.clearButton, { backgroundColor: themeColors.surfaceVariant }]}>
                <Feather name="x" color={themeColors.text} size={14} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {(selectedGenres.length > 0 || inputText.length > 0) && (
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

        {showSkeletons && results.length === 0 ? (
          <SkeletonLoaderGrid
            cardWidth={cardWidth}
            themeColors={themeColors}
            searchLoadingText={searchLoadingText}
          />
        ) : showResults ? (
          <ResultsListView
            results={results}
            characterResults={characterResults}
            numColumns={numColumns}
            cardWidth={cardWidth}
            themeColors={themeColors}
            loadMore={loadMore}
            isMoreLoading={isMoreLoading}
            searchError={searchError}
            isLoading={isLoading}
            handleMediaPress={handleMediaPress}
            handleCharacterPress={handleCharacterPress}
          />
        ) : (
          <ThemesAndOptionsView
            themeColors={themeColors}
            selectedGenres={selectedGenres}
            toggleGenre={toggleGenre}
            handleDiscover={handleDiscover}
            searchHistory={searchHistory}
            setQuery={handleInputChange}
            clearSearchHistory={clearSearchHistory}
          />
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

      {snackbarMessage && (
        <View style={{
          position: 'absolute',
          bottom: insets.bottom + 120,
          alignSelf: 'center',
          backgroundColor: themeColors.surface,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          borderRadius: borderRadius.full,
          flexDirection: 'row',
          alignItems: 'center',
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
          borderWidth: 1,
          borderColor: themeColors.border
        }}>
          <ActivityIndicator color={themeColors.primary} size="small" style={{ marginRight: spacing.md }} />
          <Text style={{ color: themeColors.text, fontSize: 14, fontWeight: '600' }}>{snackbarMessage}</Text>
        </View>
      )}
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
