import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { Media } from '../../types';
import { formatRating } from '../../utils/formatters';
import { PLACEHOLDER_POSTER } from '../../constants/images';
import { useThemeColors } from '../../hooks/useThemeColors';

interface AiringAnimeCardProps {
    anime: Media & {
        localTime?: string;
        countdown?: string;
        localDay?: string;
    };
    width: number;
    nextEpisode: number | string;
    onPress: (id: string) => void;
}

export const AiringAnimeCard: React.FC<AiringAnimeCardProps> = React.memo(({
    anime,
    width,
    nextEpisode,
    onPress
}) => {
    const themeColors = useThemeColors();
    const height = width * 1.5; // Premium 2:3 aspect ratio

    // Check Countdown type & show active indicator if Airing Now
    const isLive = anime.countdown?.toLowerCase() === 'airing now';

    return (
        <TouchableOpacity
            style={[styles.container, { width, height, backgroundColor: themeColors.surface }]}
            onPress={() => onPress(anime.id)}
            activeOpacity={0.9}
        >
            {/* 1. Poster Image */}
            <Image
                source={anime.posterPath ? { uri: anime.posterPath } : { uri: PLACEHOLDER_POSTER }}
                style={styles.image}
                contentFit="cover"
                transition={250}
                cachePolicy="memory-disk"
            />

            {/* 2. Top Badge Layer */}
            <View style={styles.topRow}>
                {anime.localTime && (
                    <View style={[styles.timeBadge, { backgroundColor: 'rgba(0, 0, 0, 0.75)' }]}>
                        <Feather name="clock" size={10} color="#FFF" />
                        <Text style={styles.timeText}>{anime.localTime}</Text>
                    </View>
                )}
                {anime.score !== undefined && anime.score > 0 && (
                    <View style={[styles.scoreBadge, { backgroundColor: 'rgba(0, 0, 0, 0.75)' }]}>
                        <Feather name="star" size={10} color={colors.primary} fill={colors.primary} />
                        <Text style={[styles.scoreText, { color: colors.primary }]}>{formatRating(anime.score)}</Text>
                    </View>
                )}
            </View>

            {/* 3. Immersive Overlay Gradient */}
            <LinearGradient
                colors={['transparent', 'rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.95)']}
                style={styles.gradient}
            >
                {/* 4. Countdown Banner */}
                {anime.countdown && (
                    <View style={[
                        styles.countdownBadge,
                        { backgroundColor: isLive ? 'rgba(229, 9, 20, 0.9)' : 'rgba(255, 255, 255, 0.15)' }
                    ]}>
                        {isLive && <View style={styles.liveDot} />}
                        <Text style={[styles.countdownText, isLive && { fontWeight: '900' }]}>
                            {anime.countdown}
                        </Text>
                    </View>
                )}

                {/* 5. Title */}
                <Text style={styles.title} numberOfLines={1}>{anime.title}</Text>

                {/* 6. Meta details: Studio & Genres */}
                <View style={styles.metaRow}>
                    <Text style={styles.metaText} numberOfLines={1}>
                        {anime.studio || 'Unknown'} {nextEpisode ? `• Ep ${nextEpisode}` : ''}
                    </Text>
                </View>

                {/* 7. Genre Chips summary */}
                {anime.genres && anime.genres.length > 0 && (
                    <Text style={styles.genresText} numberOfLines={1}>
                        {anime.genres.slice(0, 2).join(' / ')}
                    </Text>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    topRow: {
        position: 'absolute',
        top: spacing.xs,
        left: spacing.xs,
        right: spacing.xs,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        gap: 3,
    },
    timeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    scoreBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        gap: 3,
    },
    scoreText: {
        fontSize: 10,
        fontWeight: '900',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '65%',
        justifyContent: 'flex-end',
        padding: spacing.sm,
    },
    countdownBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        marginBottom: spacing.xs,
        gap: 4,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFF',
    },
    countdownText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    title: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.1,
        marginBottom: 2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    metaText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 10,
        fontWeight: '700',
    },
    genresText: {
        color: colors.primary,
        fontSize: 9,
        fontWeight: '800',
    }
});
