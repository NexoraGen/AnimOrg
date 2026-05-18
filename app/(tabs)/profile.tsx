import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  Animated,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, borderRadius, typography } from '../../src/theme';
import {
  GlassHeader,
  Button,
  HorizontalCarousel,
  SectionHeader,
  ProfileStatsStrip,
  AnimatedPressable,
} from '../../src/components/ui';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { useAppStore } from '../../src/store/useAppStore';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { firebaseAuthService } from '../../src/services/firebase/auth';
import { calculateUserLevel } from '../../src/utils/levelSystem';
import { CommunityPostCard } from '../../src/components/features/community/CommunityPostCard';
import { CommunityPost } from '../../src/types';
import { firestoreService } from '../../src/services/firebase/firestore';

const DEFAULT_BANNER = require('../../assets/profile-banner.png');
const GUEST_AVATAR = require('../../assets/guest-avatar.png');
const WATCHING_SILHOUETTE = require('../../assets/list-watching.png');
const COMPLETED_SILHOUETTE = require('../../assets/list-completed.png');
const PLANNED_SILHOUETTE = require('../../assets/list-planned.png');
const DROPPED_SILHOUETTE = require('../../assets/list-dropped.png');

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const { width } = useWindowDimensions();
  const {
    isLoadingAuth,
    hasHydrated,
    user,
    watchlist,
    userRatings,
    notificationsEnabled,
    setNotificationsEnabled,
    getFavoriteGenres,
    animeProgress,
    following,
    followers,
    activityFeed,
    isAuthenticated
  } = useAppStore();

  const [userPosts, setUserPosts] = React.useState<CommunityPost[]>([]);

  React.useEffect(() => {
    if (user) {
      loadUserPosts();
    }
  }, [user]);

  const loadUserPosts = async () => {
    try {
      const result = await firestoreService.getCommunityFeed({
        userId: user?.id,
        pageSize: 5
      });
      setUserPosts(result.posts);
    } catch (error) {
      console.error(error);
    }
  };

  const isGuest = !user || !user.email || !isAuthenticated;

  const userLevel = useMemo(() => calculateUserLevel(watchlist || [], userRatings || []), [watchlist, userRatings]);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const totalEpisodesWatched = Object.values(animeProgress || {}).reduce((acc, p) => acc + (p.lastWatchedEpisode || 0), 0);

    const totalMinutesWatched = Object.entries(animeProgress || {}).reduce((acc, [id, progress]) => {
      const item = (watchlist || []).find(w => w.mediaId === id);
      const mins = item?.durationMinutes || 24;
      return acc + ((progress.lastWatchedEpisode || 0) * mins);
    }, 0);

    const totalDays = (totalMinutesWatched / 1440).toFixed(1);

    return {
      episodes: totalEpisodesWatched,
      days: totalDays,
    };
  }, [watchlist, animeProgress]);

  // Fallback if data is missing, loading, or not hydrated yet to prevent React Web hydration mismatches
  if (isLoadingAuth || !hasHydrated || !watchlist || !animeProgress) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={themeColors.primary} size="large" />
        <Text style={{ color: themeColors.textDim, marginTop: spacing.md }}>Loading profile...</Text>
      </View>
    );
  }

  // --- DATA SECTIONS ---
  const favoriteAnime = useMemo(() => watchlist.filter(item => item.isFavorite).map(item => ({
    id: item.mediaId,
    title: item.title || 'Unknown',
    posterPath: item.posterPath || '',
    rating: item.rating,
    description: '',
    backdropPath: '',
    releaseYear: 0,
    genres: item.genres || [],
    type: 'anime' as const,
  })), [watchlist]);

  const ratedAnime = useMemo(() => (userRatings || []).map(r => ({
    id: r.animeId,
    title: r.title,
    posterPath: r.posterPath,
    rating: r.score,
    type: 'anime' as const,
    genres: [],
    description: '',
    backdropPath: '',
    releaseYear: 0
  })), [userRatings]);

  const currentlyWatching = useMemo(() => watchlist.filter(item => item.status === 'watching').map(item => ({
    id: item.mediaId,
    title: item.title,
    posterPath: item.posterPath,
    rating: item.rating,
    type: 'anime' as const,
    genres: item.genres,
    description: '',
    backdropPath: '',
    releaseYear: 0
  })), [watchlist]);

  const handleLogout = async () => {
    try {
      await firebaseAuthService.logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const scrollY = React.useRef(new Animated.Value(0)).current;

  const bannerScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.2, 1],
    extrapolate: 'clamp',
  });

  const bannerTranslateY = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 100],
    extrapolate: 'clamp',
  });

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle="light-content" />
      <GlassHeader
        title=""
        transparent
        rightComponent={
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setNotificationsEnabled(!notificationsEnabled)}>
              <Feather name={notificationsEnabled ? "bell" : "bell-off"} size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/app-settings')}>
              <Feather name="settings" size={20} color="white" />
            </TouchableOpacity>
          </View>
        }
      />

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerHero, { paddingTop: insets.top + spacing.sm }]}>
          <Animated.View
            style={[
              styles.bannerWrapper,
              {
                transform: [
                  { translateY: bannerTranslateY }
                ],
              }
            ]}
          >
            <Image
              source={DEFAULT_BANNER}
              style={styles.bannerImage}
              contentFit="cover"
              contentPosition="center"
              transition={1000}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.96)', themeColors.background]}
              locations={[0, 0.35, 0.7, 1]}
              style={styles.bannerOverlay}
            />
          </Animated.View>

          <View style={styles.headerContentWrapper}>
            <View style={[styles.userInfoRow, isGuest && { marginBottom: spacing.sm }]}>
              <TouchableOpacity
                onPress={() => router.push('/edit-profile')}
                activeOpacity={0.9}
                disabled={isGuest}
              >
                <View style={styles.avatarWrapper}>
                  <View style={[styles.avatarGlow, { backgroundColor: themeColors.primary }]} />
                  <Image
                    source={user?.avatarUrl?.trim() ? { uri: user.avatarUrl } : GUEST_AVATAR}
                    style={[styles.avatar, { borderColor: themeColors.primary }]}
                    contentFit="cover"
                    transition={300}
                  />

                </View>
              </TouchableOpacity>

              <View style={styles.headerTextContainer}>
                <Text style={[styles.username, { color: 'white' }]}>{user?.username ? user.username : 'Guest User'}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.levelBadge, { backgroundColor: '#E5091425', borderColor: '#E50914' }]}>
                    <Text style={[styles.levelText, { color: '#E50914' }]}>LVL {userLevel.level}</Text>
                  </View>
                  <Text style={[styles.levelTitle, { color: 'rgba(255,255,255,0.8)' }]}>{userLevel.title}</Text>
                </View>
              </View>
            </View>

            {!isGuest && (
              <TouchableOpacity
                style={styles.pillActionButton}
                onPress={() => router.push('/edit-profile')}
                activeOpacity={0.8}
              >
                <Feather name="edit-2" size={14} color="white" />
                <Text style={styles.pillActionButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            )}

            <View style={styles.bioContainer}>
              {user?.bio && (
                <Text style={[styles.bio, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={2}>
                  {user.bio}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* --- SOCIAL STATS STRIP --- */}
        <ProfileStatsStrip
          followingCount={following?.length || 0}
          followersCount={followers?.length || 0}
          reviewsCount={userRatings?.length || 0}
          onFollowingPress={() => { }}
          onFollowersPress={() => { }}
        />

        {/* --- PREMIUM COMPACT STATS --- */}
        <View style={styles.statsContainer}>
          <View style={[styles.focusedStatBox, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }]}>
            <View style={styles.statHeaderRow}>
              <View style={[styles.statIconCircle, { backgroundColor: '#E5091415' }]}>
                <Feather name="play" size={16} color={themeColors.primary} />
              </View>
              <Text style={[styles.statValue, { color: 'white' }]}>{stats.episodes.toLocaleString()}</Text>
            </View>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.8)' }]} numberOfLines={1}>Episodes</Text>
          </View>

          <View style={[styles.focusedStatBox, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }]}>
            <View style={styles.statHeaderRow}>
              <View style={[styles.statIconCircle, { backgroundColor: '#E5091415' }]}>
                <Feather name="clock" size={16} color={themeColors.primary} />
              </View>
              <Text style={[styles.statValue, { color: 'white' }]}>{stats.days}</Text>
            </View>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.8)' }]} numberOfLines={1}>Days Watched</Text>
          </View>
        </View>

        {/* --- MY LISTS --- */}
        <View style={styles.section}>
          <SectionHeader title="My Lists" onViewAll={() => router.push('/watchlist')} />
          <View style={styles.listsGrid}>
            {[
              { title: 'Watching', count: currentlyWatching.length, icon: 'play', image: WATCHING_SILHOUETTE },
              { title: 'Completed', count: (watchlist || []).filter(i => i.status === 'completed').length, icon: 'check', image: COMPLETED_SILHOUETTE },
              { title: 'Planned', count: (watchlist || []).filter(i => i.status === 'plan-to-watch').length, icon: 'clock', image: PLANNED_SILHOUETTE },
              { title: 'Dropped', count: (watchlist || []).filter(i => i.status === 'dropped').length, icon: 'x', image: DROPPED_SILHOUETTE },
            ].map((list, i) => (
              <AnimatedPressable
                key={i}
                style={[
                  styles.listCard,
                  { width: (width - (spacing.xl * 2) - 16) / 2 }
                ]}
                onPress={() => router.push('/watchlist')}
              >
                <Image source={list.image} style={styles.listCardBg} contentFit="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.7)']}
                  style={styles.listCardOverlay}
                />

                <View style={styles.listCardIconWrapper}>
                  <Feather name={list.icon as any} size={24} color="white" />
                </View>

                <View style={styles.listCardInfo}>
                  <Text style={styles.listCardTitle} numberOfLines={1}>{list.title}</Text>
                  <Text style={styles.listCardCount}>{list.count} items</Text>
                </View>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* --- SHOWS (Currently Watching) --- */}
        {currentlyWatching.length > 0 && (
          <View style={styles.carouselSection}>
            <HorizontalCarousel
              title="Currently Watching"
              data={currentlyWatching}
              onPress={(id) => router.push(`/details/${id}`)}
            />
          </View>
        )}

        {/* --- MY RATINGS --- */}
        {ratedAnime.length > 0 && (
          <View style={styles.carouselSection}>
            <HorizontalCarousel
              title="My Ratings"
              subtitle="Your personal scores"
              data={ratedAnime}
              onPress={(id) => router.push(`/details/${id}`)}
            />
          </View>
        )}


        {/* --- SOCIAL ACTIVITY --- */}
        <View style={styles.section}>
          <SectionHeader title="Recent Posts" />
          {userPosts.length > 0 ? (
            userPosts.map(post => (
              <CommunityPostCard key={post.id} post={post} />
            ))
          ) : (
            <View style={styles.emptySocial}>
              <Feather name="message-square" size={32} color={themeColors.textDim} />
              {isGuest ? (
                <>
                  <Text style={[styles.emptySocialText, { color: themeColors.textDim, marginBottom: spacing.sm, textAlign: 'center', paddingHorizontal: spacing.xl }]}>
                    Sign in to join communities, post reviews, and connect!
                  </Text>
                  <Button
                    title="Sign In"
                    onPress={() => router.push('/(auth)/login')}
                    style={{ paddingHorizontal: spacing.lg, height: 38 }}
                  />
                </>
              ) : (
                <Text style={[styles.emptySocialText, { color: themeColors.textDim }]}>
                  You haven't posted anything yet.
                </Text>
              )}
            </View>
          )}
        </View>

        {/* --- FAVORITES --- */}
        {favoriteAnime.length > 0 && (
          <View style={styles.carouselSection}>
            <HorizontalCarousel
              title="Favorite Anime"
              data={favoriteAnime}
              onPress={(id) => router.push(`/details/${id}`)}
            />
          </View>
        )}

        {/* --- GENRE AFFINITY --- */}
        <View style={styles.section}>
          <SectionHeader title="Genre Affinity" />
          <View style={styles.genreList}>
            {(getFavoriteGenres() || []).slice(0, 6).map((genre) => (
              <View key={genre} style={[styles.genreAffinityItem, { backgroundColor: `${themeColors.primary}15`, borderColor: `${themeColors.primary}30` }]}>
                <Text style={[styles.genreAffinityText, { color: 'white' }]}>{genre}</Text>
              </View>
            ))}
          </View>
        </View>


        <View style={styles.footerActions}>
          <Button
            title="Log Out"
            onPress={handleLogout}
            variant="ghost"
            textStyle={{ color: themeColors.error }}
            icon={<Feather name="log-out" color={themeColors.error} size={20} />}
          />
          <Text style={[styles.versionText, { color: themeColors.textDim }]}>AnimOrg v2.5.0 • Cinematic Edition</Text>
        </View>
      </Animated.ScrollView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerHero: {
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bannerWrapper: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContentWrapper: {
    paddingHorizontal: spacing.xl,
    zIndex: 10,
    width: '100%',
    marginTop: 20,
    paddingBottom: 0,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    width: '100%',
    paddingLeft: spacing.xs,
  },
  avatarWrapper: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 45,
    opacity: 0.25,
    transform: [{ scale: 1.15 }],
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1.5,
  },

  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    fontSize: 28,
    fontWeight: '900' as any,
    letterSpacing: -0.8,
    color: 'white',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: spacing.sm,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  levelTitle: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  bioContainer: {
    marginTop: spacing.xs,
    width: '100%',
    paddingHorizontal: 4,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    color: 'white',
    opacity: 0.7,
  },
  pillActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    height: 38,
    paddingHorizontal: 16,
    marginTop: spacing.md,
    marginBottom: 2,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pillActionButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
  },
  headerActionsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    paddingHorizontal: spacing.xl,
    height: 36,
    borderRadius: 18,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    zIndex: 20,
  },
  focusedStatBox: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 100,
  },
  statHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 6,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  carouselSection: {
    marginBottom: spacing.xs,
  },
  listsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 0,
  },
  listCard: {
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  listCardBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  listCardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  listCardIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(229, 9, 20, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(229, 9, 20, 0.6)',
  },
  listCardInfo: {
    alignItems: 'center',
    zIndex: 10,
    marginBottom: spacing.md,
  },
  listCardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  listCardCount: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  genreList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: spacing.md,
  },
  genreAffinityItem: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
  },
  genreAffinityText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  footerActions: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  versionText: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '700',
    opacity: 0.4,
    textTransform: 'uppercase',
  },
  emptySocial: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
  },
  emptySocialText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.5,
  }
});
