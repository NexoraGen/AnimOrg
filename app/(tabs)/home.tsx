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

  const [isTrendingLoading, setIsTrendingLoading] = useState(true);
  const [isTopLoading, setIsTopLoading] = useState(true);
  const [isSeasonalLoading, setIsSeasonalLoading] = useState(true);
  const [isUpcomingLoading, setIsUpcomingLoading] = useState(true);
  const [curatedLoading, setCuratedLoading] = useState<Record<string, boolean>>({});

  const [refreshing, setRefreshing] = useState(false);

  const fetchHomeData = useCallback(async () => {
    try {
      const { user, watchlist, getFavoriteGenres } = useAppStore.getState();

      setIsTrendingLoading(true);
      setIsTopLoading(true);
      setIsSeasonalLoading(true);
      setIsUpcomingLoading(true);

      // Launch all 4 primary feeds concurrently; update state as soon as each stream arrives
      const pTrending = animeApi.getTrendingAnime(1, (fresh) => {
        setTrendingAnime(fresh);
        setIsTrendingLoading(false);
      }).then(data => {
        if (data && data.length > 0) {
          setTrendingAnime(data);
        }
        setIsTrendingLoading(false);
      }).catch(err => {
        console.warn("Failed to fetch trending:", err);
        setIsTrendingLoading(false);
      });

      const pTop = animeApi.getTopAnime(1, (fresh) => {
        setTopRated(fresh);
        setIsTopLoading(false);
      }).then(data => {
        if (data && data.length > 0) {
          setTopRated(data);
        }
        setIsTopLoading(false);
      }).catch(err => {
        console.warn("Failed to fetch top rated:", err);
        setIsTopLoading(false);
      });

      const pSeasonal = animeApi.getSeasonalAnime(1, (fresh) => {
        setSeasonalAnime(fresh);
        setIsSeasonalLoading(false);
      }).then(data => {
        if (data && data.length > 0) {
          setSeasonalAnime(data);
        }
        setIsSeasonalLoading(false);
      }).catch(err => {
        console.warn("Failed to fetch seasonal:", err);
        setIsSeasonalLoading(false);
      });

      const pUpcoming = animeApi.getUpcomingAnime(1, (fresh) => {
        setUpcomingAnime(fresh);
        setIsUpcomingLoading(false);
      }).then(data => {
        if (data && data.length > 0) {
          setUpcomingAnime(data);
        }
        setIsUpcomingLoading(false);
      }).catch(err => {
        console.warn("Failed to fetch upcoming:", err);
        setIsUpcomingLoading(false);
      });

      // Airing alerts schedules after seasonal data completes
      pSeasonal.then(() => {
        const { notificationsEnabled } = useAppStore.getState();
        if (notificationsEnabled) {
          const watchingAnime = watchlist.filter(item => item.status === 'watching');
          notificationService.checkAndScheduleAiringAlerts(watchingAnime, seasonalAnime);
        }
      });

      // Premium Curated Curation Engine based on genre taste
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

      matchedCategories = [...new Set(matchedCategories)];
      const shuffle = (array: any[]) => array.sort(() => 0.5 - Math.random());

      let finalCategories = [...baseCategories];
      if (matchedCategories.length > 0) {
        finalCategories.push(...shuffle(matchedCategories).slice(0, 2));
      } else {
        finalCategories.push('Must Watch Shonen', 'Psychological Peaks');
      }

      finalCategories = [...new Set(finalCategories)].slice(0, 4);

      // Load curated lists progressively in background
      finalCategories.forEach(category => {
        setCuratedLoading(prev => ({ ...prev, [category]: true }));
        animeApi.getCuratedList(category, (freshCurated) => {
          setCuratedAnime(prev => ({ ...prev, [category]: freshCurated }));
          setCuratedLoading(prev => ({ ...prev, [category]: false }));
        }).then(data => {
          if (data && data.length > 0) {
            setCuratedAnime(prev => ({ ...prev, [category]: data }));
          }
          setCuratedLoading(prev => ({ ...prev, [category]: false }));
        }).catch(err => {
          console.warn(`Failed to fetch curated list for ${category}:`, err);
          setCuratedLoading(prev => ({ ...prev, [category]: false }));
        });
      });

    } catch (error) {
      console.error('Error fetching home data:', error);
      setIsTrendingLoading(false);
      setIsTopLoading(false);
      setIsSeasonalLoading(false);
      setIsUpcomingLoading(false);
      setCuratedLoading({});
    }
  }, []);

  useEffect(() => {
    if (hasHydrated) {
      fetchHomeData();
    }
  }, [user?.id, hasHydrated]);

  // Background prefetch during idle times
  useEffect(() => {
    if (trendingAnime.length > 0 || seasonalAnime.length > 0) {
      const idsToPrefetch = [
        ...trendingAnime.slice(0, 3).map(a => String(a.id)),
        ...seasonalAnime.slice(0, 3).map(a => String(a.id)),
      ];
      // Deduplicate
      const uniqueIds = [...new Set(idsToPrefetch)];
      try {
        const { PrefetchManager } = require('../../src/services/api/PrefetchManager');
        PrefetchManager.prefetchMultiple(uniqueIds);
      } catch (err) {
        console.warn('[Home Prefetch] Failed to initialize PrefetchManager:', err);
      }
    }
  }, [trendingAnime, seasonalAnime]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHomeData();
    setRefreshing(false);
  }, []);

  const handleMediaPress = useCallback((id: string) => {
    router.push(`/details/${id}`);
  }, [router]);

  const isDesktop = width > 1024;

  if (!hasHydrated && !refreshing) {
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
        {isTopLoading ? (
          <View style={styles.heroWrapper}>
            <SkeletonLoader width="100%" height={420} style={{ borderRadius: borderRadius.lg }} />
          </View>
        ) : (
          <RotatingHeroBanner topRated={topRated} onPress={handleMediaPress} />
        )}

        <WatchNextSection />

        <HorizontalCarousel
          title="Trending Now"
          icon="zap"
          data={trendingAnime}
          isLoading={isTrendingLoading}
          onPress={handleMediaPress}
          onViewAll={() => router.push('/category/trending')}
        />

        <ForYouSection />

        <HorizontalCarousel
          title="Airing This Season"
          icon="activity"
          data={seasonalAnime}
          isLoading={isSeasonalLoading}
          onPress={handleMediaPress}
          onViewAll={() => router.push('/category/current-season')}
        />

        {Object.entries(curatedAnime).map(([category, data]) => (
          <HorizontalCarousel
            key={category}
            title={category}
            icon="award"
            data={data}
            isLoading={curatedLoading[category] ?? (data.length === 0)}
            onPress={handleMediaPress}
            onViewAll={() => router.push(`/category/${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)}
          />
        ))}

        <HorizontalCarousel
          title="Upcoming Hype"
          icon="calendar"
          data={upcomingAnime}
          isLoading={isUpcomingLoading}
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


