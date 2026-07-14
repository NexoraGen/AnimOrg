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
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  RefreshControl
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
import { getAvatarSource } from '../../src/constants/avatars';
import { LevelService } from '../../src/services/LevelService';
import { ACHIEVEMENTS } from '../../src/config/achievements';
import { LevelUpModal } from '../../src/components/ui/LevelUpModal';
import { RankDetailsModal } from '../../src/components/ui/RankDetailsModal';

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
  const isLoadingAuth = useAppStore(state => state.isLoadingAuth);
  const hasHydrated = useAppStore(state => state.hasHydrated);
  const user = useAppStore(state => state.user);
  const updateProfile = useAppStore(state => state.updateProfile);
  const watchlist = useAppStore(state => state.watchlist);
  const userRatings = useAppStore(state => state.userRatings);
  const notificationsEnabled = useAppStore(state => state.notificationsEnabled);
  const setNotificationsEnabled = useAppStore(state => state.setNotificationsEnabled);
  const getFavoriteGenres = useAppStore(state => state.getFavoriteGenres);
  const animeProgress = useAppStore(state => state.animeProgress);
  const following = useAppStore(state => state.following);
  const followers = useAppStore(state => state.followers);
  const activityFeed = useAppStore(state => state.activityFeed);
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const clearSession = useAppStore(state => state.clearSession);
  const refreshUserData = useAppStore(state => state.refreshUserData);
  const isAppInitializing = useAppStore(state => state.isAppInitializing);

  const levelUpModalVisible = useAppStore(state => state.levelUpModalVisible);
  const setLevelUpModalVisible = useAppStore(state => state.setLevelUpModalVisible);
  const levelUpModalData = useAppStore(state => state.levelUpModalData);

  const [rankModalVisible, setRankModalVisible] = React.useState(false);

  const [userPosts, setUserPosts] = React.useState<CommunityPost[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);

  // Stable ref for scroll animations — must be above early-returns (Rules of Hooks)
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const bannerTranslateY = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 100],
    extrapolate: 'clamp',
  });

  const isGuest = !user || !user.email || !isAuthenticated;

  // --- All useMemo calls placed here, above any conditional return (Rules of Hooks) ---
  const levelInfo = useMemo(() => {
    return LevelService.getLevelInfo(user?.xp || 0);
  }, [user?.xp]);

  const stats = useMemo(() => {
    const totalEpisodesWatched = Object.values(animeProgress || {}).reduce((acc, p) => acc + (p.lastWatchedEpisode || 0), 0);
    const totalMinutesWatched = Object.entries(animeProgress || {}).reduce((acc, [id, progress]) => {
      const item = (watchlist || []).find(w => w.mediaId === id);
      const mins = item?.durationMinutes || 24;
      return acc + ((progress.lastWatchedEpisode || 0) * mins);
    }, 0);
    return {
      episodes: totalEpisodesWatched,
      days: (totalMinutesWatched / 1440).toFixed(1),
    };
  }, [watchlist, animeProgress]);

  const favoriteAnime = useMemo(() => (watchlist || []).filter(item => item.isFavorite).map(item => ({
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

  const topGenre = useMemo(() => {
    const genreCounts: Record<string, number> = {};
    (watchlist || []).forEach(item => {
      item.genres?.forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });
    const sorted = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'None';
  }, [watchlist]);

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

  const currentlyWatching = useMemo(() => (watchlist || []).filter(item => item.status === 'watching').map(item => ({
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

  // Memoize avatar source to prevent image refetch on every render
  const avatarSource = useMemo(
    () => getAvatarSource(user?.avatarUrl),
    [user?.avatarUrl]
  );

  const loadUserPosts = React.useCallback(async () => {
    if (!user?.id || !isAuthenticated) return;
    try {
      const result = await firestoreService.getCommunityFeed({
        userId: user.id,
        pageSize: 5
      });
      setUserPosts(result.posts);
    } catch (error) {
      console.error('[Profile] Failed to load user posts:', error);
    }
  }, [user?.id, isAuthenticated]);

  // Only load posts once auth is fully settled — no Firestore calls during hydration
  React.useEffect(() => {
    if (user?.id && isAuthenticated && !isAppInitializing) {
      loadUserPosts();
    }
  }, [user?.id, isAuthenticated, isAppInitializing, loadUserPosts]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      if (user) {
        await Promise.all([
          refreshUserData(),
          loadUserPosts()
        ]);
      }
    } catch (error) {
      console.error('Failed to reload profile:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user, refreshUserData, loadUserPosts]);

  const handleLogout = async () => {
    try {
      await firebaseAuthService.logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  // --- LOADING GUARD: all hooks above; conditional render safely below ---
  // Guard includes isAppInitializing so we never render the profile during Firestore hydration
  if (isLoadingAuth || !hasHydrated || isAppInitializing) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={themeColors.primary} size="large" />
        <Text style={{ color: themeColors.textDim, marginTop: spacing.md }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle="light-content" />

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
          />
        }
      >
        <View style={[styles.headerHero, { paddingTop: insets.top + spacing.sm }]}>
          <View style={{ position: 'absolute', top: insets.top + spacing.sm, right: spacing.md, zIndex: 100 }}>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconButton} onPress={() => setNotificationsEnabled(!notificationsEnabled)}>
                <Feather name={notificationsEnabled ? "bell" : "bell-off"} size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/app-settings')}>
                <Feather name="settings" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
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
                    source={avatarSource}
                    style={[styles.avatar, { borderColor: themeColors.primary }]}
                    contentFit="cover"
                    transition={300}
                    cachePolicy="memory-disk"
                  />

                </View>
              </TouchableOpacity>

              <View style={styles.headerTextContainer}>
                <Text style={[styles.username, { color: 'white' }]}>{user?.username ? user.username : 'Guest User'}</Text>
                {!isGuest && (
                  <TouchableOpacity
                    onPress={() => setRankModalVisible(true)}
                    activeOpacity={0.7}
                    style={styles.rankRowTouch}
                  >
                    <Text style={styles.rankPrefixIcon}>{levelInfo.rankIcon}</Text>
                    <Text style={[styles.rankTextTitle, { color: themeColors.primary }]}>
                      {levelInfo.rankTitle}
                    </Text>
                  </TouchableOpacity>
                )}
                <View style={styles.badgeRow}>
                  <View style={[styles.levelBadge, { backgroundColor: `${themeColors.primary}20`, borderColor: themeColors.primary }]}>
                    <Text style={[styles.levelText, { color: themeColors.primary }]}>LVL {levelInfo.level}</Text>
                  </View>
                  <Text style={[styles.levelTitle, { color: 'rgba(255,255,255,0.8)' }]}>{levelInfo.title}</Text>
                </View>
              </View>
            </View>

            {/* XP PROGRESS BAR */}
            {!isGuest && (
              <View style={styles.xpProgressContainer}>
                <View style={styles.xpTextRow}>
                  <Text style={[styles.xpText, { color: 'rgba(255,255,255,0.7)' }]}>
                    {levelInfo.currentXp - levelInfo.xpForCurrentLevel} / {levelInfo.xpForNextLevel - levelInfo.xpForCurrentLevel} XP ({Math.round(levelInfo.progressPercentage)}%)
                  </Text>
                  <Text style={[styles.xpUntilText, { color: themeColors.primary }]}>
                    {levelInfo.xpForNextLevel - levelInfo.currentXp} XP until Level {levelInfo.level + 1}
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        backgroundColor: themeColors.primary,
                        width: `${levelInfo.progressPercentage}%`
                      }
                    ]}
                  />
                </View>
              </View>
            )}

            {isGuest ? (
              <TouchableOpacity
                style={[styles.pillActionButton, { backgroundColor: themeColors.primary }]}
                onPress={() => {
                  clearSession();
                  setTimeout(() => {
                    router.replace('/(auth)/login');
                  }, 100);
                }}
                activeOpacity={0.8}
              >
                <Feather name="log-in" size={14} color="white" />
                <Text style={styles.pillActionButtonText}>Sign In / Register</Text>
              </TouchableOpacity>
            ) : (
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
          postsCount={userPosts?.length || 0}
          onFollowingPress={() => { }}
          onFollowersPress={() => { }}
          onPostsPress={() => { }}
        />

        {/* --- PREMIUM COMPACT STATS GRID --- */}
        <View style={styles.statsContainer}>
          <View style={[styles.focusedStatBox, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }]}>
            <View style={styles.statHeaderRow}>
              <View style={[styles.statIconCircle, { backgroundColor: `${themeColors.primary}12` }]}>
                <Feather name="play" size={16} color={themeColors.primary} />
              </View>
              <Text style={[styles.statValue, { color: 'white' }]}>{stats.episodes.toLocaleString()}</Text>
            </View>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>Episodes Watched</Text>
          </View>

          <View style={[styles.focusedStatBox, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }]}>
            <View style={styles.statHeaderRow}>
              <View style={[styles.statIconCircle, { backgroundColor: `${themeColors.primary}12` }]}>
                <Feather name="clock" size={16} color={themeColors.primary} />
              </View>
              <Text style={[styles.statValue, { color: 'white' }]}>{Math.round(parseFloat(stats.days) * 24).toLocaleString()}h</Text>
            </View>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>Hours Watched</Text>
          </View>

          <View style={[styles.focusedStatBox, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }]}>
            <View style={styles.statHeaderRow}>
              <View style={[styles.statIconCircle, { backgroundColor: `${themeColors.primary}12` }]}>
                <Feather name="zap" size={16} color={themeColors.primary} />
              </View>
              <Text style={[styles.statValue, { color: 'white' }]}>{user?.currentStreak || 0}d</Text>
            </View>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>Current Streak</Text>
          </View>

          <View style={[styles.focusedStatBox, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }]}>
            <View style={styles.statHeaderRow}>
              <View style={[styles.statIconCircle, { backgroundColor: `${themeColors.primary}12` }]}>
                <Feather name="award" size={16} color={themeColors.primary} />
              </View>
              <Text style={[styles.statValue, { color: 'white' }]}>{user?.longestStreak || 0}d</Text>
            </View>
            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>Longest Streak</Text>
          </View>
        </View>

        {/* --- MY LISTS --- */}
        <View style={styles.section}>
          <SectionHeader title="My Lists" onViewAll={() => router.push('/watchlist')} />
          <View style={styles.listsGrid}>
            {[
              { title: 'Watching', count: currentlyWatching.length, icon: 'play', image: WATCHING_SILHOUETTE },
              {
                title: 'Completed',
                count: (watchlist || []).filter(i => i.status === 'completed').length,
                icon: 'check',
                image: COMPLETED_SILHOUETTE
              },
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

        {/* --- TASTE INSIGHT --- */}
        {!isGuest && (
          <View style={[styles.tasteInsightCard, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Feather name="heart" size={18} color={themeColors.primary} />
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Otaku Taste Insights</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>TOP GENRE</Text>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14, marginTop: 2 }}>{topGenre}</Text>
              </View>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>COMPLETED</Text>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14, marginTop: 2 }}>
                  {(watchlist || []).filter(item => item.status === 'completed').length} Shows
                </Text>
              </View>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>NEXT LEVEL</Text>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14, marginTop: 2 }}>
                  {levelInfo.xpForNextLevel - levelInfo.currentXp} XP to go
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* --- ACHIEVEMENTS / BADGES GRID --- */}
        {!isGuest && (
          <View style={styles.section}>
            <SectionHeader
              title={`Unlocked Achievements (${(user?.badges || []).length}/${ACHIEVEMENTS.length})`}
              onViewAll={undefined}
            />
            {user?.badges && user.badges.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.badgesScroll}
              >
                {ACHIEVEMENTS.map(badge => {
                  const isUnlocked = user.badges?.includes(badge.id);
                  return (
                    <View
                      key={badge.id}
                      style={[
                        styles.badgeCard,
                        {
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          borderColor: isUnlocked ? `${themeColors.primary}30` : 'rgba(255, 255, 255, 0.05)',
                          opacity: isUnlocked ? 1 : 0.35
                        }
                      ]}
                    >
                      <View style={[
                        styles.badgeIconCircle,
                        {
                          backgroundColor: isUnlocked ? `${themeColors.primary}15` : 'rgba(255, 255, 255, 0.03)'
                        }
                      ]}>
                        <Feather
                          name={badge.icon as any}
                          size={18}
                          color={isUnlocked ? themeColors.primary : 'rgba(255, 255, 255, 0.3)'}
                        />
                      </View>
                      <Text style={[styles.badgeTitleText, { color: isUnlocked ? 'white' : 'rgba(255,255,255,0.4)', fontWeight: 'bold' }]} numberOfLines={1}>
                        {badge.title}
                      </Text>
                      <Text style={[styles.badgeDescText, { color: 'rgba(255,255,255,0.5)' }]} numberOfLines={2}>
                        {badge.description}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={[styles.emptyBadgesCard, { borderColor: 'rgba(255,255,255,0.05)' }]}>
                <Feather name="award" size={24} color="rgba(255,255,255,0.2)" />
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                  No achievements unlocked yet. Track anime to earn badges!
                </Text>
              </View>
            )}
          </View>
        )}

        <LevelUpModal
          visible={levelUpModalVisible}
          onClose={() => setLevelUpModalVisible(false)}
          oldLevel={levelUpModalData?.oldLevel || 1}
          newLevel={levelUpModalData?.newLevel || 1}
          isRankUp={levelUpModalData?.isRankUp || false}
        />

        <RankDetailsModal
          visible={rankModalVisible}
          onClose={() => setRankModalVisible(false)}
          levelInfo={levelInfo}
        />



        <View style={styles.footerActions}>
          {!isGuest && (
            <Button
              title="Log Out"
              onPress={handleLogout}
              variant="ghost"
              textStyle={{ color: themeColors.error }}
              icon={<Feather name="log-out" color={themeColors.error} size={20} />}
            />
          )}
          <Text style={[styles.versionText, { color: themeColors.textDim }]}>AnimOrg v1.0.6</Text>
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
  settingsCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  settingsTextCol: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  settingsSub: {
    fontSize: 12,
  },
  settingsInputWrapper: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    height: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  settingsInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
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
  },

  // upgraded settings layout
  settingsRowClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 0,
  },
  settingsSeparator: {
    height: 1,
    width: '100%',
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  guestBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },

  // Premium modal sheet styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalDismissOverlay: {
    flex: 1,
  },
  modalContent: {
    width: '100%',
    maxHeight: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 28,
    paddingHorizontal: spacing.md,
  },
  modalDragHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginVertical: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // Live preview card styles
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 8,
  },
  previewCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewAnimeName: {
    fontSize: 14,
    fontWeight: 'normal',
    marginBottom: 4,
  },
  previewTimeText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  previewZoneInfo: {
    fontSize: 11,
  },

  // timezone search interface
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    height: 48,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: spacing.sm,
    height: '100%',
  },

  // timezone list scroll style
  listScrollContainer: {
    paddingBottom: 30,
  },
  emptySearchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: spacing.xs,
  },
  emptySearchText: {
    fontSize: 14,
  },
  tzItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 6,
    height: 52,
  },
  tzFlagCol: {
    marginRight: spacing.sm,
  },
  flagBadge: {
    width: 32,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    opacity: 0.95,
  },
  tzMetaCol: {
    flex: 1,
  },
  tzCountryCityText: {
    fontSize: 14,
    marginBottom: 2,
  },
  tzLabelText: {
    fontSize: 11,
  },

  // Progression styles
  xpProgressContainer: {
    marginVertical: spacing.sm,
    width: '100%',
    paddingHorizontal: 4,
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '600',
  },
  xpUntilText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  tasteInsightCard: {
    marginHorizontal: spacing.xl,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  badgesScroll: {
    paddingLeft: spacing.xl,
    paddingRight: spacing.xl,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  badgeCard: {
    width: 140,
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  badgeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  badgeTitleText: {
    fontSize: 12,
    textAlign: 'center',
  },
  badgeDescText: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
  },
  emptyBadgesCard: {
    marginHorizontal: spacing.xl,
    padding: spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankRowTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginBottom: 4,
  },
  rankPrefixIcon: {
    fontSize: 14,
  },
  rankTextTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
