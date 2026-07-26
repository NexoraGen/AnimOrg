import React, { useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Pressable,
    Animated,
    StyleSheet
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';

export interface ContinueWatchingPreviewEntry {
    animeId: string;
    title: string;
    posterPath: string;
    lastWatchedEpisode: number;
    nextEpisode?: number;
    totalEpisodes?: number;
    releasedCount?: number;
    progressFraction?: number;
}

export interface ContinueWatchingPreviewCardProps {
    entry: ContinueWatchingPreviewEntry;
    onPress: (animeId: string) => void;
    onPlayPress?: (animeId: string, nextEpisode?: number) => void;
}

export const ContinueWatchingPreviewCard: React.FC<ContinueWatchingPreviewCardProps> = React.memo(({
    entry,
    onPress,
    onPlayPress
}) => {
    const themeColors = useThemeColors();
    const cardScale = useRef(new Animated.Value(1)).current;
    const playScale = useRef(new Animated.Value(1)).current;

    const handleCardPressIn = () => {
        Animated.spring(cardScale, {
            toValue: 0.98,
            useNativeDriver: true,
            speed: 20,
        }).start();
    };

    const handleCardPressOut = () => {
        Animated.spring(cardScale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
        }).start();
    };

    const handlePlayPressIn = () => {
        Animated.spring(playScale, {
            toValue: 0.9,
            useNativeDriver: true,
            speed: 20,
        }).start();
    };

    const handlePlayPressOut = () => {
        Animated.spring(playScale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
        }).start();
    };

    const lastWatched = entry.lastWatchedEpisode || 0;
    const nextEp = entry.nextEpisode || lastWatched + 1;
    const total = entry.totalEpisodes || entry.releasedCount || 0;

    // Compute progress fraction safely between 0 and 1
    let progressFraction = entry.progressFraction;
    if (progressFraction === undefined || progressFraction === null) {
        progressFraction = total > 0 ? lastWatched / total : 0;
    }
    progressFraction = Math.min(Math.max(progressFraction, 0), 1);

    const handlePlay = (e: any) => {
        e.stopPropagation?.();
        if (onPlayPress) {
            onPlayPress(entry.animeId, nextEp);
        } else {
            onPress(entry.animeId);
        }
    };

    return (
        <Animated.View style={[styles.wrapper, { transform: [{ scale: cardScale }] }]}>
            <Pressable
                onPress={() => onPress(entry.animeId)}
                onPressIn={handleCardPressIn}
                onPressOut={handleCardPressOut}
                style={[
                    styles.container,
                    {
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderColor: 'rgba(255,255,255,0.03)'
                    }
                ]}
            >
                {/* Left: Compact Anime Poster */}
                <View style={styles.posterContainer}>
                    <Image
                        source={entry.posterPath ? { uri: entry.posterPath } : { uri: 'https://images.unsplash.com/photo-1578632738908-48c104e8d89e?q=80&w=600' }}
                        style={styles.poster}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                    />
                </View>

                {/* Middle: Details & Progress */}
                <View style={styles.infoContainer}>
                    <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
                        {entry.title}
                    </Text>

                    <View style={styles.episodeRow}>
                        <Text style={[styles.nextEpisodeText, { color: colors.primary }]}>
                            Ep {nextEp}
                        </Text>
                        <View style={styles.dot} />
                        <Text style={[styles.watchedText, { color: themeColors.textDim }]}>
                            {total > 0 ? `${lastWatched}/${total} Watched` : `${lastWatched} Watched`}
                        </Text>
                    </View>

                    {/* Viewing Progress Bar */}
                    <View style={styles.progressBarBg}>
                        <View
                            style={[
                                styles.progressBarFill,
                                {
                                    width: `${progressFraction * 100}%`,
                                    backgroundColor: colors.primary
                                }
                            ]}
                        />
                    </View>
                </View>

                {/* Right: Independent Play Button */}
                <Animated.View style={{ transform: [{ scale: playScale }] }}>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handlePlay}
                        onPressIn={handlePlayPressIn}
                        onPressOut={handlePlayPressOut}
                        style={[styles.playButton, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Feather name="play" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    wrapper: {
        marginRight: spacing.md,
    },
    container: {
        width: 280,
        height: 100,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        overflow: 'hidden',
    },
    posterContainer: {
        width: 76,
        height: '100%',
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    poster: {
        width: '100%',
        height: '100%',
    },
    infoContainer: {
        flex: 1,
        paddingHorizontal: spacing.md,
        justifyContent: 'center',
    },
    title: {
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 6,
        letterSpacing: -0.2,
    },
    episodeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    nextEpisodeText: {
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
    watchedText: {
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
    playButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
    },
});
