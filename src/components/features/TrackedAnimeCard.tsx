import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import { Media } from '../../types';
import { useThemeColors } from '../../hooks/useThemeColors';

interface TrackedAnimeCardProps {
    media: Media & {
        badge?: string;
        badgeColor?: string;
        genres?: string[];
    };
    nextEpisode?: number | string;
    releaseDate?: string;
    countdown?: string;
    onPress: (id: string) => void;
}

export const TrackedAnimeCard: React.FC<TrackedAnimeCardProps> = React.memo(({
    media,
    nextEpisode,
    releaseDate,
    countdown,
    onPress
}) => {
    const themeColors = useThemeColors();
    const badge = (media as any).badge;
    const badgeColor = (media as any).badgeColor || colors.primary;
    const genres = (media as any).genres || media.genres || [];

    // Excitable countdown strings - cleanly structured
    let excitingCountdown = countdown;
    if (countdown && !countdown.toLowerCase().includes('in')) {
        excitingCountdown = `${countdown}`;
    }

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: 'rgba(26,26,26,0.65)' }]}
            onPress={() => onPress(media.id)}
            activeOpacity={0.9}
        >
            <View style={styles.innerRow}>
                {/* 1. Left Side: Poster Image */}
                <View style={styles.imageContainer}>
                    <Image
                        source={media.posterPath ? { uri: media.posterPath } : { uri: 'https://images.unsplash.com/photo-1578632738908-48c104e8d89e?q=80&w=600' }}
                        style={styles.image}
                        contentFit="cover"
                        transition={300}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.4)']}
                        style={StyleSheet.absoluteFillObject}
                    />
                </View>

                {/* 2. Right Side: Info & Release Timeline */}
                <View style={styles.infoContainer}>
                    {/* Top Row: Episode indicator and Status Badge */}
                    <View style={styles.topRow}>
                        <View style={[styles.episodeBadge, { backgroundColor: `${colors.primary}12` }]}>
                            <Text style={styles.episodeText}>{nextEpisode || 'Next Episode'}</Text>
                        </View>
                        {badge && (
                            <View style={[styles.statusBadge, { borderColor: `${badgeColor}30`, backgroundColor: `${badgeColor}15` }]}>
                                <Text style={[styles.statusBadgeText, { color: badgeColor }]}>{badge}</Text>
                            </View>
                        )}
                    </View>

                    {/* Middle Block: Title & Genre tags */}
                    <View style={styles.titleBlock}>
                        <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
                            {media.title}
                        </Text>
                        {genres.length > 0 && (
                            <Text style={styles.genreText} numberOfLines={1}>
                                {genres.slice(0, 2).join('  •  ')}
                            </Text>
                        )}
                    </View>

                    {/* Bottom Row: Elegant Release Clocks */}
                    <View style={styles.bottomRow}>
                        {excitingCountdown ? (
                            <View style={styles.timerPill}>
                                <Feather name="clock" size={10} color={colors.primary} style={styles.clockIcon} />
                                <Text style={[styles.timerText, { color: themeColors.textDim }]} numberOfLines={1}>
                                    {excitingCountdown.toLowerCase().includes('awaiting') || excitingCountdown.length > 18 ? (
                                        <Text style={styles.timerHighlight}>{excitingCountdown}</Text>
                                    ) : (
                                        <>Releases in <Text style={styles.timerHighlight}>{excitingCountdown}</Text></>
                                    )}
                                </Text>
                            </View>
                        ) : (
                            releaseDate && (
                                <Text style={styles.dateText} numberOfLines={1}>
                                    {releaseDate}
                                </Text>
                            )
                        )}
                    </View>
                </View>
            </View>

            {/* Bottom Accent / Thin Progress Line */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: colors.primary }]} />
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        width: 320,
        height: 120,
        borderRadius: 14,
        overflow: 'hidden',
        marginRight: spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    innerRow: {
        flexDirection: 'row',
        width: '100%',
        height: '100%',
    },
    imageContainer: {
        width: 80,
        height: 120,
        position: 'relative',
        borderTopLeftRadius: 14,
        borderBottomLeftRadius: 14,
        overflow: 'hidden',
    },
    image: {
        width: 80,
        height: 120,
    },
    infoContainer: {
        flex: 1,
        padding: spacing.sm,
        justifyContent: 'space-between',
        paddingBottom: spacing.sm + 4,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    episodeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    episodeText: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: '800',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 5,
        borderWidth: 1,
    },
    statusBadgeText: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    titleBlock: {
        marginTop: 2,
    },
    title: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    genreText: {
        color: 'rgba(255,255,255,0.35)',
        fontSize: 10,
        fontWeight: '700',
        marginTop: 1,
        letterSpacing: 0.2,
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    timerPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.04)',
    },
    clockIcon: {
        marginRight: 4,
    },
    timerText: {
        fontSize: 10,
        fontWeight: '700',
    },
    timerHighlight: {
        color: '#FFF',
        fontWeight: '900',
    },
    dateText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 10,
        fontWeight: '700',
    },
    progressContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    progressBar: {
        height: '100%',
        width: '100%',
    },
});
