import React, { useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    useWindowDimensions,
    TouchableOpacity
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { spacing, borderRadius } from '../../src/theme';
import { GlassHeader, ContinueWatchingCard, ContinueWatchingEntry, HEADER_HEIGHT } from '../../src/components/ui';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useAppStore } from '../../src/store/useAppStore';
import { getSafeTopInset } from '../../src/utils/layout';
import { getCurrentlyReleasedEpisodesCount, resolveAnimeTrackingStatus } from '../../src/utils/releaseHelper';

export default function ContinueWatchingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const themeColors = useThemeColors();

    const watchlist = useAppStore(s => s.watchlist);
    const animeProgress = useAppStore(s => s.animeProgress);
    const isAuthenticated = useAppStore(s => s.isAuthenticated);

    // Compute the Continue Watching List
    const continueWatchingList = useMemo<ContinueWatchingEntry[]>(() => {
        if (!isAuthenticated) return [];

        const now = Date.now();
        const list: ContinueWatchingEntry[] = [];

        watchlist.forEach(animeItem => {
            const wId = String(animeItem.mediaId);
            const progress = animeProgress[wId] || { lastWatchedEpisode: 0, status: 'watching' };
            const lastWatched = progress.lastWatchedEpisode || 0;

            const resolvedStatus = animeItem.mediaStatus || 'Currently Airing';

            const mediaInstance = {
                id: animeItem.mediaId,
                title: animeItem.title,
                description: '',
                posterPath: animeItem.posterPath || '',
                backdropPath: animeItem.backdropPath || '',
                status: resolvedStatus,
                episodes: animeItem.episodes || 0,
                airing_start: animeItem.airing_start,
                broadcast: animeItem.broadcast,
                genres: animeItem.genres || [],
                type: 'anime' as const
            };

            const releasedCount = getCurrentlyReleasedEpisodesCount(mediaInstance, now);

            const expectedStatus = resolveAnimeTrackingStatus({
                mediaStatus: resolvedStatus,
                totalEpisodes: animeItem.episodes || 0,
                watchedCount: lastWatched,
                releasedCount,
            });

            // Filter out completed shows unless they start rewatching
            if (expectedStatus === 'completed') {
                return;
            }

            // Only include shows that are actively being watched
            if (lastWatched > 0 || animeItem.status === 'watching') {
                const nextEp = lastWatched + 1;
                list.push({
                    animeId: wId,
                    title: animeItem.title,
                    posterPath: animeItem.posterPath,
                    lastWatchedEpisode: lastWatched,
                    nextEpisode: nextEp,
                    totalEpisodes: animeItem.episodes || 0,
                    releasedCount,
                    progressFraction: releasedCount > 0 ? lastWatched / releasedCount : (animeItem.episodes ? lastWatched / animeItem.episodes : 0),
                    lastViewedAt: progress.updatedAt || animeItem.addedAt,
                });
            }
        });

        // Sort by: 1. Most recently watched, 2. Most recently updated
        list.sort((a, b) => {
            const timeA = a.lastViewedAt ? new Date(a.lastViewedAt).getTime() : 0;
            const timeB = b.lastViewedAt ? new Date(b.lastViewedAt).getTime() : 0;
            return timeB - timeA;
        });

        return list;
    }, [watchlist, animeProgress, isAuthenticated]);

    const handleMediaPress = useCallback((id: string) => {
        router.push(`/details/${id}`);
    }, [router]);

    const handlePlayPress = useCallback((id: string, nextEp?: number) => {
        router.push(`/details/${id}?episode=${nextEp || 1}&autoplay=true`);
    }, [router]);

    const renderEmptyState = useCallback(() => (
        <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: `${themeColors.primary}15` }]}>
                <Feather name="play-circle" size={40} color={themeColors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>Continue Watching</Text>
            <Text style={[styles.emptyMessage, { color: themeColors.textDim }]}>
                You don't have any ongoing anime in your watchlist. Start watching an anime and it'll appear here.
            </Text>
        </Animated.View>
    ), [themeColors]);

    return (
        <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
            <GlassHeader
                title="Continue Watching"
                leftComponent={
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Feather name="chevron-left" color={themeColors.text} size={28} />
                    </TouchableOpacity>
                }
            />

            <View style={{ flex: 1, paddingTop: getSafeTopInset(insets) + HEADER_HEIGHT }}>
                {continueWatchingList.length === 0 ? (
                    renderEmptyState()
                ) : (
                    <FlashList<ContinueWatchingEntry>
                        data={continueWatchingList}
                        keyExtractor={(item) => `cw-viewall-${item.animeId}`}
                        contentContainerStyle={styles.listContent}
                        // @ts-ignore
                        estimatedItemSize={130}
                        renderItem={({ item }) => (
                            <View style={styles.cardContainer}>
                                <ContinueWatchingCard
                                    entry={item}
                                    onPress={handleMediaPress}
                                    onPlayPress={handlePlayPress}
                                />
                            </View>
                        )}
                    />
                )}
            </View>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backButton: {
        padding: 4,
    },
    listContent: {
        paddingTop: spacing.S,
        paddingBottom: spacing.XXL,
    },
    cardContainer: {
        width: '100%',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.XL,
        paddingBottom: spacing.XXL * 2,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.L,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: spacing.S,
        textAlign: 'center',
    },
    emptyMessage: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});
