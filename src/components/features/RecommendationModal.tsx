import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
    ScrollView,
    useWindowDimensions
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Media } from '../../types';
import { colors, spacing } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { Button } from '../ui/Button';
import { CinematicModal } from '../layout/CinematicModal';

interface RecommendationModalProps {
    visible: boolean;
    onClose: () => void;
    recommendation: {
        anime: Media;
        reason: string;
        score?: number;
        mode?: 'personalized' | 'community';
    } | null;
    onNotInterested: (id: string) => void;
    onRecommendAgain: () => void;
    onAddToWatchlist: (anime: Media) => void;
    onViewDetails: (id: string) => void;
    isLoading: boolean;
    isAdded?: boolean;
    isAdding?: boolean;
}

export const RecommendationModal: React.FC<RecommendationModalProps> = ({
    visible,
    onClose,
    recommendation,
    onNotInterested,
    onRecommendAgain,
    onAddToWatchlist,
    onViewDetails,
    isLoading,
    isAdded = false,
    isAdding = false
}) => {
    const theme = useThemeColors();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    // Premium Netflix-style cross-fade and translation animation drivers
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(25)).current;
    const [displayRec, setDisplayRec] = React.useState(recommendation);

    React.useEffect(() => {
        if (!visible) {
            // Reset state values when modal is closed
            fadeAnim.setValue(0);
            slideAnim.setValue(25);
            setDisplayRec(null);
            return;
        }

        if (recommendation) {
            if (!displayRec) {
                // First Mount/Load Entry animation
                setDisplayRec(recommendation);
                Animated.parallel([
                    Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
                    Animated.spring(slideAnim, { toValue: 0, tension: 45, friction: 8, useNativeDriver: true })
                ]).start();
            } else if (displayRec.anime.id !== recommendation.anime.id) {
                // High-fidelity Cross-fade translation triggered by Try Again clicks
                Animated.timing(fadeAnim, {
                    toValue: 0.1,
                    duration: 160,
                    useNativeDriver: true
                }).start(() => {
                    setDisplayRec(recommendation);
                    slideAnim.setValue(20); // shift up slightly before entry
                    Animated.parallel([
                        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
                        Animated.spring(slideAnim, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true })
                    ]).start();
                });
            }
        }
    }, [recommendation, visible]);

    // Keep displaying the current recommendation card while loading standard background refreshes to prevent flickering
    const showCard = displayRec !== null;

    // Dynamic image height: ~45% of the modal's computed height for a cinematic feel
    const modalWidth = Math.min(screenWidth * 0.92, 500);
    const targetModalHeight = Math.min(modalWidth * (16 / 9), (screenHeight - 80) * 0.92);
    const imageHeight = Math.round(targetModalHeight * 0.58);

    return (
        <CinematicModal
            visible={visible}
            onClose={onClose}
            maxWidth={500}
            phoneStyle={true}
        >
            <View style={styles.container}>
                {isLoading && !showCard ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <AnimatedLoadingText />
                    </View>
                ) : displayRec ? (
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], flex: 1 }}>
                        {/* Image Section — cinematic hero poster (FIXED position at the top) */}
                        <View style={[styles.imageSection, { height: imageHeight }]}>
                            <Image
                                source={displayRec.anime.posterPath}
                                style={styles.poster}
                                contentFit="cover"
                                transition={400}
                                cachePolicy="memory-disk"
                            />
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(28, 28, 30, 1)']}
                                style={styles.imageOverlay}
                            />
                            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                                <View style={styles.closeIconWrapper}>
                                    <Feather name="x" size={20} color="#FFF" />
                                </View>
                            </TouchableOpacity>

                            <View style={styles.headerBadges}>
                                <View style={[
                                    styles.badge,
                                    displayRec.mode === 'community' && { backgroundColor: '#E06600' }
                                ]}>
                                    <Feather
                                        name={displayRec.mode === 'community' ? "activity" : "user"}
                                        size={10}
                                        color="#FFF"
                                        style={{ marginRight: 4 }}
                                    />
                                    <Text style={styles.badgeText}>
                                        {displayRec.mode === 'community' ? '🔥 POPULAR AMONG COMMUNITY' : '✨ RECOMMENDED FOR YOU'}
                                    </Text>
                                </View>
                                <View style={[styles.matchBadge, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                    <Feather name="target" size={10} color={colors.primary} />
                                    <Text style={styles.matchBadgeText}>
                                        {Math.min(98, Math.max(76, Math.floor(displayRec.score || 88)))}% MATCH
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.titleOverlay}>
                                <Text style={styles.genresOverlay} numberOfLines={1}>
                                    {displayRec.anime.genres.slice(0, 3).join(' • ')}
                                </Text>
                                <Text style={styles.overlayTitle} numberOfLines={2}>
                                    {displayRec.anime.title}
                                </Text>
                                <View style={styles.ratingRow}>
                                    <Feather name="star" size={16} color={colors.primary} fill={colors.primary} />
                                    <Text style={styles.ratingTextOverlay}>{displayRec.anime.score || 'N/A'}</Text>
                                    <Text style={styles.ratingLabelOverlay}>MAL Rating</Text>

                                    {isLoading && (
                                        <ActivityIndicator
                                            size="small"
                                            color="#E50914"
                                            style={{ marginLeft: 15 }}
                                        />
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* Content Section — scrollable text + actions */}
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                        >
                            <View style={styles.content}>
                                {/* Reasoning Section */}
                                <View style={[styles.reasoningCard, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                                    <View style={styles.reasonHeader}>
                                        <View style={styles.zapIcon}>
                                            <Feather
                                                name={displayRec.mode === 'community' ? "trending-up" : "heart"}
                                                size={12}
                                                color={colors.primary}
                                            />
                                        </View>
                                        <Text style={[styles.reasonLabel, { color: theme.primary }]}>
                                            {displayRec.mode === 'community' ? 'COMMUNITY BUZZ' : 'WHY THIS MATCHES'}
                                        </Text>
                                    </View>
                                    <Text style={[styles.reasonText, { color: theme.text }]}>
                                        {displayRec.reason}
                                    </Text>
                                </View>

                                {/* Actions */}
                                <View style={styles.actions}>
                                    <View style={styles.mainActions}>
                                        <Button
                                            title="View Details"
                                            variant="outline"
                                            onPress={() => onViewDetails(displayRec.anime.id)}
                                            style={[styles.mainAction, { borderColor: theme.primary }]}
                                            textStyle={[styles.mainActionText, { color: theme.primary }]}
                                        />
                                        <Button
                                            title={isAdded ? "Added to Watchlist" : "Add to Watchlist"}
                                            icon={<Feather name={isAdded ? "check" : "plus"} size={20} color="#FFF" />}
                                            onPress={() => onAddToWatchlist(displayRec.anime)}
                                            style={[
                                                styles.mainAction,
                                                isAdded && { backgroundColor: '#4CAF50', shadowColor: '#4CAF50' }
                                            ]}
                                            textStyle={styles.mainActionText}
                                            isLoading={isAdding}
                                            disabled={isAdded}
                                        />
                                    </View>

                                    <View style={styles.secondaryActions}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}
                                            onPress={() => onNotInterested(displayRec.anime.id)}
                                        >
                                            <Feather name="eye-off" size={16} color={theme.textDim} />
                                            <Text style={[styles.actionBtnText, { color: theme.textDim }]}>Not Interested</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}
                                            onPress={onRecommendAgain}
                                            disabled={isLoading}
                                        >
                                            <Feather name="refresh-cw" size={16} color={theme.textDim} />
                                            <Text style={[styles.actionBtnText, { color: theme.textDim }]}>Try Again</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                    </Animated.View>
                ) : (
                    <View style={styles.errorContainer}>
                        <Feather name="alert-circle" size={48} color={theme.textDim} />
                        <Text style={[styles.errorTitle, { color: theme.text }]}>No Matches Found</Text>
                        <Text style={[styles.errorDesc, { color: theme.textDim }]}>
                            Try rating more shows or adding items to your watchlist so our brain has more data to work with!
                        </Text>
                        <Button title="Close" onPress={onClose} variant="outline" style={{ marginTop: spacing.lg }} />
                    </View>
                )}
            </View>
        </CinematicModal>
    );
};

