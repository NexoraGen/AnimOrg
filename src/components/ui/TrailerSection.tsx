import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Dimensions,
    ActivityIndicator,
    Linking,
    useWindowDimensions
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, Easing } from 'react-native-reanimated';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../theme';
import { trailerService } from '../../services/trailerService';
import { SkeletonLoader } from './SkeletonLoader';
import YoutubeIframe from 'react-native-youtube-iframe';

interface TrailerSectionProps {
    animeId: string;
    title: string;
    trailerUrl: string;
    thumbnailPath?: string | null;
    themeColors: any;
    autoPlayInit?: boolean;
}

export const TrailerSection: React.FC<TrailerSectionProps> = ({
    animeId,
    title,
    trailerUrl,
    thumbnailPath,
    autoPlayInit = false,
}) => {
    const colors = useThemeColors();
    const { width } = useWindowDimensions();

    const [isPlaying, setIsPlaying] = useState(false);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorReason, setErrorReason] = useState<string | null>(null);

    const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const youtubeId = React.useMemo(() => {
        return trailerService.extractYoutubeId(trailerUrl);
    }, [trailerUrl]);

    // Construct Universal Thumbnail (HD YouTube cover or provided poster fallback)
    const thumbnailSource = React.useMemo(() => {
        if (youtubeId) {
            return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
        }
        return thumbnailPath || undefined;
    }, [youtubeId, thumbnailPath]);

    // Safety Timeout for loading state
    const startSafetyTimeout = useCallback(() => {
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = setTimeout(() => {
            if (!isPlayerReady) {
                console.warn('[TrailerSection] Embedded player initialization timed out.');
                setHasError(true);
                setErrorReason('timeout');
            }
        }, 12000);
    }, [isPlayerReady]);

    useEffect(() => {
        return () => {
            if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        };
    }, []);

    const handlePlayPress = useCallback(() => {
        if (!youtubeId) {
            // Cannot embed, must fallback to external intent immediately
            if (trailerUrl) {
                Linking.openURL(trailerUrl).catch(() => { });
            }
            return;
        }

        setIsPlaying(true);
        setIsPlayerReady(false);
        setHasError(false);
        setErrorReason(null);
        startSafetyTimeout();
    }, [youtubeId, trailerUrl, startSafetyTimeout]);

    // Allows the component to be commanded externally to skip thumbnail and jump to player boot.
    useEffect(() => {
        let mounted = true;
        if (autoPlayInit && youtubeId && !isPlaying) {
            // Need a slight delay to ensure UI threads and Layouts are resolved for smooth scaling
            setTimeout(() => {
                if (mounted) handlePlayPress();
            }, 300);
        }
        return () => { mounted = false; };
    }, [autoPlayInit, youtubeId, isPlaying, handlePlayPress]);

    const handlePlayerReady = useCallback(() => {
        setIsPlayerReady(true);
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    }, []);

    const handlePlayerError = useCallback((error: string) => {
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        console.warn(`[TrailerSection] YouTube IFrame Error: ${error}`);
        setHasError(true);
        setErrorReason(error);
        setIsPlaying(false);
    }, []);

    const handleTryAgain = useCallback(() => {
        setHasError(false);
        setErrorReason(null);
        setIsPlaying(true);
        setIsPlayerReady(false);
        startSafetyTimeout();
    }, [startSafetyTimeout]);

    // Maintain 16:9 widescreen ratio
    const horizontalPadding = spacing.M * 2;
    const containerWidth = Math.min(width - horizontalPadding, 800);
    const playerHeight = containerWidth * (9 / 16);

    if (!youtubeId && !trailerUrl) {
        return null; // Don't show anything if there is genuinely no url
    }

    // Determine specific error messaging logic per ToS / constraints
    const getErrorCopy = () => {
        if (errorReason === 'unplayable') return "This video is restricted or has been removed.";
        if (errorReason === 'not_embeddable') return "The uploader has disabled embedding.";
        if (errorReason === 'timeout') return "Player took too long to load. Check your network.";
        return `Playback error: ${errorReason || 'Unknown'}`;
    };

    return (
        <View style={[styles.section, { width: containerWidth }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Official Trailer</Text>

            <View
                style={[
                    styles.playerContainer,
                    {
                        height: playerHeight,
                        backgroundColor: colors.surfaceVariant,
                        borderColor: colors.border,
                    },
                ]}
            >
                {/* 1. INITIAL COVER STATE */}
                {!isPlaying && !hasError && (
                    <TouchableOpacity
                        style={styles.thumbnailWrapper}
                        activeOpacity={0.8}
                        onPress={handlePlayPress}
                    >
                        {thumbnailSource ? (
                            <Image
                                source={{ uri: thumbnailSource }}
                                style={StyleSheet.absoluteFill}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                            />
                        ) : (
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />
                        )}

                        <View style={[StyleSheet.absoluteFill, styles.thumbnailVignette]} />

                        <Animated.View entering={FadeIn.duration(400)} style={styles.playButtonWrapper}>
                            <View
                                style={[
                                    styles.playButtonCircle,
                                    { backgroundColor: `${colors.primary}E6` }, // Slight transparency
                                ]}
                            >
                                <Feather name="play" size={32} color="#FFF" fill="#FFF" style={{ marginLeft: 4 }} />
                            </View>
                        </Animated.View>
                    </TouchableOpacity>
                )}

                {/* 2. ACTIVITY / BUFFERING OVERLAY WHILE YOUTUBE IFRAME BOOTS */}
                {isPlaying && !isPlayerReady && !hasError && (
                    <Animated.View exiting={FadeOut.duration(300)} style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface, zIndex: 5 }]} pointerEvents="none">
                        <SkeletonLoader width="100%" height="100%" style={StyleSheet.absoluteFill} />
                        <View style={[StyleSheet.absoluteFill, styles.center]}>
                            <ActivityIndicator color={colors.primary} size="large" />
                            <Text style={[styles.loadingText, { color: colors.textDim }]}>Buffering Video...</Text>
                        </View>
                    </Animated.View>
                )}

                {/* 3. EMBEDDED IFRAME PLAYER */}
                {isPlaying && !hasError && youtubeId && (
                    <View style={StyleSheet.absoluteFill}>
                        {Platform.OS === 'web' ? (
                            <iframe
                                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&controls=1&modestbranding=1&rel=0`}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen={true}
                                onLoad={handlePlayerReady}
                            />
                        ) : (
                            <YoutubeIframe
                                videoId={youtubeId}
                                height={playerHeight}
                                width={containerWidth}
                                play={true}
                                forceAndroidAutoplay={true}
                                onReady={handlePlayerReady}
                                onError={handlePlayerError}
                                webViewStyle={{ opacity: 0.99 }} // Forces Android compositor to render hardware textures
                                webViewProps={{
                                    androidLayerType: 'hardware',
                                    allowsInlineMediaPlayback: true,
                                }}
                                initialPlayerParams={{
                                    modestbranding: true,
                                    rel: false,
                                    controls: true,
                                    cc_load_policy: true
                                }}
                            />
                        )}
                    </View>
                )}

                {/* 4. EXPLICIT ERROR / FALLBACK STATE */}
                {hasError && (
                    <Animated.View entering={FadeIn.duration(400)} style={[StyleSheet.absoluteFill, styles.errorContainer, { backgroundColor: colors.surface }]}>
                        <Feather name="alert-triangle" size={36} color={colors.error} style={{ marginBottom: spacing.md }} />
                        <Text style={[styles.errorTitle, { color: colors.text }]}>
                            {errorReason === 'not_embeddable' ? "Embedded Playback Disabled" : "Playback Unavailable"}
                        </Text>
                        <Text style={[styles.errorSubtitle, { color: colors.textMuted }]}>
                            {getErrorCopy()}
                        </Text>

                        <View style={styles.errorActionRow}>
                            {/* Always offer external YouTube fallback if it's not a generic network timeout */}
                            {youtubeId && trailerUrl && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.border, borderWidth: 1 }]}
                                    onPress={() => Linking.openURL(trailerUrl).catch(() => { })}
                                >
                                    <Feather name="external-link" size={16} color={colors.text} style={{ marginRight: 8 }} />
                                    <Text style={[styles.actionButtonText, { color: colors.text }]}>Open Externally</Text>
                                </TouchableOpacity>
                            )}

                            {errorReason === 'timeout' && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.primary, marginLeft: spacing.sm }]}
                                    onPress={handleTryAgain}
                                >
                                    <Feather name="refresh-cw" size={16} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.actionButtonText}>Retry</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </Animated.View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        marginTop: spacing.L,
        marginBottom: spacing.M,
        alignSelf: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: spacing.sm,
        letterSpacing: 0.3,
    },
    playerContainer: {
        width: '100%',
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    thumbnailWrapper: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    thumbnailVignette: {
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    playButtonWrapper: {
        zIndex: 10,
    },
    playButtonCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#E50914',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.md,
    },
    errorTitle: {
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 6,
    },
    errorSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: spacing.L,
        paddingHorizontal: spacing.md,
    },
    errorActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: borderRadius.md,
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
