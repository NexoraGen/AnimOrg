import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
  Linking,
  FlatList,
  Animated,
  Platform,
  useWindowDimensions,
  Alert
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { trailerService } from '../../src/services/trailerService';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, borderRadius, typography } from '../../src/theme';
import {
  Button,
  GlassHeader,
  HorizontalCarousel,
  ExpandableText,
  StarRating,
  ReviewCard,
  SectionHeader,
  GenreChip,
  EpisodeList,
  SkeletonLoader,
  ReviewComposer
} from '../../src/components/ui';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { CinematicModal } from '../../src/components/layout/CinematicModal';
import { CharacterCard } from '../../src/components/features/CharacterCard';
import { animeApi } from '../../src/services/animeApi';
import { jikanApi } from '../../src/services/api/jikan';
import { firestoreService } from '../../src/services/firebase/firestore';
import { Media, Character, WatchStatus, Review } from '../../src/types';
import { useAppStore } from '../../src/store/useAppStore';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { formatRating, hasValidRating } from '../../src/utils/formatters';
import { PLACEHOLDER_POSTER, PLACEHOLDER_BACKDROP } from '../../src/constants/images';

export default function DetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 900;

  const {
    watchlist,
    user,
    addToWatchlist,
    removeFromWatchlist,
    updateWatchlistStatus,
    toggleFavorite,
    addToRecentlyViewed,
    rateAnime,
    userRatings,
    setModalActive
  } = useAppStore();

  const scrollY = useRef(new Animated.Value(0)).current;
  const shareScale = useRef(new Animated.Value(1)).current;

  const [media, setMedia] = useState<Media | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [recommendations, setRecommendations] = useState<Media[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatusModalVisible, setStatusModalVisible] = useState(false);
  const [isPostingReview, setIsPostingReview] = useState(false);

  useEffect(() => {
    setModalActive(isStatusModalVisible);
  }, [isStatusModalVisible]);

  const fetchDetails = React.useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // 1. MUST FETCH METADATA FIRST
      const data = await animeApi.getAnimeDetails(id);

      if (!data) {
        console.warn(`Detail data was null for ID: ${id}`);
        setIsLoading(false);
        return;
      }

      // Set initial media data so user sees content quickly
      setMedia(data);
      addToRecentlyViewed(data);

      // 2. FETCH SUPPLEMENTAL DATA ASYNCHRONOUSLY (social/tracking)
      Promise.allSettled([
        firestoreService.getReviewsForAnime(id),
        firestoreService.getAnimeLikeCount(id),
        user ? firestoreService.getUserRating(user.id, id) : Promise.resolve(null),
        trailerService.resolveTrailerUrl(data.id, data.title, data.trailerData),
        animeApi.getAnimeCharacters(id),
        animeApi.getAnimeRecommendations(id),
        // Phase 17: Proactive fetch for global episode total count (critical for ongoing shows like One Piece)
        data.status === 'Currently Airing' || data.episodes === null
          ? jikanApi.getAnimeEpisodes(id, 1)
          : Promise.resolve(null)
      ]).then((results) => {
        if (results[0].status === 'fulfilled') setReviews(results[0].value as Review[]);
        if (results[1].status === 'fulfilled') setLikeCount(results[1].value as number);
        if (results[2].status === 'fulfilled') setUserRating(results[2].value as number | null);

        if (results[3].status === 'fulfilled' && results[3].value) {
          const trailerUrl = results[3].value as string;
          setMedia(curr => curr ? { ...curr, trailerUrl } : null);
        }

        if (results[4].status === 'fulfilled') setCharacters(results[4].value as Character[]);
        if (results[5].status === 'fulfilled') setRecommendations(results[5].value as Media[]);

        // Handle global episode total
        if (results[6].status === 'fulfilled' && results[6].value) {
          const epData = results[6].value as any;
          if (epData.totalCount) {
            setMedia(curr => curr ? { ...curr, episodes: epData.totalCount } : null);
          }
        }
      }).catch(err => {
        console.warn('Non-critical secondary fetch error:', err);
      });

    } catch (error) {
      console.error('Critical detail fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id, user, addToRecentlyViewed]);

  // Phase 23: Sync local rating with store for instant restoration
  useEffect(() => {
    if (id && userRatings.length > 0) {
      const existing = userRatings.find(r => String(r.animeId) === String(id));
      if (existing) {
        setUserRating(existing.score);
      }
    }
  }, [id, userRatings]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const watchlistItem = watchlist.find(item => item.mediaId === id);
  const isInWatchlist = !!watchlistItem;
  const isFavorite = watchlistItem?.isFavorite || false;

  const STATUS_OPTIONS: { value: WatchStatus; label: string }[] = [
    { value: 'watching', label: 'Watching' },
    { value: 'completed', label: 'Completed' },
    { value: 'plan-to-watch', label: 'Plan to Watch' },
    { value: 'dropped', label: 'Dropped' },
  ];

  const handleStatusSelect = (status: WatchStatus) => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please sign in or register to track anime in your watchlist!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/(auth)/login') }
        ]
      );
      setStatusModalVisible(false);
      return;
    }
    if (isInWatchlist) {
      updateWatchlistStatus(id, status);
    } else {
      if (media) addToWatchlist(media, status);
    }
    setStatusModalVisible(false);
    triggerHaptic('medium');
  };

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastMsg(null));
  };

  const handleRatingChange = (score: number) => {
    if (!media) return;
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please sign in or register to rate anime and export your progress!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/(auth)/login') }
        ]
      );
      return;
    }
    setUserRating(score);
    // rateAnime handles both local state and firestore sync
    rateAnime(id, score, media);
    showToast(`Rating saved: ${score}/10`);
    triggerHaptic('success');
  };

  const handlePostReview = async (text: string, rating: number, isSpoiler: boolean) => {
    if (!user || !media) return;
    setIsPostingReview(true);
    try {
      await firestoreService.addReview(user.id, id, {
        animeId: id,
        userId: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl || '',
        text,
        rating,
        isSpoiler,
        likes: 0
      });
      // Refresh reviews
      const updatedReviews = await firestoreService.getReviewsForAnime(id);
      setReviews(updatedReviews);
      triggerHaptic('success');
    } catch (error) {
      console.error("Failed to post review:", error);
    } finally {
      setIsPostingReview(false);
    }
  };

  const handleFavoriteToggle = async () => {
    triggerHaptic('light');
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please sign in or register to customize your favorites!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/(auth)/login') }
        ]
      );
      return;
    }
    if (isInWatchlist) {
      toggleFavorite(id);
    } else {
      if (media) {
        await addToWatchlist(media, 'plan-to-watch');
        toggleFavorite(id);
      }
    }
  };

  const triggerHaptic = (style: 'light' | 'medium' | 'success' = 'light') => {
    if (Platform.OS === 'web') return;
    try {
      if (style === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (style === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) { }
  };

  const handleShare = async () => {
    if (!media) return;

    Animated.sequence([
      Animated.timing(shareScale, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.timing(shareScale, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();

    try {
      await Share.share({
        message: `Check out ${media.title} on AnimOrg!`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={{ height: 350, backgroundColor: themeColors.surfaceVariant }}>
          <SkeletonLoader width="100%" height="100%" />
        </View>
        <View style={{ padding: spacing.md }}>
          <SkeletonLoader width="70%" height={32} style={{ marginBottom: spacing.sm }} />
          <SkeletonLoader width="40%" height={20} style={{ marginBottom: spacing.xl }} />
          <View style={{ flexDirection: 'row', marginBottom: spacing.xl }}>
            <SkeletonLoader width={120} height={50} style={{ marginRight: spacing.md, borderRadius: borderRadius.md }} />
            <SkeletonLoader width={60} height={50} style={{ borderRadius: borderRadius.md }} />
          </View>
          <SkeletonLoader width="100%" height={100} style={{ marginBottom: spacing.xl }} />
          <SkeletonLoader width="100%" height={200} />
        </View>
      </View>
    );
  }

  if (!media) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: themeColors.background }]}>
        <Feather name="alert-circle" size={64} color={themeColors.primary} style={{ marginBottom: spacing.lg }} />
        <Text style={[styles.errorText, { color: themeColors.text, fontSize: 20, fontWeight: 'bold' }]}>Content Not Found</Text>
        <Text style={{ color: themeColors.textDim, marginBottom: 30, textAlign: 'center', paddingHorizontal: 40 }}>We couldn't retrieve the details for this anime. It may have been removed or the ID is invalid.</Text>
        <View style={{ width: '100%', paddingHorizontal: spacing.xl, gap: spacing.md }}>
          <Button title="Retry Loading" onPress={fetchDetails} />
          <Button title="Return to Home" variant="ghost" onPress={() => router.replace('/(tabs)/home')} />
        </View>
      </View>
    );
  }

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { top: insets.top + spacing.sm }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="chevron-left" color="#FFF" size={28} />
        </TouchableOpacity>
        <Animated.View style={{ transform: [{ scale: shareScale }] }}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Feather name="share-2" color="#FFF" size={24} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: Platform.OS !== 'web' }
        )}
        scrollEventThrottle={16}
      >
        <View style={isDesktop ? styles.desktopContainer : null}>
          <View style={styles.imageContainer}>
            <Animated.View style={[
              styles.backdropContainer,
              {
                transform: [
                  {
                    translateY: scrollY.interpolate({
                      inputRange: [-height * 0.45, 0, height * 0.45],
                      outputRange: [-height * 0.45 / 2, 0, height * 0.45 * 0.75],
                    })
                  },
                  {
                    scale: scrollY.interpolate({
                      inputRange: [-height * 0.45, 0],
                      outputRange: [2, 1],
                      extrapolate: 'clamp',
                    })
                  }
                ]
              }
            ]}>
              <Image
                source={media.backdropPath?.trim() ? { uri: media.backdropPath } : { uri: PLACEHOLDER_BACKDROP }}
                style={styles.backdrop}
                contentFit="cover"
                transition={300}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent', themeColors.background]}
                locations={[0, 0.4, 0.6, 1]}
                style={StyleSheet.absoluteFill}
              />
              {media.trailerUrl && (
                <TouchableOpacity
                  style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingBottom: 40 }]}
                  onPress={() => Linking.openURL(media.trailerUrl!)}
                >
                  <View style={[styles.playOverlay, { backgroundColor: `${themeColors.primary}CC` }]}>
                    <Feather name="play" size={32} color="#FFF" fill="#FFF" style={{ marginLeft: 4 }} />
                  </View>
                </TouchableOpacity>
              )}
            </Animated.View>

            <View style={styles.posterOverlay}>
              <View style={[styles.posterWrapper, { shadowColor: themeColors.primary }]}>
                <Image
                  source={media.posterPath?.trim() ? { uri: media.posterPath } : { uri: PLACEHOLDER_POSTER }}
                  style={[styles.poster, { borderColor: 'rgba(255,255,255,0.1)' }]}
                  contentFit="cover"
                  transition={300}
                />
              </View>
              <View style={styles.mainInfo}>
                <Text style={[styles.title, { color: themeColors.text }]}>{media.title}</Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.year, { color: themeColors.textDim }]}>{media.releaseYear} • {media.status} • {media.episodes || '?'} Eps</Text>
                  {hasValidRating(media.rating) && (
                    <View style={[styles.ratingBox, { backgroundColor: `${themeColors.primary}25` }]}>
                      <Feather name="star" color={themeColors.primary} size={14} fill={themeColors.primary} />
                      <Text style={[styles.ratingText, { color: themeColors.primary }]}>{formatRating(media.rating)}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.detailsContent}>
            <View style={styles.actionRow}>
              <Button
                title={media.trailerUrl ? "Watch Trailer" : "No Trailer"}
                onPress={() => media.trailerUrl && Linking.openURL(media.trailerUrl)}
                style={styles.trailerButton}
                disabled={!media.trailerUrl}
                icon={<Feather name="play" color="#FFF" size={20} fill="#FFF" />}
              />
              <TouchableOpacity
                style={[styles.actionIcon, { backgroundColor: themeColors.surface, borderColor: themeColors.border }, isInWatchlist && { borderColor: themeColors.primary, backgroundColor: `${themeColors.primary}15` }]}
                onPress={() => setStatusModalVisible(true)}
              >
                <Feather name={isInWatchlist ? "check" : "plus"} color={isInWatchlist ? themeColors.primary : themeColors.text} size={22} />
                <Text style={[styles.actionIconLabel, { color: isInWatchlist ? themeColors.primary : themeColors.textDim }]}>Track</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionIcon, { backgroundColor: themeColors.surface, borderColor: themeColors.border }, isFavorite && { borderColor: themeColors.accent, backgroundColor: `${themeColors.accent}15` }]}
                onPress={handleFavoriteToggle}
              >
                <Feather
                  name="heart"
                  color={isFavorite ? themeColors.accent : themeColors.text}
                  size={22}
                  fill={isFavorite ? themeColors.accent : 'transparent'}
                />
                <Text style={[styles.actionIconLabel, { color: isFavorite ? themeColors.accent : themeColors.textDim }]}>Fav</Text>
              </TouchableOpacity>
            </View>

            {/* Rating Section (Phase 4.6) */}
            <View style={[styles.ratingSection, { backgroundColor: themeColors.surfaceVariant }]}>
              <Text style={[styles.ratingLabel, { color: themeColors.text }]}>Your Rating</Text>
              <StarRating
                rating={userRating || 0}
                interactive
                size={28}
                onChange={handleRatingChange}
              />
              <Text style={[styles.ratingSubtext, { color: themeColors.textMuted }]}>
                {userRating ? `You rated this ${userRating}/10` : 'Tap to rate'}
              </Text>
            </View>

            <View style={styles.genresRow}>
              {media.genres.map(genre => (
                <GenreChip key={genre} label={genre} />
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Overview</Text>
            <ExpandableText
              text={media.description}
              maxLines={4}
              style={styles.description}
            />

            {/* Stats Grid (Phase 4.7) */}
            <View style={[styles.infoGrid, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: themeColors.textMuted }]}>Popularity</Text>
                  <Text style={[styles.infoValue, { color: themeColors.text }]}>#{media.popularity || '?'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: themeColors.textMuted }]}>Rank</Text>
                  <Text style={[styles.infoValue, { color: themeColors.text }]}>#{media.rank || '?'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: themeColors.textMuted }]}>Scored By</Text>
                  <Text style={[styles.infoValue, { color: themeColors.text }]}>{media.rating_count ? (media.rating_count / 1000).toFixed(1) + 'k' : '?'}</Text>
                </View>
              </View>
              <View style={[styles.infoRow, { marginTop: spacing.md }]}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: themeColors.textMuted }]}>Episodes</Text>
                  <Text style={[styles.infoValue, { color: themeColors.text }]}>{media.episodes || '?'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: themeColors.textMuted }]}>Studio</Text>
                  <Text style={[styles.infoValue, { color: themeColors.text }]}>{media.studio || 'Unknown'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: themeColors.textMuted }]}>Source</Text>
                  <Text style={[styles.infoValue, { color: themeColors.text }]}>{media.source || '?'}</Text>
                </View>
              </View>
            </View>

            {/* Episode Tracking Section (Phase 2) */}
            <EpisodeList
              animeId={id}
              totalEpisodes={media.episodes}
              media={media}
            />

            {characters.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Characters" />
                <FlatList
                  data={characters}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => <CharacterCard character={item} />}
                  contentContainerStyle={{ paddingHorizontal: spacing.md }}
                />
              </View>
            )}

            {/* Reviews Section (Phase 4.5) */}
            <View style={styles.section}>
              <SectionHeader
                title="Community Reviews"
                subtitle={`${reviews.length} reviews`}
                onViewAll={() => { }}
              />

              {user ? (
                <ReviewComposer
                  onPost={handlePostReview}
                  isPosting={isPostingReview}
                />
              ) : (
                <View style={[styles.loginPrompt, { backgroundColor: themeColors.surfaceVariant }]}>
                  <Text style={[styles.loginPromptText, { color: themeColors.text }]}>Sign in to join the discussion</Text>
                  <Button title="Sign In" onPress={() => router.push('/(auth)/login')} style={{ marginTop: spacing.sm }} />
                </View>
              )}

              <View style={styles.reviewsList}>
                {reviews.map(review => (
                  <View key={review.id} style={{ marginBottom: spacing.md }}>
                    <ReviewCard
                      review={review}
                      onLike={(reviewId) => firestoreService.likeReview(id, reviewId)}
                    />
                  </View>
                ))}
                {reviews.length === 0 && (
                  <View style={[styles.emptyReviews, { backgroundColor: themeColors.surfaceVariant }]}>
                    <Feather name="message-square" size={24} color={themeColors.textMuted} />
                    <Text style={[styles.emptyReviewsText, { color: themeColors.textMuted }]}>
                      No reviews yet. Be the first!
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {recommendations.length > 0 && (
              <HorizontalCarousel
                title="You May Also Like"
                data={recommendations}
                onPress={(id) => router.push(`/details/${id}`)}
              />
            )}

            <View style={{ height: insets.bottom + 40 }} />
          </View>
        </View>
      </Animated.ScrollView>

      {/* Status Modal */}
      <CinematicModal
        visible={isStatusModalVisible}
        onClose={() => setStatusModalVisible(false)}
        maxWidth={460}
      >
        <View style={styles.modalInner}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Watch Status</Text>
          </View>

          {STATUS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.statusOption,
                { backgroundColor: themeColors.surfaceVariant },
                watchlistItem?.status === option.value && { borderColor: themeColors.primary, borderWidth: 1, backgroundColor: `${themeColors.primary}10` }
              ]}
              onPress={() => handleStatusSelect(option.value)}
            >
              <Text style={[
                styles.statusOptionText,
                { color: themeColors.text },
                watchlistItem?.status === option.value && { color: themeColors.primary, fontWeight: 'bold' }
              ]}>
                {option.label}
              </Text>
              {watchlistItem?.status === option.value && (
                <Feather name="check" color={themeColors.primary} size={20} />
              )}
            </TouchableOpacity>
          ))}

          {isInWatchlist && (
            <TouchableOpacity
              style={styles.removeOption}
              onPress={() => {
                removeFromWatchlist(id);
                setStatusModalVisible(false);
                triggerHaptic('medium');
              }}
            >
              <Text style={[styles.removeOptionText, { color: themeColors.error }]}>Remove from Watchlist</Text>
            </TouchableOpacity>
          )}

          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => setStatusModalVisible(false)}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </CinematicModal>

      {/* Persistence Feedback Toast */}
      {toastMsg && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }],
              opacity: toastAnim
            }
          ]}
        >
          <BlurView intensity={80} tint="dark" style={styles.toastBlur}>
            <Feather name="check-circle" size={18} color={themeColors.primary} />
            <Text style={styles.toastText}>{toastMsg}</Text>
          </BlurView>
        </Animated.View>
      )}
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    height: 500,
    width: '100%',
  },
  backdropContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  posterOverlay: {
    position: 'absolute',
    bottom: -60,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  mainInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  year: {
    fontSize: typography.sizes.sm,
    marginRight: 10,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
    marginLeft: 4,
  },
  detailsContent: {
    paddingTop: 80,
    paddingHorizontal: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  trailerButton: {
    flex: 1,
    marginRight: spacing.md,
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginLeft: spacing.sm,
  },
  actionIconLabel: {
    fontSize: 10,
    fontWeight: '800' as any,
    marginTop: 4,
  },
  posterWrapper: {
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  ratingSection: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  ratingLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  ratingSubtext: {
    fontSize: 12,
    marginTop: 8,
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.sm,
  },
  description: {
    marginBottom: spacing.xl,
  },
  infoGrid: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: typography.sizes.md,
    fontWeight: 'bold' as any,
  },
  section: {
    marginBottom: spacing.xl,
  },
  emptyReviews: {
    width: 280,
    height: 120,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  emptyReviewsText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  modalInner: {
    padding: spacing.lg,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: 'bold' as any,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  statusOptionText: {
    fontSize: typography.sizes.md,
  },
  removeOption: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  removeOptionText: {
    fontSize: typography.sizes.md,
    fontWeight: 'bold' as any,
  },
  desktopContainer: {
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  errorText: {
    marginBottom: 20,
  },
  loginPrompt: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  loginPromptText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 50,
    left: spacing.xl,
    right: spacing.xl,
    zIndex: 1000,
  },
  toastBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  toastText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  reviewsList: {
    marginTop: spacing.md,
  }
});
