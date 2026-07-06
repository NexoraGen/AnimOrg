import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
    LayoutAnimation,
    Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import { Episode } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { animeApi } from '../../services/animeApi';
import { useThemeColors } from '../../hooks/useThemeColors';
import { FlashList } from '@shopify/flash-list';
import { getCurrentlyReleasedEpisodesCount, getEpisodeAiringTime } from '../../utils/releaseHelper';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface EpisodeListProps {
    animeId: string;
    totalEpisodes?: number;
    media?: import('../../types').Media;
}

interface EpisodeItemProps {
    episode: Episode;
    isWatched: boolean;
    themeColors: any;
    onToggle: (epNumber: number, nextState: boolean) => void;
}

const EpisodeItem = React.memo(({ episode, isWatched, themeColors, onToggle }: EpisodeItemProps) => {
    const [localWatched, setLocalWatched] = useState(isWatched);
    const scaleAnim = React.useRef(new Animated.Value(isWatched ? 1 : 0)).current;

    useEffect(() => {
        if (localWatched !== isWatched) {
            setLocalWatched(isWatched);
            Animated.spring(scaleAnim, {
                toValue: isWatched ? 1 : 0,
                useNativeDriver: true,
                bounciness: 12,
                speed: 20
            }).start();
        }
    }, [isWatched]);

    const handlePress = () => {
        const nextState = !localWatched;
        setLocalWatched(nextState);

        Animated.spring(scaleAnim, {
            toValue: nextState ? 1 : 0,
            useNativeDriver: true,
            bounciness: 12,
            speed: 20
        }).start();

        onToggle(episode.number, nextState);
    };

    return (
        <TouchableOpacity
            style={[
                styles.episodeItem,
                { borderBottomColor: themeColors.border }
            ]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <View style={styles.episodeContent}>
                <Text style={[styles.epNumber, { color: colors.primary }]}>
                    {episode.number < 10 ? `0${episode.number}` : episode.number}
                </Text>
                <View style={styles.textContainer}>
                    <Text
                        style={[
                            styles.epTitle,
                            { color: themeColors.text },
                            localWatched && styles.watchedText
                        ]}
                        numberOfLines={1}
                    >
                        {episode.title || `Episode ${episode.number}`}
                    </Text>
                    {episode.aired && (
                        <Text style={[styles.epDate, { color: themeColors.textMuted }]}>
                            {new Date(episode.aired).toLocaleDateString()}
                        </Text>
                    )}
                </View>
            </View>
            <View
                style={[
                    styles.checkbox,
                    { borderColor: localWatched ? colors.primary : themeColors.border },
                    localWatched && { backgroundColor: colors.primary }
                ]}
            >
                <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: scaleAnim }}>
                    <Feather name="check" size={14} color="#FFF" />
                </Animated.View>
            </View>
        </TouchableOpacity>
    );
});