const AnimatedLoadingText = () => {
    const theme = useThemeColors();
    return (
        <Text style={[styles.loadingText, { color: theme.textDim }]}>Consulting the anime gods...</Text>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 30,
    },
    loaderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    imageSection: {
        width: '100%',
        position: 'relative',
    },
    poster: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    closeBtn: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        zIndex: 10,
    },
    closeIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    headerBadges: {
        position: 'absolute',
        top: spacing.md,
        left: spacing.md,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    badge: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        alignItems: 'center',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    matchBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    matchBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    titleOverlay: {
        position: 'absolute',
        bottom: spacing.md,
        left: spacing.md,
        right: spacing.md,
    },
    overlayTitle: {
        color: '#FFF',
        fontSize: 26,
        fontWeight: '900',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
        letterSpacing: -0.5,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 6,
    },
    ratingTextOverlay: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    ratingLabelOverlay: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 2,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    genresOverlay: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.65)',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    headerRow: {
        marginBottom: spacing.lg,
    },
    titleInfo: {
        flex: 1,
    },
    metadata: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    genres: {
        fontSize: 14,
        flex: 1,
        fontWeight: '500',
    },
    reasoningCard: {
        padding: spacing.lg,
        borderRadius: 16,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    reasonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    zapIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(229, 9, 20, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    reasonLabel: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    reasonText: {
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '500',
    },
    actions: {
        gap: spacing.lg,
    },
    mainActions: {
        flexDirection: 'row',
        gap: spacing.md,
        width: '100%',
    },
    mainAction: {
        flex: 1,
        height: 54,
        borderRadius: 14,
    },
    mainActionText: {
        fontSize: 16,
        fontWeight: '800',
    },
    secondaryActions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    actionBtn: {
        flex: 1,
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    errorContainer: {
        flex: 1,
        padding: spacing.xxl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: spacing.md,
    },
    errorDesc: {
        fontSize: 15,
        textAlign: 'center',
        marginTop: spacing.sm,
        lineHeight: 22,
    }
});
