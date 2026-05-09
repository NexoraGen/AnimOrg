import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity,
  Dimensions,
  Share,
  Linking,
  FlatList
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { 
  ChevronLeft, 
  Play, 
  Plus, 
  Share2,
  Bookmark,
  Heart,
  List,
  Star,
  Check
} from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '../../src/theme';
import { Button, GlassHeader, HorizontalCarousel } from '../../src/components/ui';
import { CharacterCard } from '../../src/components/features/CharacterCard';
import { animeApi } from '../../src/services/animeApi';
import { Media, Character, WatchStatus } from '../../src/types';
import { useAppStore } from '../../src/store/useAppStore';

const { width, height } = Dimensions.get('window');

export default function DetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { watchlist, addToWatchlist, removeFromWatchlist, updateWatchlistStatus, toggleFavorite } = useAppStore();
  
  const [media, setMedia] = useState<Media | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [recommendations, setRecommendations] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatusModalVisible, setStatusModalVisible] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const data = await animeApi.getAnimeDetails(id);
        if (data) {
          const [chars, recs] = await Promise.all([
            animeApi.getAnimeCharacters(id),
            animeApi.getAnimeRecommendations(id)
          ]);
          setCharacters(chars);
          setRecommendations(recs);
          setMedia(data);
        } else {
          setMedia(null);
        }
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

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
    if (isInWatchlist) {
      updateWatchlistStatus(id, status);
    } else {
      if (media) addToWatchlist(media, status);
    }
    setStatusModalVisible(false);
  };

  const handleRemoveFromWatchlist = () => {
    removeFromWatchlist(id);
    setStatusModalVisible(false);
  };

  const handleFavoriteToggle = async () => {
    if (isInWatchlist) {
      toggleFavorite(id);
    } else {
      if (media) {
        await addToWatchlist(media, 'plan-to-watch');
        toggleFavorite(id);
      }
    }
  };

  const handleShare = async () => {
    if (!media) return;
    try {
      await Share.share({
        message: `Check out ${media.title} on AniVerse!`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!media) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Content not found</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft color={colors.text} size={28} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Share2 color={colors.text} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: media.backdropPath }} style={styles.backdrop} />
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          
          <View style={styles.posterOverlay}>
            <Image source={{ uri: media.posterPath }} style={styles.poster} />
            <View style={styles.mainInfo}>
              <Text style={styles.title}>{media.title}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.year}>{media.releaseYear}</Text>
                <View style={styles.dot} />
                <View style={styles.ratingBox}>
                  <Star color={colors.primary} size={14} fill={colors.primary} />
                  <Text style={styles.ratingText}>{media.rating}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.detailsContent}>
          <View style={styles.actionRow}>
            <Button 
              title="Watch Trailer" 
              onPress={() => media.trailerUrl && Linking.openURL(media.trailerUrl)} 
              style={StyleSheet.flatten([styles.trailerButton, !media.trailerUrl ? { opacity: 0.5 } : {}])}
              icon={<Play color={colors.text} size={20} fill={colors.text} />}
            />
            <TouchableOpacity 
              style={[styles.watchlistIcon, isInWatchlist && styles.watchlistIconActive]} 
              onPress={() => setStatusModalVisible(true)}
            >
              {isInWatchlist ? (
                <Check color={colors.primary} size={24} />
              ) : (
                <Plus color={colors.text} size={24} />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.favoriteIcon, isFavorite && styles.favoriteIconActive]} 
              onPress={handleFavoriteToggle}
            >
              <Heart 
                color={isFavorite ? colors.accent : colors.text} 
                size={24} 
                fill={isFavorite ? colors.accent : 'transparent'} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.genresRow}>
            {media.genres.map(genre => (
              <View key={genre} style={styles.genreTag}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.description}>{media.description}</Text>

            <View style={styles.infoGrid}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Episodes</Text>
                  <Text style={styles.infoValue}>{media.episodes || '?'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text style={styles.infoValue}>{media.status || 'Unknown'}</Text>
                </View>
              </View>
              <View style={[styles.infoRow, { marginTop: spacing.md }]}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Studio</Text>
                  <Text style={styles.infoValue}>{media.studio || 'Unknown'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Season</Text>
                  <Text style={styles.infoValue}>{media.season || 'Unknown'}</Text>
                </View>
              </View>
            </View>

          {characters.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Characters</Text>
              <FlatList
                data={characters}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <CharacterCard character={item} />}
                contentContainerStyle={{ paddingVertical: spacing.sm }}
              />
            </View>
          )}

          {recommendations.length > 0 && (
            <View style={styles.section}>
              <HorizontalCarousel 
                title="You May Also Like" 
                data={recommendations} 
                onPress={(id) => router.push(`/details/${id}`)}
              />
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Watchlist Status Modal */}
      {isStatusModalVisible && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            onPress={() => setStatusModalVisible(false)} 
            activeOpacity={1}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Watch Status</Text>
            </View>
            
            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.statusOption,
                  watchlistItem?.status === option.value && styles.statusOptionActive
                ]}
                onPress={() => handleStatusSelect(option.value)}
              >
                <Text style={[
                  styles.statusOptionText,
                  watchlistItem?.status === option.value && styles.statusOptionTextActive
                ]}>
                  {option.label}
                </Text>
                {watchlistItem?.status === option.value && (
                  <Check color={colors.primary} size={20} />
                )}
              </TouchableOpacity>
            ))}

            {isInWatchlist && (
              <TouchableOpacity
                style={styles.removeOption}
                onPress={handleRemoveFromWatchlist}
              >
                <Text style={styles.removeOptionText}>Remove from Watchlist</Text>
              </TouchableOpacity>
            )}

            <Button 
              title="Cancel" 
              variant="ghost" 
              onPress={() => setStatusModalVisible(false)} 
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: 50,
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
    height: height * 0.45,
    width: '100%',
  },
  backdrop: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    borderColor: colors.border,
  },
  mainInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  year: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textDim,
    marginHorizontal: 8,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    color: colors.primary,
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
  watchlistIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  watchlistIconActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  favoriteIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  favoriteIconActive: {
    borderColor: 'rgba(244, 63, 94, 0.5)',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.xl,
  },
  genreTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
  },
  genreText: {
    color: colors.text,
    fontSize: typography.sizes.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  infoGrid: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    color: colors.textDim,
    fontSize: typography.sizes.xs,
    marginBottom: 4,
  },
  infoValue: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
  },
  loadingText: {
    color: colors.text,
    marginTop: 10,
  },
  errorText: {
    color: colors.error,
    marginBottom: 20,
  },
  section: {
    marginBottom: spacing.xl,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceVariant,
  },
  statusOptionActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  statusOptionText: {
    color: colors.text,
    fontSize: typography.sizes.md,
  },
  statusOptionTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold as any,
  },
  removeOption: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  removeOptionText: {
    color: colors.error,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium as any,
  }
});