export const EpisodeList: React.FC<EpisodeListProps> = React.memo(({ animeId, totalEpisodes, media }) => {
    const themeColors = useThemeColors();
    const [allRawEpisodes, setAllRawEpisodes] = useState<Episode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        AsyncStorage.getItem('animorg_episode_sort').then(val => {
            if (val === 'desc') setSortOrder('desc');
        }).catch(() => { });
    }, []);

    // Progressive lazy rendered list limits to ensure smooth rendering on huge anime (e.g. 1000+ One Piece)
    const [releasedVisibleCount, setReleasedVisibleCount] = useState(50);
    const [totalSeriesEpisodes, setTotalSeriesEpisodes] = useState<number | undefined>(totalEpisodes);

    const { animeProgress, toggleEpisodeWatched, markSeasonWatched } = useAppStore();
    const progress = animeProgress[animeId];
    const watchedEps = progress?.watchedEpisodes || {};

    useEffect(() => {
        fetchEpisodes();
    }, [animeId]);

    const fetchEpisodes = async (forceRefresh = false) => {
        console.log("STEP 1 Anime ID:", animeId);
        setLoading(true);
        setError(null);
        console.log(`[EpisodeList] Starting fetch sequence for Anime ID: ${animeId}, forceRefresh: ${forceRefresh}`);
        try {
            // First paint: resolves from fast local SWR store
            const result = await animeApi.getAnimeEpisodes(animeId, (freshResult) => {
                // Secondary paint: handles silent background SWR update smoothly
                console.log(`[EpisodeList] Background SWR updated. Raw Episode Count: ${freshResult?.data?.length || 0}`);
                if (freshResult?.data) {
                    setAllRawEpisodes(freshResult.data);
                    if (freshResult.totalCount) setTotalSeriesEpisodes(freshResult.totalCount);
                }
            }, forceRefresh);

            console.log(`[EpisodeList] Initial Fetch completed. Raw Episode Count: ${result?.data?.length || 0}`);
            if (result?.data) {
                setAllRawEpisodes(result.data);
                if (result.totalCount) setTotalSeriesEpisodes(result.totalCount);

                // If API succeeds but returns literally 0 episodes for a show that isn't brand new
                if (result.data.length === 0) {
                    setError('No episodes found.');
                }
            } else {
                setError('Failed to fetch episodes.');
            }
        } catch (error) {
            console.error('[EpisodeList] Error loading episodes for Anime ID:', animeId, error);
            // On hard failure, we will clear episodes so the UI can show a retry or error state instead of silent empty
            setAllRawEpisodes([]);
            setError('Failed to load episodes. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Airtight mathematical partitioning of released vs upcoming episodes
    const { releasedEps, upcomingEps } = useMemo(() => {
        const now = Date.now();
        const released: Episode[] = [];
        const upcoming: Episode[] = [];

        const episodes = allRawEpisodes;
        console.log("STEP 5 Episodes Before Filter:", episodes.length);

        allRawEpisodes.forEach(ep => {
            let isReleased = false;

            if (media) {
                const status = media.status?.toLowerCase() || '';
                if (status === 'completed' || status === 'finished airing' || status === 'finished') {
                    isReleased = true;
                } else if (status === 'upcoming' || status === 'not yet aired') {
                    isReleased = false;
                } else {
                    // Check aired field or resolve mathematically
                    if (ep.aired) {
                        isReleased = new Date(ep.aired).getTime() <= now;
                    } else {
                        const releasedCount = getCurrentlyReleasedEpisodesCount(media, now);
                        isReleased = ep.number <= releasedCount;
                    }
                }
            } else {
                if (ep.aired) {
                    isReleased = new Date(ep.aired).getTime() <= now;
                } else {
                    isReleased = true; // Fallback default
                }
            }

            if (isReleased) {
                released.push(ep);
            } else {
                upcoming.push(ep);
            }
        });

        const filteredEpisodes = released;
        console.log("STEP 6 Episodes After Filter:", filteredEpisodes.length);

        return { releasedEps: released, upcomingEps: upcoming };
    }, [allRawEpisodes, media]);

    const watchedCount = Object.values(watchedEps).filter(v => v).length;
    // Strict Release-Aware Progress Calculations
    const totalAvailable = totalSeriesEpisodes || totalEpisodes || (releasedEps.length > watchedCount ? releasedEps.length : watchedCount) || 1;
    const percentage = totalAvailable > 0 ? Math.min(Math.round((watchedCount / totalAvailable) * 100), 100) : 0;

    const handleToggleWatched = React.useCallback((epNumber: number, targetState: boolean) => {
        // Guard interaction validation
        const isEpReleased = releasedEps.some(e => e.number === epNumber);
        if (!isEpReleased) return;

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(
                targetState
                    ? Haptics.NotificationFeedbackType.Success
                    : Haptics.NotificationFeedbackType.Warning
            );
        }
        toggleEpisodeWatched(animeId, epNumber, targetState, totalAvailable, media);
    }, [releasedEps, animeId, totalAvailable, media, toggleEpisodeWatched]);

    const handleMarkAll = () => {
        const releasedNums = releasedEps.map(ep => ep.number);
        if (releasedNums.length === 0) return;

        markSeasonWatched(animeId, releasedNums, totalAvailable, media);
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const statusInfo = useMemo(() => {
        const rawStatus = (media?.status || '').toLowerCase();
        const isFinished = ['finished airing', 'finished', 'completed', 'finished_airing'].includes(rawStatus);

        if (isFinished) {
            if (totalAvailable > 0 && watchedCount >= totalAvailable) {
                return { label: 'Completed', color: '#4CD964' }; // Emerald Green
            } else {
                return { label: 'Finished Airing', color: '#FF3B30' }; // Red
            }
        } else {
            // Airing show
            if (releasedEps.length > 0 && watchedCount >= releasedEps.length) {
                return { label: 'Awaiting', color: '#5AC8FA' }; // Teal blue
            } else {
                return { label: 'Watching', color: '#FF9500' }; // Amber/Orange
            }
        }
    }, [media, releasedEps, watchedCount, totalAvailable]);

    // ⚠️ ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS (React rule of hooks)
    const sortedReleasedEps = useMemo(() => {
        return sortOrder === 'desc' ? [...releasedEps].reverse() : releasedEps;
    }, [releasedEps, sortOrder]);

    const sortedUpcomingEps = useMemo(() => {
        return sortOrder === 'desc' ? [...upcomingEps].reverse() : upcomingEps;
    }, [upcomingEps, sortOrder]);

    const visibleReleasedEps = sortedReleasedEps.slice(0, releasedVisibleCount);
    const renderedEpisodes = visibleReleasedEps;
    console.log("STEP 7 Rendered Episodes:", renderedEpisodes.length);
    const hasMoreReleased = releasedEps.length > releasedVisibleCount;

    // Early returns AFTER all hooks
    if (loading && allRawEpisodes.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator color={colors.primary} size="large" />
            </View>
        );
    }

    // Explicit Error State when episodes fail to load
    if (error && allRawEpisodes.length === 0) {
        return (
            <View style={[styles.container, { padding: spacing.xl, alignItems: 'center' }]}>
                <Feather name="alert-circle" size={32} color={colors.error} style={{ marginBottom: 12 }} />
                <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: 'bold' }}>{error}</Text>
                <Text style={{ color: themeColors.textDim, textAlign: 'center', marginTop: 8 }}>
                    Server might be busy or rate-limited.
                </Text>
                <TouchableOpacity
                    style={{ marginTop: 16, padding: 8, backgroundColor: colors.primary, borderRadius: 8 }}
                    onPress={() => fetchEpisodes(true)}
                >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry Fetching Episodes</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.header}
                onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setIsExpanded(!isExpanded);
                }}
                activeOpacity={0.7}
            >
                <View style={styles.headerLeft}>
                    <Text style={[styles.title, { color: themeColors.text }]}>Episodes</Text>
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.badgeText}>{watchedCount}/{totalAvailable}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '15', borderColor: statusInfo.color }]}>
                        <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    {isExpanded && (
                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation();
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                const next = sortOrder === 'asc' ? 'desc' : 'asc';
                                setSortOrder(next);
                                AsyncStorage.setItem('animorg_episode_sort', next).catch(() => { });
                            }}
                            style={styles.sortToggle}
                            activeOpacity={0.7}
                        >
                            <Feather name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={14} color={themeColors.text} />
                            <Text style={[styles.sortText, { color: themeColors.text }]}>
                                {sortOrder === 'asc' ? 'Oldest' : 'Newest'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    <Feather
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={24}
                        color={themeColors.text}
                    />
                </View>
            </TouchableOpacity>

            {isExpanded && (
                <View style={styles.content}>
                    <View style={styles.statsRow}>
                        <View style={styles.progressBarContainer}>
                            <View style={styles.progressBarBackground}>
                                <Animated.View
                                    style={[
                                        styles.progressBarFill,
                                        { width: `${percentage}%`, backgroundColor: colors.primary }
                                    ]}
                                />
                            </View>
                            <Text style={[styles.progressText, { color: themeColors.textMuted }]}>
                                {percentage}% Completed
                            </Text>
                        </View>
                        {releasedEps.length > 0 && (
                            <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAll}>
                                <Text style={styles.markAllText}>Mark Aired Watched</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* 1. RELEASED EPISODES (WATCHABLE LIST) */}
                    {visibleReleasedEps.length > 0 ? (
                        <View style={{ height: Math.min(visibleReleasedEps.length * 70, Platform.OS === 'web' ? 600 : 450), width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.md, overflow: 'hidden' }}>
                            <FlashList<Episode>
                                data={visibleReleasedEps}
                                {...{ estimatedItemSize: 70 } as any}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={true}
                                keyExtractor={(item) => `released-${item.id}`}
                                renderItem={({ item: episode }) => {
                                    const isWatched = !!watchedEps[episode.number];
                                    return (
                                        <EpisodeItem
                                            episode={episode}
                                            isWatched={isWatched}
                                            themeColors={themeColors}
                                            onToggle={handleToggleWatched}
                                        />
                                    );
                                }}
                            />
                        </View>
                    ) : (
                        allRawEpisodes.length > 0 && upcomingEps.length > 0 && (
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, { color: themeColors.textDim }]}>
                                    No episodes have aired yet.
                                </Text>
                            </View>
                        )
                    )}

                    {/* Progressive load check */}
                    {hasMoreReleased && (
                        <TouchableOpacity
                            style={styles.loadMore}
                            onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setReleasedVisibleCount(prev => prev + 50);
                            }}
                        >
                            <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                                Show More Released (+50)
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* 2. UPCOMING EPISODES SECTION */}
                    {upcomingEps.length > 0 && (
                        <View style={styles.upcomingSection}>
                            <View style={styles.upcomingHeaderRow}>
                                <Feather name="calendar" size={16} color={colors.primary} />
                                <Text style={[styles.upcomingSectionTitle, { color: themeColors.text }]}>
                                    Upcoming Broadcasts
                                </Text>
                            </View>

                            <View style={{ height: Math.min(sortedUpcomingEps.length * 70, 300), width: '100%' }}>
                                <FlashList<Episode>
                                    data={sortedUpcomingEps}
                                    {...{ estimatedItemSize: 70 } as any}
                                    nestedScrollEnabled={true}
                                    showsVerticalScrollIndicator={true}
                                    keyExtractor={(item) => `upcoming-${item.id}`}
                                    renderItem={({ item: episode }) => {
                                        const now = Date.now();
                                        let countdownStr = 'Airing Date TBD';

                                        if (episode.aired) {
                                            const time = new Date(episode.aired).getTime();
                                            const diff = time - now;
                                            if (diff > 0) {
                                                const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
                                                countdownStr = `Releasing in ${days} days (${new Date(episode.aired).toLocaleDateString()})`;
                                            } else {
                                                countdownStr = `Releasing: ${new Date(episode.aired).toLocaleDateString()}`;
                                            }
                                        } else if (media) {
                                            const airTime = getEpisodeAiringTime(media, episode.number);
                                            if (airTime && airTime > now) {
                                                const days = Math.ceil((airTime - now) / (24 * 60 * 60 * 1000));
                                                countdownStr = `Releasing in ${days} days (${new Date(airTime).toLocaleDateString()})`;
                                            }
                                        }

                                        return (
                                            <View
                                                style={[
                                                    styles.episodeItem,
                                                    styles.upcomingEpisodeItem,
                                                    { borderBottomColor: themeColors.border }
                                                ]}
                                            >
                                                <View style={styles.episodeContent}>
                                                    <Text style={[styles.epNumber, { color: themeColors.textMuted }]}>
                                                        {episode.number < 10 ? `0${episode.number}` : episode.number}
                                                    </Text>
                                                    <View style={styles.textContainer}>
                                                        <Text
                                                            style={[
                                                                styles.epTitle,
                                                                { color: themeColors.textDim }
                                                            ]}
                                                            numberOfLines={1}
                                                        >
                                                            {episode.title || `Episode ${episode.number}`}
                                                        </Text>
                                                        <Text style={[styles.epDate, { color: colors.primary }]}>
                                                            {countdownStr}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View
                                                    style={[
                                                        styles.checkbox,
                                                        styles.disabledCheckbox,
                                                        { borderColor: themeColors.border }
                                                    ]}
                                                >
                                                    <Feather name="lock" size={10} color={themeColors.textMuted} />
                                                </View>
                                            </View>
                                        );
                                    }}
                                />
                            </View>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginVertical: spacing.md,
    },
    centerContainer: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginRight: spacing.sm,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        marginLeft: spacing.sm,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    content: {
        paddingTop: spacing.sm,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
    },
    progressBarContainer: {
        flex: 1,
        marginRight: spacing.md,
    },
    progressBarBackground: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressBarFill: {
        height: '100%',
    },
    progressText: {
        fontSize: 12,
    },
    markAllBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: borderRadius.sm,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    markAllText: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    episodeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
    },
    episodeContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    epNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        width: 30,
        marginRight: spacing.sm,
    },
    textContainer: {
        flex: 1,
    },
    epTitle: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 2,
    },
    watchedText: {
        opacity: 0.5,
        textDecorationLine: 'line-through',
    },
    epDate: {
        fontSize: 12,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: spacing.sm,
    },
    loadMore: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    loadMoreText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    emptyContainer: {
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
    upcomingSection: {
        marginTop: spacing.xl,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: spacing.lg,
    },
    upcomingHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
    },
    upcomingSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.2,
    },
    upcomingEpisodeItem: {
        opacity: 0.6,
    },
    disabledCheckbox: {
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sortToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        gap: 4,
    },
    sortText: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    }
});
