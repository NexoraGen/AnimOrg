import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Platform,
    Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';

import { spacing, borderRadius, colors } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store/useAppStore';
import { RecommendationService, RecommendationResult } from '../../services/RecommendationService';
import { HorizontalCarousel } from '../ui/HorizontalCarousel';
import { PosterCard } from '../ui/PosterCard';

export const ForYouSection: React.FC = () => {
    const router = useRouter();
    const themeColors = useThemeColors();

    // Subscriptions to refresh on change
    const watchlist = useAppStore(s => s.watchlist);
    const userRatings = useAppStore(s => s.userRatings);
    const getFavoriteGenres = useAppStore(s => s.getFavoriteGenres);

    const [level, setLevel] = useState<number>(0);
    const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Transition & status logic
    useEffect(() => {
        const totalTracked = watchlist.length;
        let currentLevel = 0;
        if (totalTracked === 0) {
            currentLevel = 0;
        } else if (totalTracked <= 2) {
            currentLevel = 1;
        } else if (totalTracked <= 5) {
            currentLevel = 2;
        } else {
            currentLevel = 3;
        }
        setLevel(currentLevel);

        if (currentLevel === 0) {
            setRecommendations([]);
            setIsLoading(false);
            return;
        }

        // Fetch recommendations based on level requirements
        const fetchPersonalized = async () => {
            setIsLoading(true);
            try {
                const count = currentLevel === 1 ? 10 : currentLevel === 2 ? 15 : 20;
                const res = await RecommendationService.getPersonalizedRecommendations(
                    watchlist,
                    userRatings,
                    getFavoriteGenres(),
                    count
                );
                setRecommendations(res);
            } catch (err) {
                console.error('[ForYouSection] Failed to fetch recs:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPersonalized();
    }, [watchlist.length, userRatings.length]);

    const handleMediaPress = useCallback((id: string) => {
        router.push(`/details/${id}`);
    }, [router]);

    const handleBrowse = useCallback(() => {
        router.push('/(tabs)/search');
    }, [router]);

    const handleExploreTrending = useCallback(() => {
        router.push('/category/trending');
    }, [router]);

    const renderReasonBadge = useCallback((item: RecommendationResult) => (
        <View style={{ width: 170, paddingBottom: 4 }}>
            <PosterCard
                media={item.anime}
                onPress={handleMediaPress}
                width={154}
                height={224}
                disableEntryAnimation
            />
            <View style={[
                styles.reasonBadge,
                {
                    backgroundColor: `${themeColors.primary}10`,
                    borderColor: `${themeColors.primary}30`
                }
            ]}>
                <Text style={[styles.reasonBadgeText, { color: themeColors.primary }]} numberOfLines={2}>
                    {item.reason}
                </Text>
            </View>
        </View>
    ), [themeColors, handleMediaPress]);

    // Level 0 Design
    if (level === 0) {
        return (
            <Animated.View
                entering={FadeIn.duration(400)}
                exiting={FadeOut.duration(300)}
                layout={Layout.springify()}
                style={styles.container}
            >
                <LinearGradient
                    colors={['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']}
                    style={[styles.glowCard, { borderColor: themeColors.border }]}
                >
                    {/* Onboarding illustration mockup */}
                    <View style={styles.illustrationContainer}>
                        <View style={[styles.illustGlowCircle, { backgroundColor: `${themeColors.primary}15` }]} />
                        <LinearGradient
                            colors={[`${themeColors.primary}30`, `${themeColors.primary}05`]}
                            style={[styles.illustMainCircle, { borderColor: `${themeColors.primary}40` }]}
                        >
                            <Feather name="compass" size={42} color={themeColors.primary} />
                        </LinearGradient>
                        <View style={[styles.illustSparkle, { top: 10, right: 10 }]}>
                            <Feather name="award" size={14} color={themeColors.primary} />
                        </View>
                        <View style={[styles.illustSparkle, { bottom: 15, left: 10 }]}>
                            <Feather name="star" size={12} color={themeColors.primary} />
                        </View>
                    </View>

                    <Text style={[styles.onboardTitle, { color: themeColors.text }]}>
                        ✨ Your recommendations start here
                    </Text>
                    <Text style={[styles.onboardDesc, { color: themeColors.textDim }]}>
                        Start building your anime journey by tracking your favorite series and creating your Watchlist. The more you watch and track, the smarter your recommendations become.
                    </Text>

                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            style={[styles.btnPrimary, { backgroundColor: themeColors.primary }]}
                            onPress={handleBrowse}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.btnPrimaryText}>Browse Anime</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btnSecondary, { borderColor: themeColors.border }]}
                            onPress={handleExploreTrending}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.btnSecondaryText, { color: themeColors.text }]}>Explore Trending</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </Animated.View>
        );
    }

    // Level 1 Design
    if (level === 1) {
        return (
            <Animated.View
                entering={FadeIn.duration(400)}
                exiting={FadeOut.duration(300)}
                layout={Layout.springify()}
                style={styles.listContainer}
            >
                <LinearGradient
                    colors={['rgba(255, 59, 48, 0.05)', 'rgba(255, 50, 48, 0.01)']}
                    style={[styles.stageCard, { borderColor: `${themeColors.primary}30` }]}
                >
                    <View style={styles.stageHeader}>
                        <View style={styles.stageTextCol}>
                            <View style={styles.badgeRow}>
                                <Text style={[styles.stageTitle, { color: themeColors.text }]}>
                                    We're getting to know your taste!
                                </Text>
                                <View style={[styles.badge, { backgroundColor: `${themeColors.primary}20` }]}>
                                    <Text style={[styles.badgeText, { color: themeColors.primary }]}>Early Recommendations</Text>
                                </View>
                            </View>
                            <Text style={[styles.stageDesc, { color: themeColors.textDim }]}>
                                You've started your anime journey. Track a few more anime and your recommendations will become much more accurate.
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                <HorizontalCarousel
                    title="Made For Your Taste"
                    icon="heart"
                    data={recommendations as any}
                    isLoading={isLoading}
                    onPress={handleMediaPress}
                    onViewAll={() => router.push('/category/made-for-you')}
                    renderItem={({ item }) => renderReasonBadge(item)}
                    itemWidth={180}
                />
            </Animated.View>
        );
    }

    // Level 2 Design
    if (level === 2) {
        return (
            <Animated.View
                entering={FadeIn.duration(400)}
                exiting={FadeOut.duration(300)}
                layout={Layout.springify()}
                style={styles.listContainer}
            >
                <LinearGradient
                    colors={['rgba(255, 255, 255, 0.02)', 'transparent']}
                    style={[styles.stageCard, { borderColor: themeColors.border }]}
                >
                    <View style={styles.stageHeader}>
                        <View style={styles.stageTextCol}>
                            <Text style={[styles.stageTitle, { color: themeColors.text }]}>
                                Recommendations are getting smarter
                            </Text>
                            <Text style={[styles.stageDesc, { color: themeColors.textDim }]}>
                                We're learning what you enjoy. Expect more personalized picks from now on.
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                <HorizontalCarousel
                    title="Made For Your Taste"
                    icon="heart"
                    data={recommendations as any}
                    isLoading={isLoading}
                    onPress={handleMediaPress}
                    onViewAll={() => router.push('/category/made-for-you')}
                    renderItem={({ item }) => renderReasonBadge(item)}
                    itemWidth={180}
                />
            </Animated.View>
        );
    }

    // Level 3 Design (Fully Personalized)
    return (
        <Animated.View
            entering={FadeIn.duration(400)}
            exiting={FadeOut.duration(300)}
            layout={Layout.springify()}
        >
            <HorizontalCarousel
                title="Made Just For You"
                icon="heart"
                data={recommendations as any}
                isLoading={isLoading}
                onPress={handleMediaPress}
                onViewAll={() => router.push('/category/made-for-you')}
                renderItem={({ item }) => renderReasonBadge(item)}
                itemWidth={180}
            />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.md,
        marginBottom: spacing.xxl,
    },
    listContainer: {
        marginBottom: spacing.xxl,
    },
    glowCard: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    illustrationContainer: {
        width: 100,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        marginTop: spacing.xs,
    },
    illustGlowCircle: {
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: 45,
        opacity: 0.8,
    },
    illustMainCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    illustSparkle: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    onboardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    onboardDesc: {
        fontSize: 13,
        lineHeight: 18,
        textAlign: 'center',
        paddingHorizontal: spacing.sm,
        marginBottom: spacing.xl,
    },
    buttonGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        width: '100%',
    },
    btnPrimary: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnPrimaryText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    btnSecondary: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    btnSecondaryText: {
        fontSize: 14,
        fontWeight: '600',
    },
    stageCard: {
        marginHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    stageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stageTextCol: {
        flex: 1,
        gap: 4,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 4,
    },
    stageTitle: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    stageDesc: {
        fontSize: 12,
        lineHeight: 16,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '800',
    },
    reasonBadge: {
        marginTop: 6,
        marginHorizontal: 8,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center'
    },
    reasonBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        textAlign: 'center'
    }
});
