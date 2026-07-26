import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Dimensions,
    useWindowDimensions,
    ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../theme';
import { trailerService } from '../../services/trailerService';
import { SkeletonLoader } from './SkeletonLoader';

let WebView: any = null;
if (Platform.OS !== 'web') {
    try {
        WebView = require('react-native-webview').WebView;
    } catch (e) {
        console.warn('[TrailerSection] WebView not loaded:', e);
    }
}

interface TrailerSectionProps {
    animeId: string;
    title: string;
    trailerUrl: string;
    thumbnailPath?: string | null;
    themeColors: any;
}

export const TrailerSection: React.FC<TrailerSectionProps> = ({
    animeId,
    title,
    trailerUrl,
    thumbnailPath,
    themeColors,
}) => {
    const colors = useThemeColors();
    const { width } = useWindowDimensions();

    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [playerKey, setPlayerKey] = useState(0); // Used to force re-render on retry

    const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const youtubeId = React.useMemo(() => {
        return trailerService.extractYoutubeId(trailerUrl);
    }, [trailerUrl]);

    const embedUrl = React.useMemo(() => {
        if (!youtubeId) return null;
        return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`;
    }, [youtubeId]);

    // Fallback to youtube high-res thumbnail, then backdropPath/posterPath, then placeholder
    const thumbnailSource = React.useMemo(() => {
        if (youtubeId) {
            return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
        }
        return thumbnailPath || undefined;
    }, [youtubeId, thumbnailPath]);

    // Safety Timeout for loading state (e.g. if WebView/iframe gets stuck loading)
    const startSafetyTimeout = useCallback(() => {
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = setTimeout(() => {
            if (isLoading) {
                console.warn('[TrailerSection] Safety timeout triggered. Transitioning to error state.');
                handlePlaybackError();
            }
        }, 12000); // 12 seconds loading safety limit
    }, [isLoading]);

    useEffect(() => {
        return () => {
            if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        };
    }, []);

    const handlePlayPress = useCallback(() => {
        setIsPlaying(true);
        setIsLoading(true);
        setHasError(false);
        startSafetyTimeout();
    }, [startSafetyTimeout]);

    const handlePlaybackLoad = useCallback(() => {
        setIsLoading(false);
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    }, []);

    const handlePlaybackError = useCallback(() => {
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

        if (retryCount < 1) {
            console.log('[TrailerSection] Retrying trailer playback load once...');
            setRetryCount(prev => prev + 1);
            setPlayerKey(prev => prev + 1);
            startSafetyTimeout();
        } else {
            setHasError(true);
            setIsLoading(false);
        }
    }, [retryCount, startSafetyTimeout]);

    const handleTryAgain = useCallback(() => {
        setRetryCount(0);
        setHasError(false);
        setIsLoading(true);
        setPlayerKey(prev => prev + 1);
        startSafetyTimeout();
    }, [startSafetyTimeout]);

    // Calculate proportional cinematic height bounded by layout width
    const horizontalPadding = spacing.M * 2;
    const containerWidth = Math.min(width - horizontalPadding, 800);
    const playerHeight = containerWidth * (9 / 16);

    if (!youtubeId && (!trailerUrl || !trailerService.isValidUrl(trailerUrl))) {
        return null; // Don't show anything if there is genuinely no trailer url or ID
    }

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
                {!isPlaying && (
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

                        {/* Soft backdrop vignette */}
                        <View style={[StyleSheet.absoluteFill, styles.thumbnailVignette]} />

                        {/* Play Button Overlay */}
                        <Animated.View entering={FadeIn.duration(400)} style={styles.playButtonWrapper}>
                            <View
                                style={[
                                    styles.playButtonCircle,
                                    { backgroundColor: `${colors.primary}D8` },
                                ]}
                            >
                                <Feather name="play" size={32} color="#FFF" fill="#FFF" style={{ marginLeft: 4 }} />
                            </View>
                        </Animated.View>
                    </TouchableOpacity>
                )}

                {isPlaying && !hasError && (
                    <View style={StyleSheet.absoluteFill}>
                        {Platform.OS === 'web' ? (
                            <iframe
                                key={playerKey}
                                src={embedUrl || trailerUrl}
                                style={{ width: '100%', height: '100%', border: 0 }}
                                allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                onLoad={handlePlaybackLoad}
                                onError={handlePlaybackError}
                            />
                        ) : WebView ? (
                            <WebView
                                key={playerKey}
                                source={{ uri: embedUrl || trailerUrl }}
                                style={styles.webView}
                                allowsInlineMediaPlayback
                                mediaPlaybackRequiresUserAction={false}
                                javaScriptEnabled
                                domStorageEnabled
                                onLoadEnd={handlePlaybackLoad}
                                onError={handlePlaybackError}
                                onHttpError={handlePlaybackError}
                            />
                        ) : (
                            // Fallback if WebView is not compiled/available
                            <View style={[StyleSheet.absoluteFill, styles.center]}>
                                <Text style={{ color: colors.text, marginBottom: spacing.md }}>
                                    Native player unavailable
                                </Text>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                                    onPress={() => require('react-native').Linking.openURL(trailerUrl)}
                                >
                                    <Text style={styles.actionButtonText}>Open in YouTube</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* Loading Skeleton */}
                {isPlaying && isLoading && !hasError && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} pointerEvents="none">
                        <SkeletonLoader width="100%" height="100%" style={StyleSheet.absoluteFill} />
                        <View style={[StyleSheet.absoluteFill, styles.center]}>
                            <ActivityIndicator color={colors.primary} size="large" />
                            <Text style={[styles.loadingText, { color: colors.textDim }]}>Buffering video...</Text>
                        </View>
                    </View>
                )}

                {/* Error State */}
                {hasError && (
                    <Animated.View entering={FadeIn.duration(400)} style={[StyleSheet.absoluteFill, styles.errorContainer, { backgroundColor: colors.surface }]}>
                        <Feather name="alert-circle" size={42} color={colors.error} style={{ marginBottom: spacing.sm }} />
                        <Text style={[styles.errorTitle, { color: colors.text }]}>
                            This trailer couldn't be loaded right now.
                        </Text>
                        <Text style={[styles.errorSubtitle, { color: colors.textMuted }]}>
                            Check your connection or try again.
                        </Text>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.primary }]}
                            onPress={handleTryAgain}
                        >
                            <Feather name="refresh-cw" size={16} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.actionButtonText}>Try Again</Text>
                        </TouchableOpacity>
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
        fontSize: 20,
        fontWeight: '800',
        marginBottom: spacing.M,
    },
    playerContainer: {
        width: '100%',
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        borderWidth: 1,
        position: 'relative',
    },
    thumbnailWrapper: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    thumbnailVignette: {
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    playButtonWrapper: {
        zIndex: 10,
    },
    playButtonCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
    webView: {
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: spacing.sm,
        fontSize: 14,
        fontWeight: '600',
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.md,
    },
    errorTitle: {
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 4,
    },
    errorSubtitle: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: borderRadius.lg,
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
