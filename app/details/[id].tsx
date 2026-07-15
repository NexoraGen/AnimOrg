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
  Alert,
  TextInput
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
  ReviewComposer,
  AuthPromptModal,
  TrackingNotificationPrompt
} from '../../src/components/ui';
import { notificationPermission } from '../../src/services/notificationPermission';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { CinematicModal } from '../../src/components/layout/CinematicModal';
import { CharacterCard } from '../../src/components/features/CharacterCard';
import { animeApi } from '../../src/services/animeApi';
import { firestoreService } from '../../src/services/firebase/firestore';
import { Media, Character, WatchStatus, Review } from '../../src/types';
import { useAppStore } from '../../src/store/useAppStore';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { formatRating, hasValidRating } from '../../src/utils/formatters';
import { PLACEHOLDER_POSTER, PLACEHOLDER_BACKDROP } from '../../src/constants/images';
import { EpisodeCountRegistry } from '../../src/utils/episodeCountSync';

// ─── PAGE-LEVEL SAFETY NET ─────────────────────────────────────────────────
// Wraps the entire screen so crashes never bubble up to the global layout boundary.
class DetailErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e: any, info: any) {
    console.error('[DetailsScreen] Render crash caught by local boundary:', e, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0F0F0F', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Feather name="alert-circle" size={56} color="#E50914" />
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 8, textAlign: 'center' }}>Could not load this anime</Text>
          <Text style={{ color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginBottom: 32 }}>An unexpected error occurred. This has been noted.</Text>
          <TouchableOpacity onPress={() => this.setState({ hasError: false })} style={{ backgroundColor: '#E50914', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, marginBottom: 12 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── PER-SECTION SAFETY NET ────────────────────────────────────────────────
// Swallows crashes in individual sections (episodes, characters, etc.).
class SectionGuard extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e: any) { console.warn('[SectionGuard] Section render error:', e?.message); }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

interface HeroBackdropProps {
  backdropPath?: string | null;
  trailerUrl?: string | null;
  themeColors: any;
}

const HeroBackdrop = React.memo(({ backdropPath, trailerUrl, themeColors }: HeroBackdropProps) => {
  const source = React.useMemo(() => (
    typeof backdropPath === 'string' && backdropPath.trim() ? { uri: backdropPath } : { uri: PLACEHOLDER_BACKDROP }
  ), [backdropPath]);

  return (
    <View style={styles.backdropContainer}>
      <Image
        source={source}
        style={styles.backdrop}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent', themeColors.background]}
        locations={[0, 0.4, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      {trailerUrl && (
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingBottom: 40 }]}
          onPress={() => Linking.openURL(trailerUrl)}
        >
          <View style={[styles.playOverlay, { backgroundColor: `${themeColors.primary}CC` }]}>
            <Feather name="play" size={32} color="#FFF" fill="#FFF" style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
});

interface HeroPosterProps {
  posterPath?: string | null;
  themeColors: any;
}

const HeroPoster = React.memo(({ posterPath, themeColors }: HeroPosterProps) => {
  const source = React.useMemo(() => (
    typeof posterPath === 'string' && posterPath.trim() ? { uri: posterPath } : { uri: PLACEHOLDER_POSTER }
  ), [posterPath]);

  return (
    <View style={[styles.posterWrapper, { shadowColor: themeColors.primary }]}>
      <Image
        source={source}
        style={[styles.poster, { borderColor: 'rgba(255,255,255,0.1)' }]}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    </View>
  );
});

export default function DetailsScreen() {
  return (
    <DetailErrorBoundary>
      <DetailsScreenInner />
    </DetailErrorBoundary>
  );
}

function DetailsScreenInner() {
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId || '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 900;

  const watchlist = useAppStore(state => state.watchlist);
  const user = useAppStore(state => state.user);
  const addToWatchlist = useAppStore(state => state.addToWatchlist);
  const removeFromWatchlist = useAppStore(state => state.removeFromWatchlist);
  const updateWatchlistStatus = useAppStore(state => state.updateWatchlistStatus);
  const toggleFavorite = useAppStore(state => state.toggleFavorite);
  const addToRecentlyViewed = useAppStore(state => state.addToRecentlyViewed);
  const rateAnime = useAppStore(state => state.rateAnime);
  const userRatings = useAppStore(state => state.userRatings);
  const setModalActive = useAppStore(state => state.setModalActive);

  // Collections integration
  const collections = useAppStore(state => state.collections);
  const addAnimeToCollectionAction = useAppStore(state => state.addAnimeToCollectionAction);
  const removeAnimeFromCollectionAction = useAppStore(state => state.removeAnimeFromCollectionAction);
  const createCollectionAction = useAppStore(state => state.createCollectionAction);

  const shareScale = useRef(new Animated.Value(1)).current;
  const isInputFocused = useRef(false);

  const [media, setMedia] = useState<Media | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [recommendations, setRecommendations] = useState<Media[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatusModalVisible, setStatusModalVisible] = useState(false);
  const [isPostingReview, setIsPostingReview] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showTrackingPrompt, setShowTrackingPrompt] = useState(false);

  // Collections states
  const [isCollectionModalVisible, setCollectionModalVisible] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreatingInline, setIsCreatingInline] = useState(false);

  const checkAndPromptNotifications = async () => {
    const shouldShow = await notificationPermission.shouldShowTrackingPrompt();
    if (shouldShow) {
      setShowTrackingPrompt(true);
    }
  };

  useEffect(() => {
    setModalActive(isStatusModalVisible);
  }, [isStatusModalVisible]);

  // Reactive subscription: when EpisodeCountRegistry discovers a higher count
  // (e.g. via EpisodeList fetching episode 1168), update this page's media state.
  useEffect(() => {
    const unsubscribe = EpisodeCountRegistry.subscribe((animeId, count) => {
      if (String(animeId) === String(id)) {
        setMedia(prev => {
          if (prev && (!prev.episodes || prev.episodes < count)) {
            return { ...prev, episodes: count };
          }
          return prev;
        });
      }
    });
    return unsubscribe;
  }, [id]);

  const userId = user?.id;

  const fetchDetails = React.useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // 1. MUST FETCH METADATA FIRST
      const data = await animeApi.getAnimeDetails(id, (updatedData) => {
        if (updatedData) {
          setMedia(prev => {
            if (!prev) return updatedData;
            const maxEpisodes = Math.max(prev.episodes || 0, updatedData.episodes || 0);
            return {
              ...prev,
              ...updatedData,
              episodes: maxEpisodes
            };
          });
          if (updatedData.trailerData) {
            trailerService.resolveTrailerUrl(updatedData.id, updatedData.title, updatedData.trailerData).then(url => {
              if (url) {
                setMedia(curr => curr ? { ...curr, trailerUrl: url } : null);
              }
            }).catch(() => { });
          }
        }
      });

      if (!data) {
        console.warn(`Detail data was null for ID: ${id}`);
        setIsLoading(false);
        return;
      }

      try {
        await EpisodeCountRegistry.init();
        const knownCount = EpisodeCountRegistry.getKnownCount(id);
        if (knownCount && (!data.episodes || data.episodes < knownCount)) {
          data.episodes = knownCount;
        }
      } catch (e) {
        console.warn('Failed to parse EpisodeCountRegistry in details:', e);
      }

      // Set initial media data so user sees content quickly
      setMedia(data);
      addToRecentlyViewed(data);

      // Self-healing: Correct corrupted watchlist item episodes (e.g. 100) back to actual API metadata value
      const tracked = watchlist.find(item => String(item.mediaId) === String(id));
      if (tracked && data.episodes && data.episodes > 0 && tracked.episodes !== data.episodes) {
        console.log(`[Self-Healing] Correcting episode count for ${data.title} from ${tracked.episodes} to ${data.episodes}`);

        // Update local store state
        useAppStore.setState({
          watchlist: watchlist.map(item =>
            String(item.mediaId) === String(id) ? { ...item, episodes: data.episodes } : item
          )
        });

        // Sync back to Firestore if user is logged in
        if (userId) {
          const updatedTracked = useAppStore.getState().watchlist.find(item => String(item.mediaId) === String(id));
          if (updatedTracked) {
            firestoreService.addToWatchlist(userId, updatedTracked).catch(err => {
              console.warn('[Self-Healing] Firestore sync failed:', err);
            });
            firestoreService.syncTrackedAnime(userId, updatedTracked).catch(err => {
              console.warn('[Self-Healing] Firestore sync status failed:', err);
            });
          }
        }
      }

      // 2. FETCH SUPPLEMENTAL DATA ASYNCHRONOUSLY (social/tracking)
      Promise.allSettled([
        firestoreService.getReviewsForAnime(id),
        firestoreService.getAnimeLikeCount(id),
        userId ? firestoreService.getUserRating(userId, id) : Promise.resolve(null),
        trailerService.resolveTrailerUrl(data.id, data.title, data.trailerData),
        animeApi.getAnimeCharacters(id),
        animeApi.getAnimeRecommendations(id),
        // Phase 17: Proactive fetch for global episode total count (critical for ongoing shows like One Piece)
        data.status === 'Currently Airing' || data.episodes === null
          ? animeApi.getAnimeEpisodes(id)
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
            setMedia(curr => {
              if (!curr) return null;
              const maxVal = Math.max(curr.episodes || 0, epData.totalCount);
              return { ...curr, episodes: maxVal };
            });
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
  }, [id, userId, addToRecentlyViewed]);

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
    if (isInputFocused.current) return;
    if (userRating !== null) {
      setInputValue(userRating.toFixed(1));
    } else {
      setInputValue('');
    }
  }, [userRating]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const watchlistItem = watchlist.find(item => item.mediaId === id);
  const isInWatchlist = !!watchlistItem;
  const isFavorite = watchlistItem?.isFavorite || false;

  const isInAnyCollection = React.useMemo(() => {
    return collections.some(col => col.animeIds.includes(String(id)));
  }, [collections, id]);

  const STATUS_OPTIONS: { value: WatchStatus; label: string }[] = [
    { value: 'watching', label: 'Watching' },
    { value: 'completed', label: 'Completed' },
    { value: 'plan-to-watch', label: 'Plan to Watch' },
    { value: 'dropped', label: 'Dropped' },
  ];

  const handleStatusSelect = (status: WatchStatus) => {
    if (!user) {
      setShowAuthGate(true);
      setStatusModalVisible(false);
      return;
    }
    if (isInWatchlist) {
      updateWatchlistStatus(id, status);
    } else {
      if (media) {
        addToWatchlist(media, status);
        checkAndPromptNotifications();
      }
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
      setShowAuthGate(true);
      return;
    }
    setUserRating(score);
    // rateAnime handles both local state and firestore sync
    rateAnime(id, score, media);
    showToast(`Rating saved: ${score}/10`);
    triggerHaptic('success');
  };

  const handleInputValueChange = (text: string) => {
    if (!user || !media) return;
    // Allow numbers and a single decimal point
    const formatted = text.replace(/[^0-9.]/g, '');

    // Handle multiple decimal points
    const parts = formatted.split('.');
    if (parts.length > 2) return;

    setInputValue(formatted);

    const parsed = parseFloat(formatted);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
      setUserRating(parsed);
      rateAnime(id, parsed, media);
    }
  };

  const handleInputBlur = () => {
    if (!user || !media) return;
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed) || parsed < 0 || parsed > 10) {
      if (userRating !== null) {
        setInputValue(userRating.toFixed(1));
      } else {
        setInputValue('');
      }
    } else {
      const formattedValue = parsed.toFixed(1);
      setInputValue(formattedValue);
      setUserRating(parsed);
      rateAnime(id, parsed, media);
      showToast(`Rating saved: ${formattedValue}/10`);
      triggerHaptic('success');
    }
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
      setShowAuthGate(true);
      return;
    }
    if (isInWatchlist) {
      toggleFavorite(id);
    } else {
      if (media) {
        await addToWatchlist(media, 'plan-to-watch');
        toggleFavorite(id);
        checkAndPromptNotifications();
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

  if (!id) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: themeColors.background }]}>
        <Feather name="alert-circle" size={64} color={themeColors.primary} style={{ marginBottom: spacing.lg }} />
        <Text style={[styles.errorText, { color: themeColors.text, fontSize: 20, fontWeight: 'bold' }]}>Invalid Anime ID</Text>
        <Text style={{ color: themeColors.textDim, marginBottom: 30, textAlign: 'center', paddingHorizontal: 40 }}>The link you followed appears to be broken or incomplete.</Text>
        <Button title="Return to Home" onPress={() => router.replace('/(tabs)/home')} />
      </View>
    );
  }

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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
      >
        <View style={isDesktop ? styles.desktopContainer : null}>
          <View style={styles.imageContainer}>
            <HeroBackdrop
              backdropPath={media.backdropPath}
              trailerUrl={media.trailerUrl}
              themeColors={themeColors}
            />

            <View style={styles.posterOverlay}>
              <HeroPoster posterPath={media.posterPath} themeColors={themeColors} />
              <View style={styles.mainInfo}>
                <Text style={[styles.title, { color: themeColors.text }]}>{media.title}</Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.year, { color: themeColors.textMuted }]}>{media.releaseYear} • {media.status} • {media.format === 'Movie' ? 'Movie' : `${media.episodes || '?'} Eps`}</Text>
                  {hasValidRating(media.rating) && (
                    <View style={[styles.ratingBox, { backgroundColor: 'transparent' }]}>
                      <Feather name="star" color={themeColors.primary} size={14} fill={themeColors.primary} />
                      <Text style={[styles.ratingText, { color: themeColors.textMuted }]}>{formatRating(media.rating)}</Text>
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

              <TouchableOpacity
                style={[
                  styles.actionIcon,
                  { backgroundColor: themeColors.surface, borderColor: themeColors.border },
                  isInAnyCollection && { borderColor: themeColors.primary, backgroundColor: `${themeColors.primary}15` }
                ]}
                onPress={() => {
                  if (!user) {
                    setShowAuthGate(true);
                  } else {
                    setCollectionModalVisible(true);
                  }
                }}
              >
                <Feather
                  name="folder"
                  color={isInAnyCollection ? themeColors.primary : themeColors.text}
                  size={22}
                />
                <Text style={[styles.actionIconLabel, { color: isInAnyCollection ? themeColors.primary : themeColors.textDim }]}>Collect</Text>
              </TouchableOpacity>
            </View>

            {/* Rating Section (Phase 4.6) */}
            <View style={[styles.ratingSection, { backgroundColor: themeColors.surfaceVariant }]}>
              <Text style={[styles.ratingLabel, { color: themeColors.text }]}>Your Rating</Text>
              <View style={styles.starsRow}>
                <StarRating
                  rating={userRating || 0}
                  interactive
                  size={28}
                  onChange={handleRatingChange}
                />
              </View>
              <View style={styles.decimalInputContainer}>
                <TextInput
                  style={[styles.decimalInput, { color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.background }]}
                  value={inputValue}
                  onChangeText={handleInputValueChange}
                  onFocus={() => {
                    isInputFocused.current = true;
                  }}
                  onBlur={() => {
                    isInputFocused.current = false;
                    handleInputBlur();
                  }}
                  keyboardType="numeric"
                  placeholder="0.0"
                  placeholderTextColor={themeColors.textDim}
                  maxLength={4}
                />
                <Text style={[styles.slashTen, { color: themeColors.textMuted }]}>/ 10</Text>
              </View>
              <Text style={[styles.ratingSubtext, { color: themeColors.textMuted }]}>
                {userRating ? `You rated this ${userRating}/10` : 'Tap to rate'}
              </Text>
            </View>

            <View style={styles.genresRow}>
              {(media.genres || []).map(genre => (
                <GenreChip key={genre} label={genre} />
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Overview</Text>
            <ExpandableText
              text={media.description || 'No overview available for this title.'}
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
                  <Text style={[styles.infoLabel, { color: themeColors.textMuted }]}>{media.format === 'Movie' ? 'Format' : 'Episodes'}</Text>
                  <Text style={[styles.infoValue, { color: themeColors.text }]}>{media.format === 'Movie' ? 'Movie' : (media.episodes || '?')}</Text>
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

            {/* Episode Tracking Section */}
            {media.format !== 'Movie' && (
              <SectionGuard>
                <EpisodeList
                  animeId={id}
                  totalEpisodes={media.episodes}
                  media={media}
                />
              </SectionGuard>
            )}

            {/* Episode Discussions Community CTA */}
            <View style={[styles.section, { marginTop: spacing.md }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                <Text style={[styles.sectionTitle, { color: themeColors.text, marginBottom: 0 }]}>Live Discussions</Text>
                <TouchableOpacity onPress={() => router.push(`/(tabs)/social`)}>
                  <Text style={{ color: themeColors.primary, fontWeight: '700' }}>Join Community</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                style={{ backgroundColor: themeColors.surfaceVariant, padding: spacing.md, borderRadius: borderRadius.md, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: themeColors.border }}
                onPress={() => router.push(`/(tabs)/social`)}
              >
                <View style={{ backgroundColor: themeColors.primary + '20', padding: 12, borderRadius: 24 }}>
                  <Feather name="message-circle" size={24} color={themeColors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '700' }}>Active Episode Threads</Text>
                  <Text style={{ color: themeColors.textDim, fontSize: 14, marginTop: 4 }}>Interact with the fandom and debate recent episodes.</Text>
                </View>
                <Feather name="chevron-right" size={20} color={themeColors.textDim} />
              </TouchableOpacity>
            </View>

            <SectionGuard>
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
                    initialNumToRender={5}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                    scrollEventThrottle={16}
                    keyboardShouldPersistTaps="handled"
                    getItemLayout={(data, index) => ({ length: 156, offset: 156 * index, index })}
                  />
                </View>
              )}
            </SectionGuard>

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
                  <Button title="Sign In" onPress={() => setShowAuthGate(true)} style={{ marginTop: spacing.sm }} />
                </View>
              )}

              <View style={styles.reviewsList}>
                {(reviews || []).map(review => (
                  <View key={review.id} style={{ marginBottom: spacing.md }}>
                    <ReviewCard
                      review={review}
                      onLike={(reviewId) => {
                        if (!user) {
                          setShowAuthGate(true);
                          return;
                        }
                        firestoreService.likeReview(id, reviewId);
                      }}
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

            <SectionGuard>
              {recommendations.length > 0 && (
                <HorizontalCarousel
                  title="You May Also Like"
                  data={recommendations}
                  onPress={(id) => router.push(`/details/${id}`)}
                />
              )}
            </SectionGuard>

            <View style={{ height: insets.bottom + 40 }} />
          </View>
        </View>
      </ScrollView>

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

      <AuthPromptModal
        visible={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        message="Sign in to track episode progress, post reviews, and personalize your recommendations!"
      />

      <TrackingNotificationPrompt
        visible={showTrackingPrompt}
        onClose={() => setShowTrackingPrompt(false)}
      />

      {/* Collect checklist modal */}
      <CinematicModal
        visible={isCollectionModalVisible}
        onClose={() => setCollectionModalVisible(false)}
        maxWidth={340}
      >
        <View style={styles.collectionModalContent}>
          <Text style={[styles.collectionModalTitle, { color: 'white' }]}>Add to Collections</Text>
          <Text style={[styles.collectionModalSubtitle, { color: themeColors.textDim }]}>
            Organize "{media.title}" into custom lists:
          </Text>

          {/* List of Collections */}
          {collections.length === 0 ? (
            <Text style={[styles.noCollectionsText, { color: themeColors.textMuted }]}>
              You haven't created any collections yet.
            </Text>
          ) : (
            <ScrollView style={styles.collectionListScroll} showsVerticalScrollIndicator={false}>
              {collections.map(col => {
                const isSelected = col.animeIds.includes(String(id));
                return (
                  <TouchableOpacity
                    key={col.id}
                    style={[
                      styles.collectionItemRow,
                      { borderColor: 'rgba(255,255,255,0.06)' }
                    ]}
                    onPress={async () => {
                      triggerHaptic('light');
                      if (isSelected) {
                        await removeAnimeFromCollectionAction(col.id, id);
                      } else {
                        await addAnimeToCollectionAction(col.id, id);
                      }
                    }}
                  >
                    <View style={styles.collectionItemInfo}>
                      <Text style={styles.collectionItemEmoji}>{col.emoji || '📂'}</Text>
                      <Text style={[styles.collectionItemName, { color: 'white' }]} numberOfLines={1}>
                        {col.name}
                      </Text>
                    </View>
                    <Feather
                      name={isSelected ? "check-square" : "square"}
                      size={18}
                      color={isSelected ? themeColors.primary : themeColors.textDim}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Inline creation form */}
          {isCreatingInline ? (
            <View style={styles.inlineCreateBox}>
              <TextInput
                placeholder="Collection Name..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                style={[
                  styles.inlineInput,
                  {
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderColor: 'rgba(255,255,255,0.06)',
                    color: 'white'
                  }
                ]}
              />
              <View style={styles.inlineActions}>
                <TouchableOpacity
                  onPress={() => {
                    setIsCreatingInline(false);
                    setNewCollectionName('');
                  }}
                  style={[styles.inlineActionBtn, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
                >
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    if (newCollectionName.trim()) {
                      await createCollectionAction(newCollectionName.trim());
                      setNewCollectionName('');
                      setIsCreatingInline(false);
                      triggerHaptic('success');
                    }
                  }}
                  style={[styles.inlineActionBtn, { backgroundColor: themeColors.primary }]}
                >
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setIsCreatingInline(true)}
              style={[styles.inlineAddBtn, { borderColor: 'rgba(255,255,255,0.06)' }]}
            >
              <Feather name="plus-circle" size={16} color={themeColors.primary} style={{ marginRight: 6 }} />
              <Text style={{ color: themeColors.primary, fontSize: 12, fontWeight: 'bold' }}>New Collection</Text>
            </TouchableOpacity>
          )}

          <Button
            title="Done"
            variant="outline"
            onPress={() => setCollectionModalVisible(false)}
            style={{ width: '100%', height: 46, marginTop: spacing.md }}
          />
        </View>
      </CinematicModal>
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
  },
  starsRow: {
    marginBottom: spacing.md,
  },
  decimalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  decimalInput: {
    width: 64,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: typography.sizes.md,
    fontWeight: 'bold',
    paddingVertical: 0, // prevents vertical shift in android
  },
  slashTen: {
    fontSize: typography.sizes.md,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  collectionModalContent: {
    paddingTop: spacing.xs,
    alignItems: 'center',
    width: '100%',
  },
  collectionModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  collectionModalSubtitle: {
    fontSize: 12,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  collectionListScroll: {
    width: '100%',
    maxHeight: 200,
    marginBottom: spacing.md,
  },
  collectionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  collectionItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  collectionItemEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  collectionItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  noCollectionsText: {
    fontSize: 12,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  inlineAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: spacing.xs,
  },
  inlineCreateBox: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  inlineInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    height: 38,
    paddingHorizontal: spacing.md,
    fontSize: 13,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  inlineActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
});
