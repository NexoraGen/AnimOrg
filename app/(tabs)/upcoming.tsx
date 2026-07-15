import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    Platform,
    useWindowDimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, colors, borderRadius } from '../../src/theme';
import { Media } from '../../src/types';
import { animeApi } from '../../src/services/animeApi';
import { SkeletonLoader, StreamingHeader } from '../../src/components/ui';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { TrackedAnimeCard } from '../../src/components/features/TrackedAnimeCard';
import { EmptyTrackedState } from '../../src/components/features/EmptyTrackedState';
import { getNextEpisode, getLocalAiringInfo } from '../../src/utils/releaseHelper';
import { AiringAnimeCard } from '../../src/components/features/AiringAnimeCard';
import { useAppStore } from '../../src/store/useAppStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SwipeableTabs } from '../../src/components/layout/SwipeableTabs';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT: Record<string, string> = {
    Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
    Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun'
};

import { FlashList } from '@shopify/flash-list';

interface UpcomingDayFeedProps {
    day: string;
    dayAnime: any[];
    animeProgress: any;
    numColumns: number;
    cardWidth: number;
    edgePadding: number;
    itemGap: number;
    router: any;
    themeColors: any;
    refreshing: boolean;
    onRefresh: () => void;
    totalTracked: number;
    totalAiringCount: number;
}

