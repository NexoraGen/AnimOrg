import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  useWindowDimensions,
  Animated,
  TouchableOpacity
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, borderRadius, typography } from '../../src/theme';
import {
  HeroBanner,
  HorizontalCarousel,
  StreamingHeader,
  SectionHeader,
  ContinueWatchingCard,
  SkeletonLoader,
  EmptyRecommendations,
  HEADER_HEIGHT
} from '../../src/components/ui';
import { useAppStore } from '../../src/store/useAppStore';
import { animeApi } from '../../src/services/animeApi';
import { Media } from '../../src/types';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { WatchNextSection } from '../../src/components/features/WatchNextSection';
import { notificationService } from '../../src/services/notifications';
import { RecommendationService, RecommendationResult } from '../../src/services/RecommendationService';
import { PosterCard } from '../../src/components/ui/PosterCard';
import { ForYouSection } from '../../src/components/features/ForYouSection';

const RotatingHeroBanner = React.memo(({ topRated, onPress }: { topRated: Media[], onPress: (id: string) => void }) => {
  const [heroAnime, setHeroAnime] = useState<Media | null>(null);
  const heroInterval = useRef<any>(null);

  useEffect(() => {
    if (topRated.length > 0) {
      setHeroAnime(topRated[0]);
      if (heroInterval.current) clearInterval(heroInterval.current);
      heroInterval.current = setInterval(() => {
        setHeroAnime(prev => {
          if (!prev) return topRated[0];
          const currentIndex = topRated.findIndex(a => a.id === prev.id);
          const nextIndex = (currentIndex + 1) % Math.min(5, topRated.length);
          return topRated[nextIndex];
        });
      }, 8000);
    }
    return () => {
      if (heroInterval.current) clearInterval(heroInterval.current);
    };
  }, [topRated]);

  if (!heroAnime) return null;

  return (
    <View style={styles.heroWrapper}>
      <HeroBanner
        media={heroAnime}
        onPress={onPress}
      />
    </View>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const { width } = useWindowDimensions();
  // Individual selectors to prevent full-store rerender cascades
  const user = useAppStore(s => s.user);
  const watchlist = useAppStore(s => s.watchlist);
  const continueWatching = useAppStore(s => s.continueWatching);
  const userRatings = useAppStore(s => s.userRatings);
  const hasHydrated = useAppStore(s => s.hasHydrated);

  const [trendingAnime, setTrendingAnime] = useState<Media[]>([]);
  const [topRated, setTopRated] = useState<Media[]>([]);
  const [seasonalAnime, setSeasonalAnime] = useState<Media[]>([]);
  const [upcomingAnime, setUpcomingAnime] = useState<Media[]>([]);
  const [curatedAnime, setCuratedAnime] = useState<Record<string, Media[]>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHomeData = useCallback(async () => {
    try {
      const { user, watchlist, getFavoriteGenres } = useAppStore.getState();

      // Launch all 4 primary feeds concurrently; update state as soon as each stream arrives
      const pTrending = animeApi.getTrendingAnime(1, (fresh) => {
        setTrendingAnime(fresh);
        setIsLoading(false);
      }).then(data => {
        if (data && data.length > 0) {
          setTrendingAnime(data);
          setIsLoading(false);
        }
      }).catch(err => console.warn("Failed to fetch trending:", err));

      const pTop = animeApi.getTopAnime(1, (fresh) => {
        setTopRated(fresh);
        setIsLoading(false);
      }).then(data => {
        if (data && data.length > 0) {
          setTopRated(data);
          setIsLoading(false);
        }
      }).catch(err => console.warn("Failed to fetch top rated:", err));

      const pSeasonal = animeApi.getSeasonalAnime(1, (fresh) => {
        setSeasonalAnime(fresh);
        setIsLoading(false);
      }).then(data => {
        if (data && data.length > 0) {
          setSeasonalAnime(data);
          setIsLoading(false);
        }
      }).catch(err => console.warn("Failed to fetch seasonal:", err));

      const pUpcoming = animeApi.getUpcomingAnime(1, (fresh) => {
        setUpcomingAnime(fresh);
        setIsLoading(false);
      }).then(data => {
        if (data && data.length > 0) {
          setUpcomingAnime(data);
          setIsLoading(false);
        }
      }).catch(err => console.warn("Failed to fetch upcoming:", err));

      // Wait for primary feeds to settle so notification checking and curated lists can prepare
      await Promise.allSettled([pTrending, pTop, pSeasonal, pUpcoming]);

      // Ensure loading spinner is turned off if any data exists
      setIsLoading(false);

      // Check for airing alerts for "Watching" anime
      const { notificationsEnabled } = useAppStore.getState();
      if (notificationsEnabled) {
        const watchingAnime = watchlist.filter(item => item.status === 'watching');
        notificationService.checkAndScheduleAiringAlerts(watchingAnime, seasonalAnime);
      }

      // Premium Curated Curation Engine
      const baseCategories = ['All-Time Legends', 'Modern Masterpieces'];
      const tasteCategories: Record<string, string[]> = {
        'Action': ['Must Watch Shonen', 'Dark Masterpieces'],
        'Horror': ['Dark Masterpieces', 'Psychological Peaks'],
        'Mystery': ['Psychological Peaks', 'Best Storytelling'],
        'Romance': ['Best Storytelling', 'Highest Rated Anime'],
        'Drama': ['Best Storytelling', 'Fan Favorites'],
        'Comedy': ['Fan Favorites', 'Beginner Essentials'],
        'Fantasy': ['Anime Hall of Fame', 'All-Time Legends'],
        'Sci-Fi': ['Modern Masterpieces', 'Psychological Peaks'],
      };

      const preferredGenres = getFavoriteGenres();
      let matchedCategories: string[] = [];
      preferredGenres.forEach(genre => {
        if (tasteCategories[genre]) {
          matchedCategories.push(...tasteCategories[genre]);
        }
      });

      // Deduplicate matched arrays
      matchedCategories = [...new Set(matchedCategories)];

      // Pick 2 random from matched categories, or use strict fallbacks
      const shuffle = (array: any[]) => array.sort(() => 0.5 - Math.random());

      let finalCategories = [...baseCategories];
      if (matchedCategories.length > 0) {
        finalCategories.push(...shuffle(matchedCategories).slice(0, 2));
      } else {
        finalCategories.push('Must Watch Shonen', 'Psychological Peaks');
      }

      // Keep only unique elements avoiding duplication
      finalCategories = [...new Set(finalCategories)].slice(0, 4);

      // Load curated lists progressively without blocking main view
      finalCategories.forEach(category => {
        animeApi.getCuratedList(category, (freshCurated) => {
          setCuratedAnime(prev => ({ ...prev, [category]: freshCurated }));
        }).then(data => {
          if (data && data.length > 0) {
            setCuratedAnime(prev => ({ ...prev, [category]: data }));
          }
        }).catch(err => console.warn(`Failed to fetch curated list for ${category}:`, err));
      });

    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasHydrated) {
      fetchHomeData();
    }
  }, [user?.id, hasHydrated]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHomeData();
    setRefreshing(false);
  }, []);

  const handleMediaPress = useCallback((id: string) => {
    router.push(`/details/${id}`);
  }, [router]);

  const isDesktop = width > 1024;

  if ((isLoading || !hasHydrated) && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <StreamingHeader avatarUrl={user?.avatarUrl} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SkeletonLoader width={width - spacing.md * 2} height={420} style={{ margin: spacing.md, borderRadius: borderRadius.lg }} />
          <View style={{ padding: spacing.md }}>
            <SkeletonLoader width={150} height={24} style={{ marginBottom: spacing.md }} />
            <View style={{ flexDirection: 'row' }}>
              {[1, 2, 3].map(i => <SkeletonLoader key={i} width={120} height={180} style={{ marginRight: spacing.md, borderRadius: borderRadius.md }} />)}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StreamingHeader
        avatarUrl={user?.avatarUrl}
        onAvatarPress={() => router.push('/(tabs)/profile')}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 90 } // Adds crisp visual spacing between the header and the hero pic section
        ]}
        showsVerticalScrollIndicator={false}
        decelerationRate="normal"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
          />
        }
      >
        <RotatingHeroBanner topRated={topRated} onPress={handleMediaPress} />

        <WatchNextSection />

        <HorizontalCarousel
          title="Trending Now"
          icon="zap"
          data={trendingAnime}
          onPress={handleMediaPress}
          onViewAll={() => router.push('/category/trending')}
        />

        <ForYouSection />

        <HorizontalCarousel
          title="Airing This Season"
          icon="activity"
          data={seasonalAnime}
          onPress={handleMediaPress}
          onViewAll={() => router.push('/category/current-season')}
        />

        {Object.entries(curatedAnime).map(([category, data]) => (
          <HorizontalCarousel
            key={category}
            title={category}
            icon="award"
            data={data}
            onPress={handleMediaPress}
            onViewAll={() => router.push(`/category/${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)}
          />
        ))}

        <HorizontalCarousel
          title="Upcoming Hype"
          icon="calendar"
          data={upcomingAnime}
          onPress={handleMediaPress}
          onViewAll={() => router.push('/category/upcoming')}
        />

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroWrapper: {
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: spacing.M,
    marginBottom: spacing.L,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  section: {
    marginBottom: spacing.XL,
  },
  horizontalScroll: {
    paddingHorizontal: spacing.M,
    gap: spacing.M,
  },
});


