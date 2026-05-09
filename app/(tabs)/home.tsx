import React, { useEffect, useState } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  View, 
  Text, 
  RefreshControl,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../../src/theme';
import { HorizontalCarousel, GlassHeader } from '../../src/components/ui';
import { animeApi } from '../../src/services/animeApi';
import { Media } from '../../src/types';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  
  const [trendingAnime, setTrendingAnime] = useState<Media[]>([]);
  const [topRated, setTopRated] = useState<Media[]>([]);
  const [seasonalAnime, setSeasonalAnime] = useState<Media[]>([]);
  const [upcomingAnime, setUpcomingAnime] = useState<Media[]>([]);
  const [actionAnime, setActionAnime] = useState<Media[]>([]);
  const [romanceAnime, setRomanceAnime] = useState<Media[]>([]);
  const [fantasyAnime, setFantasyAnime] = useState<Media[]>([]);
  const [comedyAnime, setComedyAnime] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [
        anime, 
        top, 
        seasonal, 
        upcoming, 
        action, 
        romance, 
        fantasy, 
        comedy
      ] = await Promise.all([
        animeApi.getTrendingAnime(),
        animeApi.getTopAnime(),
        animeApi.getSeasonalAnime(),
        animeApi.getUpcomingAnime(),
        animeApi.getAnimeByGenre(1), // Action
        animeApi.getAnimeByGenre(22), // Romance
        animeApi.getAnimeByGenre(10), // Fantasy
        animeApi.getAnimeByGenre(4), // Comedy
      ]);
      setTrendingAnime(anime);
      setTopRated(top);
      setSeasonalAnime(seasonal);
      setUpcomingAnime(upcoming);
      setActionAnime(action);
      setRomanceAnime(romance);
      setFantasyAnime(fantasy);
      setComedyAnime(comedy);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleMediaPress = (id: string) => {
    router.push(`/details/${id}`);
  };

  return (
    <View style={styles.container}>
      <GlassHeader 
        title="AniVerse" 
        rightComponent={
          <View style={styles.avatarPlaceholder} />
        }
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['transparent', colors.background]}
            style={styles.heroGradient}
          />
          <Text style={styles.heroTitle}>Top Pick This Week</Text>
          <Text style={styles.heroSubtitle}>Solo Leveling - Episode 12 Out Now</Text>
        </View>

        <HorizontalCarousel 
          title="Trending Anime" 
          data={trendingAnime} 
          isLoading={isLoading}
          onPress={handleMediaPress}
        />

        <HorizontalCarousel 
          title="Airing This Season" 
          data={seasonalAnime} 
          isLoading={isLoading}
          onPress={handleMediaPress}
        />

        <HorizontalCarousel 
          title="Upcoming Anime" 
          data={upcomingAnime} 
          isLoading={isLoading}
          onPress={handleMediaPress}
        />

        <HorizontalCarousel 
          title="Top Rated" 
          data={topRated} 
          isLoading={isLoading}
          onPress={handleMediaPress}
        />

        <HorizontalCarousel 
          title="Action Anime" 
          data={actionAnime} 
          isLoading={isLoading}
          onPress={handleMediaPress}
        />

        <HorizontalCarousel 
          title="Romance Anime" 
          data={romanceAnime} 
          isLoading={isLoading}
          onPress={handleMediaPress}
        />

        <HorizontalCarousel 
          title="Fantasy Anime" 
          data={fantasyAnime} 
          isLoading={isLoading}
          onPress={handleMediaPress}
        />

        <HorizontalCarousel 
          title="Comedy Anime" 
          data={comedyAnime} 
          isLoading={isLoading}
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
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 80,
  },
  heroSection: {
    height: 200,
    justifyContent: 'flex-end',
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  heroTitle: {
    color: colors.text,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
  },
  heroSubtitle: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    marginTop: 4,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
  }
});
