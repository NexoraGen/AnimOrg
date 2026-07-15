import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    useWindowDimensions
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { FlashList } from '@shopify/flash-list';
import { useAppStore } from '../../store/useAppStore';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SectionHeader } from '../ui';
import { getCurrentlyReleasedEpisodesCount, getEpisodeAiringTime, resolveAnimeTrackingStatus } from '../../utils/releaseHelper';
import { notificationService } from '../../services/notifications';
import { Media } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AwaitingAnimeCard = React.memo(({ progress, themeColors, userTimezone, router, onReleased }: any) => {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (!progress.timestamp) return;
        const timer = setInterval(() => {
            const current = Date.now();
            setNow(current);
            if (current >= progress.timestamp) {
                onReleased();
            }
        }, 60000);
        return () => clearInterval(timer);
    }, [progress.timestamp, onReleased]);

    const timestamp = progress.timestamp;
    let countdownStr = 'Release date not confirmed';
    let formattedTime = '';

    if (timestamp) {
        const diffMs = timestamp - now;
        if (diffMs > 0) {
            const diffMinutes = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMinutes / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffDays > 0) {
                countdownStr = `Releases in ${diffDays}d ${diffHours % 24}h`;
            } else if (diffHours > 0) {
                countdownStr = `Releases in ${diffHours}h ${diffMinutes % 60}m`;
            } else {
                countdownStr = `Releases in ${diffMinutes}m`;
            }

            const targetDate = new Date(timestamp);
            try {
                const targetTz = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
                const tz = targetTz.includes('/') ? targetTz : undefined;
                const weekdayStr = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: tz }).format(targetDate);
                const timeStr = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(targetDate);
                formattedTime = `${weekdayStr} • ${timeStr}`;
            } catch (e) {
                const weekdayStr = targetDate.toLocaleDateString(undefined, { weekday: 'long' });
                const timeStr = targetDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                formattedTime = `${weekdayStr} • ${timeStr}`;
            }
        } else {
            countdownStr = 'Releasing soon';
            formattedTime = 'Release date passed';
        }
    }

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.03)' }]}
            onPress={() => router.push(`/details/${progress.animeId}`)}
            activeOpacity={0.8}
        >
            <Image
                source={progress.posterPath ? { uri: progress.posterPath } : { uri: 'https://images.unsplash.com/photo-1578632738908-48c104e8d89e?q=80&w=600' }}
                style={styles.poster}
                contentFit="cover"
                cachePolicy="memory-disk"
            />
            <View style={styles.info}>
                <Text style={[styles.animeTitle, { color: themeColors.text }]} numberOfLines={2}>
                    {progress.title}
                </Text>
                <View style={styles.progressRow}>
                    <Text style={[styles.nextEp, { color: '#5AC8FA' }]}>
                        Episode {progress.nextEpisode}
                    </Text>
                    {formattedTime ? (
                        <>
                            <View style={styles.dot} />
                            <Text style={[styles.status, { color: themeColors.textDim }]} numberOfLines={1}>
                                {formattedTime}
                            </Text>
                        </>
                    ) : null}
                </View>
                <View style={[styles.timeBadgeContainer, { marginTop: 0 }]}>
                    <Text style={[styles.timeBadgeText, { color: themeColors.textDim }]} numberOfLines={1}>
                        {countdownStr}
                    </Text>
                </View>
            </View>
            <View style={styles.playBtnContainer}>
                <View style={[styles.playBtn, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                    <Feather name="bell" size={14} color={themeColors.textDim} />
                </View>
            </View>
        </TouchableOpacity>
    );
});

