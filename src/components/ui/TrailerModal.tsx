import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    useWindowDimensions,
    Linking
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import YoutubeIframe from 'react-native-youtube-iframe';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/useThemeColors';
import { trailerService } from '../../services/trailerService';
import { borderRadius, spacing } from '../../theme';

interface TrailerModalProps {
    visible: boolean;
    trailerUrl: string | null;
    onClose: () => void;
}

export const TrailerModal: React.FC<TrailerModalProps> = ({ visible, trailerUrl, onClose }) => {
    const colors = useThemeColors();
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();

    // We want the modal player to consume the max horizontal space possible in portrait, 
    // and let YT natively handle fullscreen hardware takeover natively via props.
    const isLandscape = width > height;
    const playerWidth = isLandscape ? height * (16 / 9) : width;
    const playerHeight = isLandscape ? height : width * (9 / 16);

    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorReason, setErrorReason] = useState<string | null>(null);

    const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const youtubeId = React.useMemo(() => {
        return trailerUrl ? trailerService.extractYoutubeId(trailerUrl) : null;
    }, [trailerUrl]);

    const startSafetyTimeout = useCallback(() => {
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = setTimeout(() => {
            if (!isPlayerReady) {
                setHasError(true);
                setErrorReason('timeout');
            }
        }, 12000);
    }, [isPlayerReady]);

    // Boot up sequence
    useEffect(() => {
        if (visible) {
            setIsPlayerReady(false);
            setHasError(false);
            setErrorReason(null);

            if (!youtubeId && trailerUrl) {
                // Instantly bounce if impossible to embed
                Linking.openURL(trailerUrl).catch(() => { });
                onClose();
            } else if (youtubeId) {
                startSafetyTimeout();
            }
        }
        return () => {
            if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        };
    }, [visible, youtubeId, trailerUrl, startSafetyTimeout, onClose]);

    const handlePlayerReady = useCallback(() => {
        setIsPlayerReady(true);
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    }, []);

    const handlePlayerError = useCallback((error: string) => {
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        setHasError(true);
        setErrorReason(error);
    }, []);

    const getErrorCopy = () => {
        if (errorReason === 'unplayable') return "This video is restricted or has been removed.";
        if (errorReason === 'not_embeddable') return "The uploader has disabled embedding.";
        return "Network timeout while loading the player over the bridge.";
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
            supportedOrientations={['portrait', 'landscape']} // Allows auto rotation
        >
            <View style={[styles.backdrop, { backgroundColor: 'rgba(5, 5, 8, 0.95)' }]}>
                {/* Close Button top right */}
                <TouchableOpacity
                    style={[styles.closeButton, { top: Math.max(insets.top + spacing.md, spacing.md) }]}
                    onPress={onClose}
                >
                    <Feather name="x" size={28} color="#FFF" />
                </TouchableOpacity>

                {/* Video Stage */}
                <View style={[styles.playerStage, { width: playerWidth, height: playerHeight, backgroundColor: '#000' }]}>

                    {/* Buffering Loader Overlay */}
                    {!isPlayerReady && !hasError && youtubeId && (
                        <Animated.View exiting={FadeOut.duration(300)} style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: '#121212', zIndex: 5 }]}>
                            <ActivityIndicator color={colors.primary} size="large" />
                            <Text style={[styles.loadingText, { color: '#FFF' }]}>Loading Trailer...</Text>
                        </Animated.View>
                    )}

                    {/* Active YT Frame */}
                    {!hasError && youtubeId && (
                        <YoutubeIframe
                            videoId={youtubeId!}
                            height={playerHeight}
                            width={playerWidth}
                            play={true}
                            forceAndroidAutoplay={true}
                            onReady={handlePlayerReady}
                            onError={handlePlayerError}
                            initialPlayerParams={{
                                modestbranding: true,
                                rel: false,
                                controls: true
                            }}
                            webViewProps={{
                                androidLayerType: 'hardware',
                                allowsInlineMediaPlayback: true,
                            }}
                        />
                    )}

                    {/* Fallback Guard */}
                    {hasError && (
                        <Animated.View entering={FadeIn.duration(400)} style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: '#1A1A1A' }]}>
                            <Feather name="alert-triangle" size={42} color={colors.error} style={{ marginBottom: spacing.md }} />
                            <Text style={styles.errorTitle}>
                                {errorReason === 'not_embeddable' ? "Playback Disabled" : "Failed to load"}
                            </Text>
                            <Text style={styles.errorSubtitle}>
                                {getErrorCopy()}
                            </Text>
                            {trailerUrl && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                                    onPress={() => {
                                        Linking.openURL(trailerUrl).catch(() => { });
                                        onClose();
                                    }}
                                >
                                    <Feather name="external-link" size={16} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.actionButtonText}>Watch on YouTube</Text>
                                </TouchableOpacity>
                            )}
                        </Animated.View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        right: spacing.L,
        zIndex: 50,
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 8,
        borderRadius: 24,
    },
    playerStage: {
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 8,
    },
    errorSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: spacing.xl,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: borderRadius.md,
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '800',
    },
});