const UpcomingDayFeed: React.FC<UpcomingDayFeedProps> = React.memo(({
    day,
    dayAnime,
    animeProgress,
    numColumns,
    cardWidth,
    edgePadding,
    itemGap,
    router,
    themeColors,
    refreshing,
    onRefresh,
    totalTracked,
    totalAiringCount
}) => {
    if (dayAnime.length === 0) {
        return (
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                <View style={styles.emptyDay}>
                    <View style={[styles.emptyDayIcon, { backgroundColor: `${colors.primary}12` }]}>
                        <Feather name="calendar" size={36} color={colors.primary} />
                    </View>
                    <Text style={[styles.emptyDayTitle, { color: themeColors.text }]}>
                        No Anime on {day}
                    </Text>
                    <Text style={[styles.emptyDaySub, { color: themeColors.textDim }]}>
                        Check other days for scheduled releases
                    </Text>
                </View>
            </ScrollView>
        );
    }

    return (
        <FlashList<any>
            data={dayAnime}
            numColumns={numColumns}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 120, paddingHorizontal: edgePadding }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            {...{ estimatedItemSize: 220 } as any}
            renderItem={({ item }) => {
                const progress = animeProgress[item.id] || { lastWatchedEpisode: 0 };
                const nextEp = getNextEpisode(item, progress.lastWatchedEpisode);
                return (
                    <View style={[styles.gridItem, { width: cardWidth, marginRight: itemGap }]}>
                        <AiringAnimeCard
                            anime={item}
                            width={cardWidth}
                            nextEpisode={`Episode ${nextEp}`}
                            onPress={(id) => router.push(`/details/${id}`)}
                        />
                    </View>
                );
            }}
            ListFooterComponent={() => (
                <View style={styles.footerStatsContainer}>
                    <LinearGradient
                        colors={['rgba(229, 9, 20, 0.08)', 'rgba(229, 9, 20, 0.02)']}
                        style={styles.footerStatsCard}
                    >
                        <View style={[styles.footerBorderLine, { backgroundColor: colors.primary }]} />
                        <View style={styles.heroStats}>
                            <View style={styles.heroStat}>
                                <Text style={[styles.heroStatNum, { color: colors.primary }]}>
                                    {totalAiringCount}
                                </Text>
                                <Text style={[styles.heroStatSub, { color: themeColors.textDim }]}>airing</Text>
                            </View>
                            <View style={[styles.heroStatDivider, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
                            <View style={styles.heroStat}>
                                <Text style={[styles.heroStatNum, { color: '#4CD964' }]}>
                                    {dayAnime.length}
                                </Text>
                                <Text style={[styles.heroStatSub, { color: themeColors.textDim }]}>today</Text>
                            </View>
                            <View style={[styles.heroStatDivider, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
                            <View style={styles.heroStat}>
                                <Text style={[styles.heroStatNum, { color: '#FFD700' }]}>
                                    {totalTracked}
                                </Text>
                                <Text style={[styles.heroStatSub, { color: themeColors.textDim }]}>tracked</Text>
                            </View>
                        </View>
                    </LinearGradient>
                    <Text style={[styles.footerCopyright, { color: themeColors.textDim }]}>
                        AnimOrg Release Hub • Updated Live
                    </Text>
                </View>
            )}
        />
    );
}, (prevProps, nextProps) => {
    if (prevProps.day !== nextProps.day) return false;
    if (prevProps.numColumns !== nextProps.numColumns) return false;
    if (prevProps.cardWidth !== nextProps.cardWidth) return false;
    if (prevProps.edgePadding !== nextProps.edgePadding) return false;
    if (prevProps.itemGap !== nextProps.itemGap) return false;
    if (prevProps.refreshing !== nextProps.refreshing) return false;
    if (prevProps.totalTracked !== nextProps.totalTracked) return false;
    if (prevProps.totalAiringCount !== nextProps.totalAiringCount) return false;
    if (prevProps.themeColors !== nextProps.themeColors) return false;

    // Check if dayAnime lists are shallowly identical
    if (prevProps.dayAnime !== nextProps.dayAnime) {
        if (prevProps.dayAnime.length !== nextProps.dayAnime.length) return false;
        for (let i = 0; i < prevProps.dayAnime.length; i++) {
            if (prevProps.dayAnime[i].id !== nextProps.dayAnime[i].id) return false;
            if (prevProps.dayAnime[i].nextAiringEpisode?.episode !== nextProps.dayAnime[i].nextAiringEpisode?.episode) return false;
        }
    }

    // Check progress of items in this specific day
    for (const anime of prevProps.dayAnime) {
        if (prevProps.animeProgress[anime.id] !== nextProps.animeProgress[anime.id]) return false;
    }

    return true;
});

export default function UpcomingScreen() {
    const themeColors = useThemeColors();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    // Individual selectors to prevent full-store rerender cascades
    const watchlist = useAppStore(s => s.watchlist);
    const animeProgress = useAppStore(s => s.animeProgress);
    const isAuthenticated = useAppStore(s => s.isAuthenticated);
    const user = useAppStore(s => s.user);
    const use24Hour = useAppStore(s => s.use24Hour);

    const [selectedDay, setSelectedDay] = useState('');
    const [allAnime, setAllAnime] = useState<Media[]>([]);

    const [releasingSoon, setReleasingSoon] = useState<any[]>([]);
    const [thisWeek, setThisWeek] = useState<any[]>([]);
    const [upcomingSeasons, setUpcomingSeasons] = useState<any[]>([]);
    const [awaitingSchedule, setAwaitingSchedule] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tick, setTick] = useState(0);

    const numColumns = width > 1024 ? 5 : width > 768 ? 4 : 2;
    const edgePadding = spacing.xl;
    const itemGap = spacing.md;
    const cardWidth = (width - (edgePadding * 2) - (itemGap * (numColumns - 1))) / numColumns;

    const todayName = useMemo(() => {
        const d = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return d[new Date().getDay()];
    }, []);

    useEffect(() => { setSelectedDay(todayName); }, [todayName]);
    const hasHydrated = useAppStore(s => s.hasHydrated);

    useEffect(() => { if (hasHydrated) fetchAllData(false); }, [watchlist, isAuthenticated, hasHydrated]);
    useEffect(() => {
        const timer = setInterval(() => setTick(p => p + 1), 60000); // 60s (was 30s)
        return () => clearInterval(timer);
    }, []);
    useEffect(() => {
        if (allAnime.length > 0) syncTrackedReleases(allAnime);
    }, [allAnime, watchlist, animeProgress, tick]);

    // ═══════════════════════════════════════════════════════
    //  TRACKING LOGIC (preserved exactly)
    // ═══════════════════════════════════════════════════════
    const syncTrackedReleases = async (fullSchedule: Media[], upcomingSeasonList: Media[] = []) => {
        if (isAuthenticated && watchlist.length > 0) {
            // Strictly track anime in the user's "Watching" list
            const tracked = watchlist.filter(item => item.status === 'watching');
            const soon: any[] = [], weekly: any[] = [];
            const now = Date.now();

            tracked.forEach(w => {
                const wId = String(w.mediaId);
                const airingNow = fullSchedule.find(a =>
                    String(a.id) === wId || a.title.toLowerCase().trim() === w.title.toLowerCase().trim()
                );
                const progress = animeProgress[wId] || { lastWatchedEpisode: 0 };
                const lastWatched = progress.lastWatchedEpisode || 0;

                // Do not show completed or finished airing anime
                if (w.status === 'completed' || w.mediaStatus?.toLowerCase() === 'finished airing' || w.mediaStatus?.toLowerCase() === 'finished') {
                    return;
                }

                const source = (airingNow || w) as Media;
                let targetEp = 0;
                let targetTime = 0;

                if (source?.nextAiringEpisode?.airingAt) {
                    targetEp = source.nextAiringEpisode.episode;
                    targetTime = source.nextAiringEpisode.airingAt * 1000;
                } else if (source?.airing_start && source?.broadcast?.day) {
                    const jstStart = new Date(source.airing_start);
                    targetEp = lastWatched + 1;
                    targetTime = jstStart.getTime() + (targetEp - 1) * 7 * 24 * 60 * 60 * 1000;
                    let loopCount = 0;
                    while (targetTime < now && loopCount < 1000) {
                        targetEp++;
                        targetTime = jstStart.getTime() + (targetEp - 1) * 7 * 24 * 60 * 60 * 1000;
                        loopCount++;
                    }
                }

                if (targetTime > 0) {
                    const diffMs = targetTime - now;
                    // Allow up to a 2 hour window post-release
                    if (diffMs > -2 * 60 * 60 * 1000) {
                        const diffMinutes = Math.floor(Math.abs(diffMs) / 60000);
                        const diffHours = Math.floor(diffMinutes / 60);
                        const diffDays = Math.floor(diffHours / 24);

                        let countdownStr = '';
                        if (diffMs <= 0) {
                            countdownStr = diffMs > -2 * 60 * 60 * 1000 ? 'Airing Now' : 'Released';
                        } else {
                            countdownStr = diffDays > 0 ? `${diffDays}d ${diffHours % 24}h`
                                : diffHours > 0 ? `${diffHours}h ${diffMinutes % 60}m` : `${diffMinutes}m`;
                        }

                        const targetDate = new Date(targetTime);
                        const formattedDateStr = targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                        const formattedTime = targetDate.toLocaleTimeString(undefined, {
                            weekday: 'short', hour: '2-digit', minute: '2-digit'
                        });

                        let badge = 'THIS WEEK', badgeColor = '#4CD964';
                        if (diffMs <= 0) { badge = 'NOW'; badgeColor = colors.primary; }
                        else if (diffMs <= 24 * 60 * 60 * 1000) { badge = 'TODAY'; badgeColor = colors.primary; }
                        else if (diffMs <= 48 * 60 * 60 * 1000) { badge = 'TOMORROW'; badgeColor = '#FF9500'; }

                        const enrichedItem = {
                            id: wId, title: w.title, posterPath: w.posterPath,
                            nextEp: `Episode ${targetEp}`, countdown: countdownStr,
                            releaseTime: `${formattedDateStr} • ${formattedTime}`, timestamp: targetTime,
                            broadcast: source.broadcast, badge, badgeColor,
                            genres: source.genres || w.genres || [],
                        };
                        if (diffMs <= 72 * 60 * 60 * 1000) soon.push(enrichedItem);
                        else weekly.push(enrichedItem);
                    }
                }
            });

            soon.sort((a, b) => a.timestamp - b.timestamp);
            weekly.sort((a, b) => a.timestamp - b.timestamp);
            setReleasingSoon(soon); setThisWeek(weekly);
            setUpcomingSeasons([]); setAwaitingSchedule([]);
        } else {
            setReleasingSoon([]); setThisWeek([]);
            setUpcomingSeasons([]); setAwaitingSchedule([]);
        }
    };

    // ═══════════════════════════════════════════════════════
    //  DATA FETCHING (preserved exactly)
    // ═══════════════════════════════════════════════════════
    const fetchAllData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        const cacheKey = 'animorg_seasonal_airing_schedule_v2';
        const upcomingCacheKey = 'animorg_upcoming_seasons_cache';
        try {
            const { user } = useAppStore.getState();
            console.log(`[ReleaseHub] Fetching. Auth: ${isAuthenticated}, WL: ${watchlist.length}`);
            const cached = await AsyncStorage.getItem(cacheKey);
            const cachedUpcoming = await AsyncStorage.getItem(upcomingCacheKey);
            let cachedList: Media[] = [], upcomingList: Media[] = [];
            let isCacheFresh = false, isUpcomingFresh = false;

            if (cached) {
                const parsed = JSON.parse(cached);
                cachedList = parsed.anime || [];
                isCacheFresh = (Date.now() - parsed.timestamp) < 45 * 60 * 1000;
                if (cachedList.length > 0) { setAllAnime(cachedList); if (!isBackground) setLoading(false); }
            }
            if (cachedUpcoming) {
                const parsed = JSON.parse(cachedUpcoming);
                upcomingList = parsed.anime || [];
                isUpcomingFresh = (Date.now() - parsed.timestamp) < 6 * 60 * 60 * 1000;
            }
            await syncTrackedReleases(cachedList, upcomingList);
            if (isCacheFresh && isUpcomingFresh && !isBackground) return;

            if (!isUpcomingFresh) {
                try {
                    const upResults = await animeApi.getUpcomingAnime(1);
                    if (upResults?.length > 0) {
                        upcomingList = upResults;
                        await AsyncStorage.setItem(upcomingCacheKey, JSON.stringify({ anime: upResults, timestamp: Date.now() }));
                    }
                } catch (e) { console.warn('[ReleaseHub] upcoming fetch error:', e); }
            }

            if (!isCacheFresh || isBackground) {
                const freshSchedule = await animeApi.getAiringSchedule(undefined, (freshList) => {
                    const currentlyAiring = freshList.filter(item => item.status?.toLowerCase() !== 'finished airing' && item.status?.toLowerCase() !== 'finished');
                    console.log(`[ReleaseHub Debug] callback: loaded ${freshList.length} total, filtered currentlyAiring count: ${currentlyAiring.length}`);
                    AsyncStorage.setItem(cacheKey, JSON.stringify({ anime: currentlyAiring, timestamp: Date.now() }));
                    setAllAnime(currentlyAiring);
                    syncTrackedReleases(currentlyAiring, upcomingList);
                });

                const currentlyAiring = freshSchedule.filter(item => item.status?.toLowerCase() !== 'finished airing' && item.status?.toLowerCase() !== 'finished');
                console.log(`[ReleaseHub Debug] loaded ${freshSchedule.length} total, filtered currentlyAiring count: ${currentlyAiring.length}`);
                await AsyncStorage.setItem(cacheKey, JSON.stringify({ anime: currentlyAiring, timestamp: Date.now() }));
                setAllAnime(currentlyAiring);
                await syncTrackedReleases(currentlyAiring, upcomingList);
            }
        } catch (error) { console.error('Schedule fetch error:', error); }
        finally { setLoading(false); }
    };

    // ═══════════════════════════════════════════════════════
    //  COMPUTED DATA
    // ═══════════════════════════════════════════════════════
    const enrichedAnimeList = useMemo(() => {
        console.log(`[ReleaseHub Debug] Total before normalization/enrichment: ${allAnime.length}`);
        const result = allAnime.map(anime => {
            const localInfo = getLocalAiringInfo(anime.broadcast, user?.timezone, 'en-US', use24Hour, anime.nextAiringEpisode);
            return {
                ...anime, localDay: localInfo?.localDay || 'Unknown Schedule',
                localTime: localInfo?.localTime || '', countdown: localInfo?.countdown || 'TBD',
                airingDate: localInfo?.airingDate || null
            };
        }).filter(anime => anime.localDay !== 'Unknown Schedule');
        console.log(`[ReleaseHub Debug] Total after filtering (unknown schedules): ${result.length}`);
        return result;
    }, [allAnime, user?.timezone, use24Hour]);

    const dayCounts = useMemo(() => {
        const c: Record<string, number> = {};
        DAYS.forEach(d => { c[d] = 0; });
        enrichedAnimeList.forEach(a => { if (c[a.localDay] !== undefined) c[a.localDay]++; });
        console.log('[ReleaseHub Debug] Weekly Day Grouping Counts:', JSON.stringify(c));
        return c;
    }, [enrichedAnimeList]);

    const dayAnimeMap = useMemo(() => {
        const map: Record<string, any[]> = {};
        DAYS.forEach(d => { map[d] = []; });
        enrichedAnimeList.forEach(a => {
            if (map[a.localDay]) map[a.localDay].push(a);
        });
        DAYS.forEach(day => {
            map[day].sort((a: any, b: any) => {
                if (a.localTime && b.localTime) { const t = a.localTime.localeCompare(b.localTime); if (t !== 0) return t; }
                else if (a.localTime && !b.localTime) return -1;
                else if (!a.localTime && b.localTime) return 1;
                const popDiff = (a.popularity || 999999) - (b.popularity || 999999);
                if (popDiff !== 0) return popDiff;
                return (b.score || 0) - (a.score || 0);
            });
        });
        return map;
    }, [enrichedAnimeList]);

    const totalTracked = releasingSoon.length + thisWeek.length + upcomingSeasons.length;

    const onRefresh = useCallback(async () => {
        setRefreshing(true); await fetchAllData(true); setRefreshing(false);
    }, []);

    // ═══════════════════════════════════════════════════════
    //  RENDER HELPERS
    // ═══════════════════════════════════════════════════════
    const renderTrackedGroup = (items: any[], icon: string, iconColor: string, title: string, tickKey: string) => {
        if (items.length === 0) return null;
        return (
            <View style={styles.trackedGroup}>
                <View style={styles.trackedGroupHeader}>
                    <View style={[styles.trackedGroupDot, { backgroundColor: iconColor }]} />
                    <Text style={[styles.trackedGroupTitle, { color: themeColors.text }]}>{title}</Text>
                    <View style={[styles.trackedGroupCount, { backgroundColor: `${iconColor}20` }]}>
                        <Text style={[styles.trackedGroupCountText, { color: iconColor }]}>{items.length}</Text>
                    </View>
                </View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.trackedScroll}
                    snapToInterval={336}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    scrollEventThrottle={16}
                    keyboardShouldPersistTaps="handled"
                >
                    {items.map(item => (
                        <TrackedAnimeCard key={`${tickKey}-${item.id}`} media={item}
                            nextEpisode={item.nextEp} releaseDate={item.releaseTime || item.statusText}
                            countdown={item.countdown} onPress={(id) => router.push(`/details/${id}`)} />
                    ))}
                </ScrollView>
            </View>
        );
    };

    return (
        <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
            <StreamingHeader
                showAvatar={false}
            />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* ═══ MY ANIMES ═══ */}
                <SectionHeader title="My Animes" icon="bookmark" />

                {!isAuthenticated || (releasingSoon.length === 0 && thisWeek.length === 0 && upcomingSeasons.length === 0 && awaitingSchedule.length === 0) ? (
                    <EmptyTrackedState />
                ) : (
                    <View style={styles.myAnimesWrap}>
                        {renderTrackedGroup(releasingSoon, 'zap', colors.primary, 'Releasing Soon', 'soon')}
                        {renderTrackedGroup(thisWeek, 'calendar', '#4CD964', 'This Week', 'week')}
                        {renderTrackedGroup(upcomingSeasons, 'star', '#FFD700', 'Upcoming Seasons', 'up')}
                        {renderTrackedGroup(awaitingSchedule, 'clock', themeColors.textDim, 'Awaiting Schedule', 'await')}
                    </View>
                )}

                {/* ═══ AIRING SCHEDULE ═══ */}
                <SectionHeader title="Airing Schedule" icon="tv" />

                <View style={{ flex: 1, minHeight: 450 }}>
                    <SwipeableTabs
                        tabs={DAYS}
                        activeTab={selectedDay}
                        onTabChange={setSelectedDay}
                    >
                        {DAYS.map(day => (
                            <UpcomingDayFeed
                                key={day}
                                day={day}
                                dayAnime={dayAnimeMap[day] || []}
                                animeProgress={animeProgress}
                                numColumns={numColumns}
                                cardWidth={cardWidth}
                                edgePadding={edgePadding}
                                itemGap={itemGap}
                                router={router}
                                themeColors={themeColors}
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                totalTracked={totalTracked}
                                totalAiringCount={enrichedAnimeList.length}
                            />
                        ))}
                    </SwipeableTabs>
                </View>
            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    // ─── Hero ───
    hero: {
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.xl,
    },
    heroInner: { gap: 4 },
    heroLabel: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 2,
        textTransform: 'uppercase',
        opacity: 0.8,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -1,
    },
    heroStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        gap: 0,
    },
    heroStat: {
        flex: 1,
        alignItems: 'center',
    },
    heroStatNum: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    heroStatSub: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    heroStatDivider: {
        width: 1,
        height: 28,
    },

    // ─── My Animes tracked ───
    myAnimesWrap: {
        paddingBottom: spacing.md,
    },
    trackedGroup: {
        marginBottom: spacing.lg,
    },
    trackedGroupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.sm,
        gap: 8,
    },
    trackedGroupDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    trackedGroupTitle: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.2,
        flex: 1,
    },
    trackedGroupCount: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    trackedGroupCountText: {
        fontSize: 12,
        fontWeight: '800',
    },
    trackedScroll: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xs,
    },

    // ─── Day Tabs ───
    dayTabsScroll: {
        paddingHorizontal: spacing.xl,
        gap: 6,
        paddingBottom: spacing.sm,
    },
    dayChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        gap: 5,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    dayChipText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    dayChipCount: {
        fontSize: 10,
        fontWeight: '800',
        opacity: 0.8,
        marginLeft: 2,
    },
    todayDot: {
        position: 'absolute',
        top: 3,
        right: 3,
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: colors.primary,
    },

    // ─── Day Label ───
    dayLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.md,
        marginTop: spacing.xs,
        gap: 8,
    },
    dayLabelText: {
        fontSize: 16,
        fontWeight: '800',
    },
    todayBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    todayBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    dayCount: {
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 'auto',
    },

    // ─── Grid ───
    listContent: {
        paddingBottom: spacing.xl + 80,
    },
    gridItem: {
        marginBottom: spacing.md,
        alignItems: 'center',
    },
    skeletonGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.sm,
    },
    skeletonItem: {
        padding: spacing.xs,
        aspectRatio: 2 / 3,
    },

    // ─── Empty Day ───
    emptyDay: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
        paddingBottom: 80,
        paddingHorizontal: spacing.xl,
    },
    emptyDayIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    emptyDayTitle: {
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 6,
    },
    emptyDaySub: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
    },

    // ─── Footer Stats ───
    footerStatsContainer: {
        marginTop: spacing.xl,
        marginHorizontal: spacing.xl,
        alignItems: 'center',
        gap: 12,
        paddingBottom: spacing.xl,
    },
    footerStatsCard: {
        width: '100%',
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        paddingVertical: spacing.md,
        overflow: 'hidden',
    },
    footerBorderLine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
    },
    footerCopyright: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        opacity: 0.4,
    },
});