export const WatchNextSection: React.FC = React.memo(() => {
    const themeColors = useThemeColors();
    const router = useRouter();
    // Individual selectors to prevent full-store rerender cascades
    const user = useAppStore(s => s.user);
    const animeProgress = useAppStore(s => s.animeProgress);
    const watchlist = useAppStore(s => s.watchlist);
    const updateWatchlistStatus = useAppStore(s => s.updateWatchlistStatus);
    const isAuthenticated = useAppStore(s => s.isAuthenticated);
    const [renderTick, setRenderTick] = useState(0);
    const [upcomingSeasonsList, setUpcomingSeasonsList] = useState<any[]>([]);
    const [airingList, setAiringList] = useState<any[]>([]);
    const [scheduledMap, setScheduledMap] = useState<Record<string, number>>({});
    const healedIdsRef = useRef<Set<string>>(new Set());

    const handleReleased = React.useCallback(() => {
        setRenderTick(t => t + 1);
    }, []);

    // Load upcoming sequels cache for Completed checking, and true airing schedule for mathematical validation
    useEffect(() => {
        const readCaches = async () => {
            try {
                const [upcomingCache, airingCache, scheduledCache] = await Promise.all([
                    AsyncStorage.getItem('animorg_upcoming_seasons_cache'),
                    AsyncStorage.getItem('animorg_seasonal_airing_schedule_v2'),
                    AsyncStorage.getItem('animorg_scheduled_notifications')
                ]);

                if (upcomingCache) {
                    const parsed = JSON.parse(upcomingCache);
                    setUpcomingSeasonsList(parsed.anime || []);
                }

                if (airingCache) {
                    const parsed = JSON.parse(airingCache);
                    setAiringList(parsed.anime || []);
                }

                if (scheduledCache) {
                    setScheduledMap(JSON.parse(scheduledCache));
                }
            } catch (e) {
                // Silent fail for cache read
            }
        };
        readCaches();
    }, []);

    // ═══════════════════════════════════════════════════════════════
    // MEMOIZED LIST COMPUTATION — prevents recalculation on every render
    // ═══════════════════════════════════════════════════════════════
    const { continueWatchingList, awaitingList, upcomingList, statusFixQueue } = useMemo(() => {
        if (!isAuthenticated) return { continueWatchingList: [], awaitingList: [], upcomingList: [], statusFixQueue: [] as { mediaId: string; status: string }[] };

        const now = Date.now();
        const cwList: any[] = [];
        const awList: any[] = [];
        const upList: any[] = [];
        const fixQueue: { mediaId: string; status: string }[] = [];

        watchlist.forEach(animeItem => {
            const wId = String(animeItem.mediaId);
            const progress = animeProgress[wId] || { lastWatchedEpisode: 0, status: 'watching' };
            const lastWatched = progress.lastWatchedEpisode || 0;

            const airingCacheItem = airingList.find(a => String(a.id) === wId);

            let resolvedStatus = 'Currently Airing';
            if (airingCacheItem) {
                resolvedStatus = airingCacheItem.status || 'Currently Airing';
            } else if (animeItem.mediaStatus) {
                resolvedStatus = animeItem.mediaStatus;
            } else {
                const isFinished = (animeItem.episodes || 0) > 0 && lastWatched >= (animeItem.episodes || 0);
                resolvedStatus = isFinished ? 'Finished Airing' : 'Currently Airing';
            }

            const mediaInstance: Media = {
                id: animeItem.mediaId,
                title: animeItem.title,
                description: '',
                posterPath: animeItem.posterPath || '',
                backdropPath: animeItem.backdropPath || '',
                status: resolvedStatus,
                episodes: animeItem.episodes || 0,
                airing_start: airingCacheItem?.airing_start || animeItem.airing_start,
                broadcast: airingCacheItem?.broadcast || animeItem.broadcast,
                genres: animeItem.genres || [],
                type: 'anime'
            };

            const releasedCount = getCurrentlyReleasedEpisodesCount(mediaInstance, now);

            // Determine correct tracking status using central resolveAnimeTrackingStatus function
            const expectedStatus = resolveAnimeTrackingStatus({
                mediaStatus: resolvedStatus,
                totalEpisodes: animeItem.episodes || 0,
                watchedCount: lastWatched,
                releasedCount,
            });

            if (animeItem.status !== expectedStatus) {
                fixQueue.push({ mediaId: animeItem.mediaId, status: expectedStatus });
            }

            const effectiveStatus = expectedStatus;
            const isFinishedAnime = effectiveStatus === 'completed';

            // If the anime is completed, check if there's a sequel/new season announced
            if (effectiveStatus === 'completed') {
                const matchTitle = animeItem.title.toLowerCase().trim();
                const sequel = upcomingSeasonsList.find(up => {
                    const upTitle = up.title.toLowerCase().trim();
                    return upTitle.includes(matchTitle) && up.id !== wId;
                });

                if (sequel && sequel.airing_start) {
                    const premTime = new Date(sequel.airing_start).getTime();
                    const diffDays = Math.ceil((premTime - now) / (24 * 60 * 60 * 1000));

                    if (diffDays > 0) {
                        upList.push({
                            id: sequel.id,
                            title: sequel.title,
                            posterPath: sequel.posterPath || animeItem.posterPath,
                            statusText: `New Season: Premiere Date ${new Date(sequel.airing_start).toLocaleDateString()}`,
                            countdown: `Premiering in ${diffDays} days`,
                            nextEp: 'Sequel'
                        });
                    }
                }
                return;
            }

            if (lastWatched < releasedCount) {
                const nextEpNum = lastWatched + 1;
                cwList.push({
                    animeId: wId,
                    title: animeItem.title,
                    posterPath: animeItem.posterPath,
                    lastWatchedEpisode: lastWatched,
                    nextEpisode: nextEpNum,
                    progressFraction: releasedCount > 0 ? lastWatched / releasedCount : 0,
                    releasedCount: releasedCount
                });
            } else if (!isFinishedAnime && lastWatched >= releasedCount) {
                const nextEpNum = lastWatched + 1;
                const airingTime = getEpisodeAiringTime(mediaInstance, nextEpNum);

                if (airingTime && airingTime > now) {
                    awList.push({
                        animeId: wId,
                        title: animeItem.title,
                        posterPath: animeItem.posterPath,
                        nextEpisode: nextEpNum,
                        timestamp: airingTime
                    });
                } else {
                    awList.push({
                        animeId: wId,
                        title: animeItem.title,
                        posterPath: animeItem.posterPath,
                        nextEpisode: nextEpNum,
                        timestamp: null
                    });
                }
            }
        });

        awList.sort((a, b) => {
            if (!a.timestamp && !b.timestamp) return 0;
            if (!a.timestamp) return 1;
            if (!b.timestamp) return -1;
            return a.timestamp - b.timestamp;
        });

        return { continueWatchingList: cwList, awaitingList: awList, upcomingList: upList, statusFixQueue: fixQueue };
    }, [watchlist, animeProgress, airingList, upcomingSeasonsList, renderTick, isAuthenticated]);

    // ═══════════════════════════════════════════════════════════════
    // DEFERRED STATUS FIXES — runs AFTER render, preventing infinite loops
    // ═══════════════════════════════════════════════════════════════
    useEffect(() => {
        const unfixed = statusFixQueue.filter(fix => !healedIdsRef.current.has(fix.mediaId));
        if (unfixed.length === 0) return;

        // Trace and remember healed ids to block sync loops in same session
        unfixed.forEach(fix => healedIdsRef.current.add(fix.mediaId));

        // Use a microtask to batch all status fixes after the current render cycle
        const timer = setTimeout(() => {
            unfixed.forEach(fix => {
                updateWatchlistStatus(fix.mediaId, fix.status as any);
            });
        }, 100);
        return () => clearTimeout(timer);
    }, [statusFixQueue]);

    // Schedule background native notifications if not already scheduled
    useEffect(() => {
        let hasChanges = false;
        const newMap = { ...scheduledMap };

        awaitingList.forEach(item => {
            if (newMap[item.animeId] !== item.nextEpisode) {
                if (item.timestamp > Date.now()) {
                    notificationService.scheduleAiringNotification(item.animeId, item.title, item.nextEpisode, new Date(item.timestamp)).catch(() => { });
                    newMap[item.animeId] = item.nextEpisode;
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            setScheduledMap(newMap);
            AsyncStorage.setItem('animorg_scheduled_notifications', JSON.stringify(newMap)).catch(() => { });
        }
    }, [JSON.stringify(awaitingList.map(a => `${a.animeId}-${a.nextEpisode}`))]);

    if (!isAuthenticated) return null;
    const hasAnyContent = continueWatchingList.length > 0 || awaitingList.length > 0 || upcomingList.length > 0;
    if (!hasAnyContent) return null;

    return (
        <View style={styles.container}>
            {/* 1. segment A: Continue Watching Decks */}
            {continueWatchingList.length > 0 && (
                <View style={styles.sectionWrapper}>
                    <SectionHeader
                        title="Continue Watching"
                        subtitle="Pick up where you left off"
                        onViewAll={() => router.push('/category/continue-watching')}
                    />
                    <FlashList
                        data={continueWatchingList}
                        keyExtractor={(item) => `cw-${item.animeId}`}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        // @ts-ignore
                        estimatedItemSize={296}
                        removeClippedSubviews={true}
                        // @ts-ignore
                        initialNumToRender={4}
                        snapToInterval={296}
                        snapToAlignment="start"
                        decelerationRate="fast"
                        scrollEventThrottle={16}
                        renderItem={({ item: progress }) => (
                            <TouchableOpacity
                                style={[styles.card, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.03)' }]}
                                onPress={() => router.push(`/details/${progress.animeId}`)}
                                activeOpacity={0.8}
                            >
                                <Image
                                    source={progress.posterPath ? { uri: progress.posterPath } : { uri: 'https://images.unsplash.com/photo-1578632738908-48c104e8d89e?q=80&w=600' }}
                                    style={styles.poster}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                />
                                <View style={styles.info}>
                                    <Text style={[styles.animeTitle, { color: themeColors.text }]} numberOfLines={2}>
                                        {progress.title}
                                    </Text>
                                    <View style={styles.progressRow}>
                                        <Text style={[styles.nextEp, { color: colors.primary }]}>
                                            Ep {progress.nextEpisode}
                                        </Text>
                                        <View style={styles.dot} />
                                        <Text style={[styles.status, { color: themeColors.textDim }]}>
                                            {progress.lastWatchedEpisode} Watched
                                        </Text>
                                    </View>
                                    <View style={styles.progressBarBg}>
                                        <View
                                            style={[
                                                styles.progressBarFill,
                                                {
                                                    backgroundColor: colors.primary,
                                                    width: `${Math.min(progress.progressFraction * 100, 100)}%`
                                                }
                                            ]}
                                        />
                                    </View>
                                </View>
                                <View style={styles.playBtnContainer}>
                                    <View style={[styles.playBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                                        <Feather name="play" size={14} color="#FFF" />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            {/* 2. segment B: Caught Up ongoing counting */}
            {awaitingList.length > 0 && (
                <View style={styles.sectionWrapper}>
                    <SectionHeader
                        title="Awaiting Next Episode"
                        subtitle="Caught up ongoing scheduled broadcasts"
                        onViewAll={() => router.push('/category/schedule')}
                    />
                    <FlashList
                        data={awaitingList}
                        keyExtractor={(item) => `await-${item.animeId}`}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        // @ts-ignore
                        estimatedItemSize={296}
                        removeClippedSubviews={true}
                        // @ts-ignore
                        initialNumToRender={3}
                        snapToInterval={296}
                        snapToAlignment="start"
                        decelerationRate="fast"
                        scrollEventThrottle={16}
                        renderItem={({ item: progress }) => (
                            <AwaitingAnimeCard
                                progress={progress}
                                themeColors={themeColors}
                                userTimezone={user?.timezone}
                                router={router}
                                onReleased={handleReleased}
                            />
                        )}
                    />
                </View>
            )}

            {/* 3. segment C: Upcoming sequels checks */}
            {upcomingList.length > 0 && (
                <View style={styles.sectionWrapper}>
                    <SectionHeader
                        title="Upcoming Seasons"
                        subtitle="New confirmed sequel releases"
                        onViewAll={() => router.push('/category/upcoming')}
                    />
                    <FlashList
                        data={upcomingList}
                        keyExtractor={(item) => `sequel-${item.id}`}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        // @ts-ignore
                        estimatedItemSize={296}
                        removeClippedSubviews={true}
                        // @ts-ignore
                        initialNumToRender={3}
                        snapToInterval={296}
                        snapToAlignment="start"
                        decelerationRate="fast"
                        scrollEventThrottle={16}
                        renderItem={({ item: progress }) => (
                            <TouchableOpacity
                                style={[styles.card, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.03)' }]}
                                onPress={() => router.push(`/details/${progress.id}`)}
                                activeOpacity={0.8}
                            >
                                <Image
                                    source={progress.posterPath ? { uri: progress.posterPath } : { uri: 'https://images.unsplash.com/photo-1578632738908-48c104e8d89e?q=80&w=600' }}
                                    style={styles.poster}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                />
                                <View style={styles.info}>
                                    <Text style={[styles.animeTitle, { color: themeColors.text }]} numberOfLines={2}>
                                        {progress.title}
                                    </Text>
                                    <View style={styles.progressRow}>
                                        <Text style={[styles.nextEp, { color: '#FFD700' }]}>
                                            {progress.nextEp}
                                        </Text>
                                        <View style={styles.dot} />
                                        <Text style={[styles.status, { color: themeColors.textDim }]} numberOfLines={1}>
                                            {progress.countdown}
                                        </Text>
                                    </View>
                                    <View style={styles.timeBadgeContainer}>
                                        <Feather name="star" size={11} color="#FFD700" />
                                        <Text style={[styles.timeBadgeText, { color: themeColors.textDim }]} numberOfLines={1}>
                                            {progress.statusText}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    sectionWrapper: {
        marginBottom: spacing.XL,
    },
    scrollContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    card: {
        width: 280,
        height: 100,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        marginRight: spacing.md,
        flexDirection: 'row',
        overflow: 'hidden',
        alignItems: 'center',
    },
    poster: {
        width: 76,
        height: '100%',
    },
    info: {
        flex: 1,
        padding: spacing.md,
        justifyContent: 'center',
    },
    animeTitle: {
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 6,
        letterSpacing: -0.2,
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    nextEp: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 6,
    },
    status: {
        fontSize: 12,
        fontWeight: '600',
    },
    progressBarBg: {
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 1.5,
        width: '100%',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 1.5,
    },
    playBtnContainer: {
        paddingRight: spacing.md,
        justifyContent: 'center',
    },
    playBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
    },
    timeBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    timeBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    pillBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        borderWidth: 1,
    },
    pillText: {
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    }
});
