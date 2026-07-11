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
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHomeData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { user, watchlist, getFavoriteGenres } = useAppStore.getState();

      const [trending, top, seasonal, upcoming] = await Promise.all([
        animeApi.getTrendingAnime(1, setTrendingAnime).catch(err => {
          console.warn("Failed to fetch trending:", err);
          return [] as Media[];
        }),
        animeApi.getTopAnime(1, setTopRated).catch(err => {
          console.warn("Failed to fetch top rated:", err);
          return [] as Media[];
        }),
        animeApi.getSeasonalAnime(1, setSeasonalAnime).catch(err => {
          console.warn("Failed to fetch seasonal:", err);
          return [] as Media[];
        }),
        animeApi.getUpcomingAnime(1, setUpcomingAnime).catch(err => {
          console.warn("Failed to fetch upcoming:", err);
          return [] as Media[];
        }),
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
        try {
          const data = await animeApi.getCuratedList(category, (freshCurated) => {
            setCuratedAnime(prev => ({ ...prev, [category]: freshCurated }));
          });
          if (data && data.length > 0) {
            premiumData[category] = data;
          }
        } catch (err) {
          console.warn(`Failed to fetch curated list for ${category}:`, err);
        }
      }));

      setCuratedAnime(premiumData);

      // Advanced recommendation logic using the new Personalized Taste DNA Engine
      const recs = await RecommendationService.getPersonalizedRecommendations(
        watchlist,
        userRatings,
        getFavoriteGenres(),
        15
      );
      setRecommendations(recs);

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
        />

        {recommendations.length > 0 ? (
          <HorizontalCarousel
            title="Made For Your Taste"
            icon="heart"
            data={recommendations as any[]}
            onPress={handleMediaPress}
            renderItem={({ item }) => (
              <View style={{ width: 170, paddingBottom: 4 }}>
                <PosterCard
                  media={item.anime}
                  onPress={handleMediaPress}
                  width={154}
                  height={224}
                />
                <View style={{
                  marginTop: 6,
                  marginHorizontal: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  backgroundColor: 'rgba(255, 59, 48, 0.06)',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 59, 48, 0.12)',
                  alignItems: 'center'
                }}>
                  <Text style={{
                    color: themeColors.primary,
                    fontSize: 10,
                    fontWeight: '900',
                    textAlign: 'center'
                  }} numberOfLines={1}>
                    🔥 {item.score}% Match
                  </Text>
                  <Text style={{
                    color: themeColors.textDim,
                    fontSize: 8.5,
                    marginTop: 2,
                    textAlign: 'center',
                    fontWeight: '500' as any
                  }} numberOfLines={1}>
                    {item.reason}
                  </Text>
                </View>
              </View>
            )}
            itemWidth={170}
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


