import React, { useState, useEffect } from 'react';
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
import { jikanApi } from '../../services/api/jikan';
import { useThemeColors } from '../../hooks/useThemeColors';
import * as Haptics from 'expo-haptics';

interface EpisodeListProps {
    animeId: string;
    totalEpisodes?: number;
    media?: import('../../types').Media;
}

export const EpisodeList: React.FC<EpisodeListProps> = ({ animeId, totalEpisodes, media }) => {
    const themeColors = useThemeColors();
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(true);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [totalSeriesEpisodes, setTotalSeriesEpisodes] = useState<number | undefined>(totalEpisodes);

    const { animeProgress, toggleEpisodeWatched, markSeasonWatched } = useAppStore();
    const progress = animeProgress[animeId];
    const watchedEps = progress?.watchedEpisodes || {};

    useEffect(() => {
        fetchEpisodes();
    }, [animeId]);

    const fetchEpisodes = async (nextPage = 1) => {
        if (nextPage === 1) setLoading(true);
        const result = await jikanApi.getAnimeEpisodes(animeId, nextPage);
        if (nextPage === 1) {
            setEpisodes(result.data);
            if (result.totalCount) setTotalSeriesEpisodes(result.totalCount);
        } else {
            setEpisodes(prev => [...prev, ...result.data]);
        }
        setHasNextPage(result.hasNextPage);
        setLoading(false);
    };

    const handleToggleWatched = (epNumber: number) => {
        const isWatched = !!watchedEps[epNumber];
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(
                isWatched
                    ? Haptics.NotificationFeedbackType.Warning
                    : Haptics.NotificationFeedbackType.Success
            );
        }
        toggleEpisodeWatched(animeId, epNumber, !isWatched, totalAvailable, media);
    };

    const handleMarkAll = () => {
        const episodeNums = episodes.map(ep => ep.number);
        markSeasonWatched(animeId, episodeNums, totalAvailable, media);
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const watchedCount = Object.values(watchedEps).filter(v => v).length;
    // CRITICAL FIX: Eliminate fallback to episodes.length which causes percentage drift
    const totalAvailable = totalSeriesEpisodes || totalEpisodes || (episodes.length > watchedCount ? episodes.length : watchedCount) || 1;
    const percentage = totalAvailable > 0 ? Math.min(Math.round((watchedCount / totalAvailable) * 100), 100) : 0;

    if (loading && page === 1) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator color={colors.primary} size="large" />
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
                </View>
                <Feather
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={24}
                    color={themeColors.text}
                />
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
                        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAll}>
                            <Text style={styles.markAllText}>Mark All</Text>
                        </TouchableOpacity>
                    </View>

                    {episodes.map((episode) => {
                        const isWatched = !!watchedEps[episode.number];
                        return (
                            <TouchableOpacity
                                key={episode.id}
                                style={[
                                    styles.episodeItem,
                                    { borderBottomColor: themeColors.border }
                                ]}
                                onPress={() => handleToggleWatched(episode.number)}
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
                                                isWatched && styles.watchedText
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
                                        { borderColor: isWatched ? colors.primary : themeColors.border },
                                        isWatched && { backgroundColor: colors.primary }
                                    ]}
                                >
                                    {isWatched && <Feather name="check" size={14} color="#FFF" />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}

                    {hasNextPage && (
                        <TouchableOpacity
                            style={styles.loadMore}
                            onPress={() => {
                                setPage(p => p + 1);
                                fetchEpisodes(page + 1);
                            }}
                        >
                            <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load More Episodes</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
};

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
});
