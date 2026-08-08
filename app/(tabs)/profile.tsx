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
  ProfileStatsGrid,
} from '../../src/components/ui';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { useAppStore } from '../../src/store/useAppStore';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { firebaseAuthService } from '../../src/services/firebase/auth';
import { calculateUserLevel } from '../../src/utils/levelSystem';
import { CommunityPostCard } from '../../src/components/features/community/CommunityPostCard';
import { CommunityPost } from '../../src/types';
import { APP_VERSION_DISPLAY } from '../../src/constants/version';
import { firestoreService } from '../../src/services/firebase/firestore';
import { getAvatarSource } from '../../src/constants/avatars';
import { getSafeTopInset } from '../../src/utils/layout';
import { LevelService } from '../../src/services/LevelService';
import { ACHIEVEMENTS } from '../../src/config/achievements';
import { LevelUpModal } from '../../src/components/ui/LevelUpModal';
import { RankDetailsModal } from '../../src/components/ui/RankDetailsModal';
import { UserCollection } from '../../src/types';

const DEFAULT_BANNER = require('../../assets/profile-banner.png');
const GUEST_AVATAR = require('../../assets/guest-avatar.png');
const WATCHING_SILHOUETTE = require('../../assets/list-watching.png');
const COMPLETED_SILHOUETTE = require('../../assets/list-completed.png');
const PLANNED_SILHOUETTE = require('../../assets/list-planned.png');
const DROPPED_SILHOUETTE = require('../../assets/list-dropped.png');

