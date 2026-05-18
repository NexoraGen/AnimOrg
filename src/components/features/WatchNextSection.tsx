import React, { useState, useEffect } from 'react';
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
import { useAppStore } from '../../store/useAppStore';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SectionHeader } from '../ui';
import { getCurrentlyReleasedEpisodesCount, getEpisodeAiringTime } from '../../utils/releaseHelper';
import { notificationService } from '../../services/notifications';
import { Media } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const WatchNextSection: React.FC = () => {
    const themeColors = useThemeColors();
    const router = useRouter();
    const { animeProgress, watchlist, updateWatchlistStatus, isAuthenticated } = useAppStore();
    const [tick, setTick] = useState(0);
    const [upcomingSeasonsList, setUpcomingSeasonsList] = useState<any[]>([]);
    const [airingList, setAiringList] = useState<any[]>([]);
    const [scheduledMap, setScheduledMap] = useState<Record<string, number>>({});

    useEffect(() => {
        const timer = setInterval(() => {
            setTick(prev => prev + 1);
        }, 30000); // 30s relative count updates
        return () => clearInterval(timer);
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
                console.warn('[WatchNext] Cache loading exception:', e);
            }
        };
        readCaches();
    }, []);

    if (!isAuthenticated) return null;

    const now = Date.now();
    const continueWatchingList: any[] = [];
    const awaitingList: any[] = [];
    const upcomingList: any[] = [];

    // Filter active watchlist candidates: Watching / Plan to Watch / Completed
    watchlist.forEach(animeItem => {
        const wId = String(animeItem.mediaId);
        const progress = animeProgress[wId] || { lastWatchedEpisode: 0, status: 'watching' };
        const lastWatched = progress.lastWatchedEpisode || 0;

        // Auto-heal background finished status
        const isFinishedAnime = (animeItem.episodes || 0) > 0 && lastWatched >= (animeItem.episodes || 0);
        if (isFinishedAnime && animeItem.status !== 'completed') {
            console.log(`[AutoWatch] Moving completed item: ${animeItem.title} to completed list.`);
            updateWatchlistStatus(animeItem.mediaId, 'completed');
            return;
        }

        const airingCacheItem = airingList.find(a => String(a.id) === wId);

        let resolvedStatus = 'Currently Airing';
        if (airingCacheItem) {
            resolvedStatus = airingCacheItem.status || 'Currently Airing';
        } else if (animeItem.mediaStatus) {
            resolvedStatus = animeItem.mediaStatus;
        } else {
            // Uncached offline fallback
            const isFinished = (animeItem.episodes || 0) > 0 && lastWatched >= (animeItem.episodes || 0);
            resolvedStatus = isFinished ? 'Finished Airing' : 'Currently Airing';
        }

        // Map media model format for rigorous mathematical release calculator
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

        // If the anime is completed, check if there's a sequel/new season announced
        if (animeItem.status === 'completed' || isFinishedAnime) {
            const matchTitle = animeItem.title.toLowerCase().trim();
            const sequel = upcomingSeasonsList.find(up => {
                const upTitle = up.title.toLowerCase().trim();
                return upTitle.includes(matchTitle) && up.id !== wId;
            });

            if (sequel && sequel.airing_start) {
                const premTime = new Date(sequel.airing_start).getTime();
                const diffDays = Math.ceil((premTime - now) / (24 * 60 * 60 * 1000));

                if (diffDays > 0) {
                    upcomingList.push({
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

        // Calculate released episodes
        const releasedCount = getCurrentlyReleasedEpisodesCount(mediaInstance, now);

        if (lastWatched < releasedCount) {
            // Segment A: Continue Watching (episodes available now!)
            const nextEpNum = lastWatched + 1;
            continueWatchingList.push({
                animeId: wId,
                title: animeItem.title,
                posterPath: animeItem.posterPath,
                lastWatchedEpisode: lastWatched,
                nextEpisode: nextEpNum,
                progressFraction: releasedCount > 0 ? lastWatched / releasedCount : 0,
                releasedCount: releasedCount
            });
        } else if (animeItem.broadcast && animeItem.broadcast.day) {
            // Segment B: Awaiting Next Episode (caught up ongoing)
            const nextEpNum = lastWatched + 1;
            const airingTime = getEpisodeAiringTime(mediaInstance, nextEpNum);

            if (airingTime && airingTime > now) {
                const diffMs = airingTime - now;
                const diffMinutes = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMinutes / 60);
                const diffDays = Math.floor(diffHours / 24);

                let countdownStr = '';
                if (diffDays > 0) {
                    countdownStr = `${diffDays}d ${diffHours % 24}h`;
                } else if (diffHours > 0) {
                    countdownStr = `${diffHours}h ${diffMinutes % 60}m`;
                } else {
                    countdownStr = `${diffMinutes}m`;
                }

                const targetDate = new Date(airingTime);
                const formattedTime = targetDate.toLocaleTimeString(undefined, {
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                awaitingList.push({
                    animeId: wId,
                    title: animeItem.title,
                    posterPath: animeItem.posterPath,
                    nextEpisode: nextEpNum,
                    countdown: `Releasing in ${countdownStr}`,
                    releaseTime: formattedTime,
                    timestamp: airingTime
                });
            }
        }
    });

    // Chronological order sorting
    awaitingList.sort((a, b) => a.timestamp - b.timestamp);

    // Schedule background native notifications if not already scheduled
    useEffect(() => {
        let hasChanges = false;
        const newMap = { ...scheduledMap };

        awaitingList.forEach(item => {
            if (newMap[item.animeId] !== item.nextEpisode) {
                // Future timestamp protection
                if (item.timestamp > Date.now()) {
                    notificationService.scheduleAiringNotification(item.animeId, item.title, item.nextEpisode, new Date(item.timestamp)).catch(console.warn);
                    newMap[item.animeId] = item.nextEpisode;
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            setScheduledMap(newMap);
            AsyncStorage.setItem('animorg_scheduled_notifications', JSON.stringify(newMap)).catch(console.warn);
        }
    }, [JSON.stringify(awaitingList.map(a => `${a.animeId}-${a.nextEpisode}`))]);

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
                    />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {continueWatchingList.map((progress) => (
                            <TouchableOpacity
                                key={`cw-${progress.animeId}`}
                                style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                                onPress={() => router.push(`/details/${progress.animeId}`)}
                                activeOpacity={0.8}
                            >
                                <Image
                                    source={progress.posterPath ? { uri: progress.posterPath } : { uri: 'https://images.unsplash.com/photo-1578632738908-48c104e8d89e?q=80&w=600' }}
                                    style={styles.poster}
                                    contentFit="cover"
                                />
                                <View style={styles.info}>
                                    <Text style={[styles.animeTitle, { color: themeColors.text }]} numberOfLines={1}>
                                        {progress.title}
                                    </Text>
                                    <View style={styles.progressRow}>
                                        <Text style={[styles.nextEp, { color: colors.primary }]}>
                                            Episode {progress.nextEpisode}
                                        </Text>
                                        <View style={styles.dot} />
                                        <Text style={[styles.status, { color: themeColors.textDim }]}>
                                            {progress.lastWatchedEpisode} watched
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
                                <View style={[styles.playBtn, { backgroundColor: colors.primary }]}>
                                    <Feather name="play" size={16} color="#FFF" fill="#FFF" />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* 2. segment B: Caught Up ongoing counting */}
            {awaitingList.length > 0 && (
                <View style={styles.sectionWrapper}>
                    <SectionHeader
                        title="Awaiting Next Episode"
                        subtitle="Caught up ongoing scheduled broadcasts"
                    />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {awaitingList.map((progress) => (
                            <TouchableOpacity
                                key={`await-${progress.animeId}`}
                                style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                                onPress={() => router.push(`/details/${progress.animeId}`)}
                                activeOpacity={0.8}
                            >
                                <Image
                                    source={progress.posterPath ? { uri: progress.posterPath } : { uri: 'https://images.unsplash.com/photo-1578632738908-48c104e8d89e?q=80&w=600' }}
                                    style={styles.poster}
                                    contentFit="cover"
                                />
                                <View style={styles.info}>
                                    <Text style={[styles.animeTitle, { color: themeColors.text }]} numberOfLines={1}>
                                        {progress.title}
                                    </Text>
                                    <View style={styles.progressRow}>
                                        <Text style={[styles.nextEp, { color: '#4CD964' }]}>
                                            Episode {progress.nextEpisode}
                                        </Text>
                                        <View style={styles.dot} />
                                        <Text style={[styles.status, { color: themeColors.textDim }]} numberOfLines={1}>
                                            {progress.countdown}
                                        </Text>
                                    </View>
                                    <View style={styles.timeBadgeContainer}>
                                        <Feather name="clock" size={10} color={themeColors.textDim} />
                                        <Text style={[styles.timeBadgeText, { color: themeColors.textDim }]} numberOfLines={1}>
                                            {progress.releaseTime}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[styles.playBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                                    <Feather name="bell" size={16} color={themeColors.textDim} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* 3. segment C: Upcoming sequels checks */}
            {upcomingList.length > 0 && (
                <View style={styles.sectionWrapper}>
                    <SectionHeader
                        title="Upcoming Seasons"
                        subtitle="New confirmed sequel releases"
                    />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {upcomingList.map((progress) => (
                            <TouchableOpacity
                                key={`sequel-${progress.id}`}
                                style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                                onPress={() => router.push(`/details/${progress.id}`)}
                                activeOpacity={0.8}
                            >
                                <Image
                                    source={progress.posterPath ? { uri: progress.posterPath } : { uri: 'https://images.unsplash.com/photo-1578632738908-48c104e8d89e?q=80&w=600' }}
                                    style={styles.poster}
                                    contentFit="cover"
                                />
                                <View style={styles.info}>
                                    <Text style={[styles.animeTitle, { color: themeColors.text }]} numberOfLines={1}>
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
                                        <Feather name="star" size={10} color="#FFD700" />
                                        <Text style={[styles.timeBadgeText, { color: themeColors.textDim }]} numberOfLines={1}>
                                            {progress.statusText}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    sectionWrapper: {
        marginBottom: spacing.xxl,
    },
    scrollContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    card: {
        width: 290,
        height: 106,
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
        padding: spacing.sm,
        justifyContent: 'center',
    },
    animeTitle: {
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 4,
        letterSpacing: -0.3,
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
        fontSize: 11,
    },
    progressBarBg: {
        height: 3.5,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 1.5,
        width: '100%',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 1.5,
    },
    playBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        elevation: 4,
    },
    timeBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    timeBadgeText: {
        fontSize: 10,
        fontWeight: '600',
    }
});
