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

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const { width } = useWindowDimensions();
  const { user, watchlist, continueWatching, userRatings, hasHydrated } = useAppStore();

  const [trendingAnime, setTrendingAnime] = useState<Media[]>([]);
  const [topRated, setTopRated] = useState<Media[]>([]);
  const [seasonalAnime, setSeasonalAnime] = useState<Media[]>([]);
  const [upcomingAnime, setUpcomingAnime] = useState<Media[]>([]);
  const [curatedAnime, setCuratedAnime] = useState<Record<string, Media[]>>({});

  const [heroAnime, setHeroAnime] = useState<Media | null>(null);
  const [recommendations, setRecommendations] = useState<Media[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const heroInterval = useRef<any>(null);

  const fetchHomeData = async () => {
    setIsLoading(true);
    try {
      const { user, watchlist, getFavoriteGenres } = useAppStore.getState();

      const [trending, top, seasonal, upcoming] = await Promise.all([
        animeApi.getTrendingAnime(1, setTrendingAnime),
        animeApi.getTopAnime(1, setTopRated),
        animeApi.getSeasonalAnime(1, setSeasonalAnime),
        animeApi.getUpcomingAnime(1, setUpcomingAnime),
      ]);

      setTrendingAnime(trending);
      setTopRated(top);
      setSeasonalAnime(seasonal);
      setUpcomingAnime(upcoming);

      // Phase 3: Check for airing alerts for "Watching" anime
      const { notificationsEnabled } = useAppStore.getState();
      if (notificationsEnabled) {
        const watchingAnime = watchlist.filter(item => item.status === 'watching');
        notificationService.checkAndScheduleAiringAlerts(watchingAnime, seasonal);
      }

      // Hero rotation setup
      if (top.length > 0) {
        setHeroAnime(top[0]);
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

      const premiumData: Record<string, Media[]> = {};

      await Promise.all(finalCategories.map(async (category) => {
        const data = await animeApi.getCuratedList(category, (freshCurated) => {
          setCuratedAnime(prev => ({ ...prev, [category]: freshCurated }));
        });
        if (data && data.length > 0) {
          premiumData[category] = data;
        }
      }));

      setCuratedAnime(premiumData);

      // Advanced recommendation logic
      let combinedRecs: Media[] = [];
      const hasActivity = watchlist.length > 0 || (continueWatching?.length || 0) > 0 || (userRatings?.length || 0) > 0;

      if (hasActivity && watchlist.length > 0) {
        // Get recs from last 3 watchlist items
        const itemsToUse = watchlist.slice(-3);
        const recsPromises = itemsToUse.map(item => animeApi.getAnimeRecommendations(item.mediaId));
        const results = await Promise.all(recsPromises);

        // Flatten and deduplicate
        const seenIds = new Set(watchlist.map(i => i.mediaId));
        results.forEach(list => {
          list.forEach(m => {
            if (!seenIds.has(m.id)) {
              combinedRecs.push(m);
              seenIds.add(m.id);
            }
          });
        });
      }

      // No fallback to trending for recommendations anymore
      setRecommendations(combinedRecs.slice(0, 15));

    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasHydrated) {
      fetchHomeData();
    }
    return () => {
      if (heroInterval.current) clearInterval(heroInterval.current);
    };
  }, [user?.id, hasHydrated]);

  // Rotate hero banner
  useEffect(() => {
    if (topRated.length > 0) {
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
  }, [topRated]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHomeData();
    setRefreshing(false);
  }, []);

  const handleMediaPress = (id: string) => {
    router.push(`/details/${id}`);
  };

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
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 65 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
          />
        }
      >
        {heroAnime && (
          <View style={styles.heroWrapper}>
            <HeroBanner
              media={heroAnime}
              onPress={handleMediaPress}
            />
          </View>
        )}

        <WatchNextSection />

        <HorizontalCarousel
          title="Trending Now"
          icon="zap"
          data={trendingAnime}
          onPress={handleMediaPress}
        />

        {recommendations.length > 0 ? (
          <HorizontalCarousel
            title="Based on your liking"
            icon="heart"
            data={recommendations}
            onPress={handleMediaPress}
          />
        ) : (
          (watchlist.length === 0 && (continueWatching?.length || 0) === 0 && (userRatings?.length || 0) === 0) && (
            <EmptyRecommendations onPress={() => router.push('/search')} />
          )
        )}

        <HorizontalCarousel
          title="Airing This Season"
          icon="activity"
          data={seasonalAnime}
          onPress={handleMediaPress}
        />

        {Object.entries(curatedAnime).map(([category, data]) => (
          <HorizontalCarousel
            key={category}
            title={category}
            icon="award"
            data={data}
            onPress={handleMediaPress}
          />
        ))}

        <HorizontalCarousel
          title="Upcoming Hype"
          icon="calendar"
          data={upcomingAnime}
          onPress={handleMediaPress}
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
    marginHorizontal: spacing.md,
    marginBottom: 0,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  horizontalScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
});