function LoadingGuardWithTimeout({ onTimeout, showHint, themeColors }: {
  onTimeout: () => void;
  showHint: boolean;
  themeColors: any;
}) {
  React.useEffect(() => {
    const timer = setTimeout(onTimeout, 1000);
    return () => clearTimeout(timer);
  }, [onTimeout]);

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <ActivityIndicator color={themeColors.primary} size="large" />
      <Text style={{ color: themeColors.textDim, marginTop: 16, fontSize: 15 }}>Loading profile...</Text>
      {showHint && (
        <View style={{ marginTop: 24, alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
          <Text style={{ color: themeColors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 }}>This is taking longer than expected</Text>
          <Text style={{ color: themeColors.textDim, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
            Try closing and restarting the app.{'\n'}If the issue persists, check your internet connection.
          </Text>
        </View>
      )}
    </View>
  );
}

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
  const collections = useAppStore(state => state.collections);
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
  const profileError = useAppStore(state => state.profileError);

  const levelUpModalVisible = useAppStore(state => state.levelUpModalVisible);
  const setLevelUpModalVisible = useAppStore(state => state.setLevelUpModalVisible);
  const levelUpModalData = useAppStore(state => state.levelUpModalData);

  const [rankModalVisible, setRankModalVisible] = React.useState(false);

  const [userPosts, setUserPosts] = React.useState<CommunityPost[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);
  const [loadingTooLong, setLoadingTooLong] = React.useState(false);
  const [forceAbortedLoader, setForceAbortedLoader] = React.useState(false);

  React.useEffect(() => {
    console.log("[DEBUG PROFILE] [0] Profile screen mounted");
    return () => console.log("[DEBUG PROFILE] [CLEANUP] Profile screen unmounted");
  }, []);

  // Ultimate Failsafe: No matter what React or Zustand says, the UI MUST NOT hang here.
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoadingAuth || !hasHydrated) {
      timer = setTimeout(() => {
        console.warn("[ProfileScreen] FAILSFE TRIGGERED: Bypassing stuck loader.");
        setForceAbortedLoader(true);
      }, 1500);
    }
    return () => clearTimeout(timer);
  }, [isLoadingAuth, hasHydrated]);

  const handleRetry = React.useCallback(async () => {
    setRetrying(true);
    setForceAbortedLoader(false);
    setLoadingTooLong(false);
    try {
      if (user?.id) {
        await refreshUserData();
      } else {
        await useAppStore.getState().retryInitializeProfile();
      }
    } catch (e) {
      console.warn("Retry failed:", e);
    } finally {
      setRetrying(false);
    }
  }, [user, refreshUserData]);

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

    console.log("[DEBUG PROFILE] [10] START loadUserPosts");
    try {
      console.log("[DEBUG PROFILE] [10] ENTER loadUserPosts");
      // Add a strict timeout to prevent manual pull-to-refresh infinite spins
      const result = await new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Timeout loading posts")), 6000);
        firestoreService.getCommunityFeed({
          userId: user.id,
          pageSize: 5
        }).then((res) => {
          clearTimeout(timer);
          resolve(res);
        }).catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
      });
      setUserPosts(result.posts);
      console.log("[DEBUG PROFILE] [10] SUCCESS loadUserPosts");
    } catch (error) {
      console.log(`[DEBUG PROFILE] [10] ERROR loadUserPosts: ${error}`);
      console.error('[Profile] Failed to load user posts:', error);
    } finally {
      console.log("[DEBUG PROFILE] [10] FINALLY loadUserPosts");
      console.log("[DEBUG PROFILE] [10] END loadUserPosts");
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
        // Prevent deadlock by using allSettled instead of Promise.all
        await Promise.allSettled([
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
  // If startup auth / profile fetched fails completely and there's no cached user, show the premium Retry UI
  if (!user && profileError) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.xl || 24 }]}>
        <View style={styles.errorCard}>
          <Feather name="wifi-off" size={48} color={themeColors.primary} style={{ marginBottom: spacing.md }} />
          <Text style={[styles.errorTitle, { color: themeColors.text }]}>Unable to Connect</Text>
          <Text style={[styles.errorSubtitle, { color: themeColors.textDim }]}>{profileError}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: themeColors.primary }]}
            onPress={handleRetry}
            disabled={retrying}
          >
            {retrying ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.retryButtonText}>Retry Connection</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Guard: only block on initial auth load and hydration. 
  // isAppInitializing is NOT included here — profile renders immediately once auth settles.
  // Firestore profile data loads in background via _initializeProfileData without blocking UI.
  if ((isLoadingAuth || !hasHydrated) && !forceAbortedLoader) {
    console.log(`[DEBUG PROFILE] Still loading: isLoadingAuth=${isLoadingAuth}, hasHydrated=${hasHydrated}`);
    return (
      <LoadingGuardWithTimeout onTimeout={() => setLoadingTooLong(true)} showHint={loadingTooLong} themeColors={themeColors} />
    );
  }

  console.log("[DEBUG PROFILE] [last] Loading=false, Profile is rendering");

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle="light-content" />

      {profileError && (
        <View style={[styles.offlineBanner, { backgroundColor: themeColors.primary + '33', borderColor: themeColors.primary }]}>
          <Feather name="alert-triangle" size={16} color={themeColors.primary} style={{ marginRight: spacing.xs }} />
          <Text style={[styles.offlineBannerText, { color: themeColors.text }]} numberOfLines={1}>
            Offline - Displaying Cached Data
          </Text>
          <TouchableOpacity
            onPress={handleRetry}
            disabled={retrying}
            style={[styles.offlineBannerRetryBtn, { backgroundColor: themeColors.primary }]}
          >
            {retrying ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.offlineBannerRetryText}>Retry</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.XXL * 2 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
          />
        }
      >
        <View style={[styles.headerHero, { paddingTop: getSafeTopInset(insets) + spacing.sm }]}>
          <View style={{ position: 'absolute', top: getSafeTopInset(insets) + spacing.sm, right: spacing.md, zIndex: 100 }}>
            <View style={styles.headerActions}>
              {!isGuest && (
                <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/saved-posts')}>
                  <Feather name="bookmark" size={20} color="white" />
                </TouchableOpacity>
              )}
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
            <View style={[styles.userInfoRow, isGuest && { marginBottom: spacing.sm }, { alignItems: 'center' }]}>
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

              {!isGuest && (
                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginLeft: spacing.sm }}>
                  <TouchableOpacity onPress={() => router.push('/social/me?tab=posts')} activeOpacity={0.7} style={{ alignItems: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>{userPosts?.length || 0}</Text>
                    <Text style={{ color: themeColors.textDim, fontSize: 12 }}>Posts</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push('/social/me?tab=followers')} activeOpacity={0.7} style={{ alignItems: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>{followers?.length || 0}</Text>
                    <Text style={{ color: themeColors.textDim, fontSize: 12 }}>Followers</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push('/social/me?tab=following')} activeOpacity={0.7} style={{ alignItems: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>{following?.length || 0}</Text>
                    <Text style={{ color: themeColors.textDim, fontSize: 12 }}>Following</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={{ marginTop: spacing.md, paddingHorizontal: spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={[styles.username, { color: 'white', fontSize: 20 }]} numberOfLines={1}>
                  {user?.displayName || user?.username || 'Guest User'}
                </Text>
                {user?.favoriteBadgeId && (
                  <View style={[styles.favoriteBadgeShowcase, { backgroundColor: `${themeColors.primary}20`, borderColor: themeColors.primary }]}>
                    <Feather name={(ACHIEVEMENTS.find(a => a.id === user.favoriteBadgeId)?.icon || "award") as any} size={10} color={themeColors.primary} />
                    <Text style={[styles.favoriteBadgeShowcaseText, { color: themeColors.primary }]} numberOfLines={1}>
                      {ACHIEVEMENTS.find(a => a.id === user.favoriteBadgeId)?.title}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.bioContainer}>
                {user?.bio && (
                  <Text style={[styles.bio, { color: 'rgba(255,255,255,0.7)', marginTop: 2 }]} numberOfLines={2}>
                    {user.bio}
                  </Text>
                )}
              </View>

              {!isGuest && (
                <View style={{ marginTop: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <TouchableOpacity onPress={() => setRankModalVisible(true)} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.levelBadge, { backgroundColor: `${themeColors.primary}20`, borderColor: themeColors.primary }]}>
                        <Text style={[styles.levelText, { color: themeColors.primary }]}>LVL {levelInfo.level}</Text>
                      </View>
                      <Text style={[styles.levelTitle, { color: 'white', marginLeft: 6 }]}>{levelInfo.rankTitle}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.push('/ranks')} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Feather name="award" size={12} color={themeColors.primary} />
                      <Text style={{ color: themeColors.primary, fontSize: 12, fontWeight: '700' }}>View Ranks</Text>
                    </TouchableOpacity>
                  </View>

                  {levelInfo.nextRankTitle && (
                    <Text style={[styles.nextRankPromo, { color: themeColors.textDim, marginTop: 4, fontSize: 12, width: '100%' }]}>
                      Next Rank: {levelInfo.nextRankTitle} (Level {levelInfo.nextRankMinLevel})
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* XP PROGRESS BAR */}
            {!isGuest && (
              <View style={[styles.xpProgressContainer, { marginTop: spacing.md }]}>
                <View style={styles.xpTextRow}>
                  <Text style={[styles.xpText, { color: 'rgba(255,255,255,0.7)' }]}>
                    {levelInfo.currentXp - levelInfo.xpForCurrentLevel} / {levelInfo.xpForNextLevel - levelInfo.xpForCurrentLevel} XP ({Math.round(levelInfo.progressPercentage)}%)
                  </Text>
                  <Text style={[styles.xpUntilText, { color: themeColors.primary }]}>
                    {levelInfo.xpForNextLevel - levelInfo.currentXp} XP left
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
                style={[styles.pillActionButton, { backgroundColor: themeColors.primary, marginTop: spacing.md }]}
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
                style={[styles.pillActionButton, { marginTop: spacing.md }]}
                onPress={() => router.push('/edit-profile')}
                activeOpacity={0.8}
              >
                <Feather name="edit-2" size={14} color="white" />
                <Text style={styles.pillActionButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* --- PROFILE STATISTICS GRID --- */}
        <ProfileStatsGrid
          episodes={stats.episodes}
          hours={Math.round(parseFloat(stats.days) * 24)}
          currentStreak={user?.currentStreak || 0}
          longestStreak={user?.longestStreak || 0}
          onEpisodesPress={() => router.push({ pathname: '/analytics', params: { type: 'episodes' } })}
          onHoursPress={() => router.push({ pathname: '/analytics', params: { type: 'hours' } })}
          onCurrentStreakPress={() => router.push({ pathname: '/analytics', params: { type: 'currentStreak' } })}
          onLongestStreakPress={() => router.push({ pathname: '/analytics', params: { type: 'longestStreak' } })}
        />


        {/* --- ACHIEVEMENTS SUMMARY --- */}
        {!isGuest && (
          <>
            <SectionHeader
              title="Achievements"
              onViewAll={() => router.push('/achievements' as any)}
            />
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.achievementSummaryCard, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }]}
                onPress={() => router.push('/achievements' as any)}
                activeOpacity={0.8}
              >
                <View style={styles.achievementSummaryHeader}>
                  <View style={styles.badgeCountContainer}>
                    <Text style={[styles.badgeCountValue, { color: 'white' }]}>
                      {user?.badges?.length || 0}
                    </Text>
                    <Text style={[styles.badgeCountLabel, { color: 'rgba(255,255,255,0.5)' }]}>
                      / {ACHIEVEMENTS.length} Badges Earned
                    </Text>
                  </View>

                  <View style={styles.badgeProgressCompact}>
                    <Text style={[styles.badgeProgressPct, { color: themeColors.primary }]}>
                      {Math.round(((user?.badges?.length || 0) / ACHIEVEMENTS.length) * 100)}% Complete
                    </Text>
                  </View>
                </View>

                <View style={styles.badgeIconShowcase}>
                  {ACHIEVEMENTS.slice(0, 5).map((badge) => {
                    const isUnlocked = user?.badges?.includes(badge.id);
                    return (
                      <View
                        key={badge.id}
                        style={[
                          styles.badgeIconBubble,
                          {
                            backgroundColor: isUnlocked ? `${themeColors.primary}15` : 'rgba(255,255,255,0.02)',
                            borderColor: isUnlocked ? `${themeColors.primary}30` : 'rgba(255,255,255,0.04)'
                          }
                        ]}
                      >
                        <Feather
                          name={(badge.icon || "award") as any}
                          size={18}
                          color={isUnlocked ? themeColors.primary : 'rgba(255,255,255,0.2)'}
                        />
                      </View>
                    );
                  })}
                  <View style={styles.viewMoreBubble}>
                    <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.6)" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* --- MY LISTS --- */}
        <SectionHeader title="My Lists" onViewAll={() => router.push('/watchlist')} />
        <View style={styles.section}>
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
                haptic={false}
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

        {/* --- CUSTOM COLLECTIONS --- */}
        <SectionHeader title="Custom Collections" onViewAll={() => router.push('/collections')} />
        {!(collections?.length > 0) ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.emptyCollectionsCard, { borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }]}
              onPress={() => router.push('/collections')}
            >
              <Feather name="folder-plus" size={18} color={themeColors.primary} />
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginLeft: 8 }}>
                Create custom lists to group your favorites!
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: 4 }}
          >
            {(collections || []).map(col => (
              <TouchableOpacity
                key={col.id}
                style={[styles.miniCollectionCard, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }]}
                onPress={() => router.push(`/collections/${col.id}`)}
              >
                <Text style={{ fontSize: 20 }}>{col.emoji || '📂'}</Text>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }} numberOfLines={1}>
                    {col.name}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                    {col.itemCount || 0} titles
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}


        {/* --- SHOWS (Currently Watching) --- */}
        {currentlyWatching.length > 0 && (
          <View style={styles.carouselSection}>
            <HorizontalCarousel
              title="Currently Watching"
              data={currentlyWatching}
              onPress={(id) => router.push(`/details/${id}`)}
              onViewAll={() => router.push('/category/continue-watching')}
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
              onViewAll={() => router.push('/category/ratings')}
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
              onViewAll={() => router.push('/category/favorites')}
            />
          </View>
        )}

        {/* --- GENRE AFFINITY --- */}
        <SectionHeader title="Genre Affinity" />
        <View style={styles.section}>
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
          <View style={styles.section}>
            <View style={[styles.tasteInsightCard, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)', marginHorizontal: 0 }]}>
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
          <Text style={[styles.versionText, { color: themeColors.textDim }]}>{APP_VERSION_DISPLAY}</Text>
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
    marginTop: 30,
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
    paddingRight: 120, // Prevents long usernames from overflowing under the absolute-positioned action bar
  },
  username: {
    fontSize: 24,
    fontWeight: '800' as any,
    letterSpacing: -0.5,
    color: 'white',
  },
  handle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 3,
    marginBottom: 6,
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
    fontSize: 13,
    fontWeight: '700',
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
    gap: spacing.M,
    marginTop: spacing.M,
  },
  actionButton: {
    paddingHorizontal: spacing.XL,
    height: 36,
    borderRadius: 18,
  },
  section: {
    paddingHorizontal: spacing.XL,
    marginBottom: spacing.M,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.XL,
    gap: spacing.M,
    marginTop: spacing.M,
    marginBottom: spacing.L,
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
    marginBottom: 0,
  },
  listsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.M,
    marginTop: 0,
  },
  listCard: {
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: spacing.XL,
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
  emptyCollectionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  miniCollectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 150,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
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
  nextRankPromo: {
    fontSize: 10,
    fontWeight: '600' as any,
    opacity: 0.8,
    marginTop: -2,
    marginBottom: 4,
    marginLeft: 4,
  },
  favoriteBadgeShowcase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginLeft: 8,
    alignSelf: 'center',
  },
  favoriteBadgeShowcaseText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  achievementSummaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
    marginHorizontal: spacing.xl,
  },
  achievementSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeCountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  badgeCountValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  badgeCountLabel: {
    fontSize: 12,
    marginLeft: 4,
  },
  badgeProgressCompact: {},
  badgeProgressPct: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  badgeIconShowcase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badgeIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewMoreBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  errorCard: {
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 340,
    width: '100%',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  offlineBannerRetryBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  offlineBannerRetryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
