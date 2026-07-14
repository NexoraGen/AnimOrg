import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    FlatList,
    Platform,
    useWindowDimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography } from '../src/theme';
import { GlassHeader, Button, AnimatedPressable } from '../src/components/ui';
import { AnimatedScreen } from '../src/components/layout/AnimatedScreen';
import { useAppStore } from '../src/store/useAppStore';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { ACHIEVEMENTS, Badge } from '../src/config/achievements';
import { AchievementService } from '../src/services/AchievementService';
import { CinematicModal } from '../src/components/layout/CinematicModal';

export default function AchievementsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const themeColors = useThemeColors();
    const { width } = useWindowDimensions();

    const user = useAppStore(state => state.user);
    const watchlist = useAppStore(state => state.watchlist);
    const userRatings = useAppStore(state => state.userRatings);
    const collections = useAppStore(state => state.collections);
    const animeProgress = useAppStore(state => state.animeProgress);
    const setFavoriteAchievementAction = useAppStore(state => state.setFavoriteAchievementAction);

    // Filter States
    const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    // Selected badge detail modal state
    const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

    const earnedBadges = useMemo(() => user?.badges || [], [user?.badges]);
    const favoriteBadgeId = useMemo(() => user?.favoriteBadgeId || null, [user?.favoriteBadgeId]);

    // Categories list extracted from configurations
    const categories = useMemo(() => {
        const list = Array.from(new Set(ACHIEVEMENTS.map(a => a.category)));
        return ['all', ...list];
    }, []);

    // Compute live progress stats for all achievements
    const achievementsWithProgress = useMemo(() => {
        return ACHIEVEMENTS.map(badge => {
            const isUnlocked = earnedBadges.includes(badge.id);

            // Calculate progress data dynamically using AchievementService
            const progressData = AchievementService.getBadgeProgress(badge.id, watchlist, animeProgress, {
                longestStreak: user?.longestStreak || 0,
                userRatings,
                collections,
                totalReviews: user?.totalReviews || 0,
                reviewLikes: 0
            });

            const requirementLabel = badge.description;

            return {
                ...badge,
                isUnlocked,
                progress: progressData.percentage,
                currentValue: progressData.current,
                targetValue: progressData.target,
                requirementLabel
            };
        });
    }, [earnedBadges, watchlist, animeProgress, user, userRatings, collections]);

    // Filter badges
    const filteredBadges = useMemo(() => {
        return achievementsWithProgress.filter(badge => {
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'unlocked' && badge.isUnlocked) ||
                (statusFilter === 'locked' && !badge.isUnlocked);

            const matchesCategory =
                categoryFilter === 'all' ||
                badge.category === categoryFilter;

            return matchesStatus && matchesCategory;
        });
    }, [achievementsWithProgress, statusFilter, categoryFilter]);

    const toggleShowcaseBadge = async (badgeId: string) => {
        if (favoriteBadgeId === badgeId) {
            await setFavoriteAchievementAction(null);
        } else {
            await setFavoriteAchievementAction(badgeId);
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category.toLowerCase()) {
            case 'watching': return 'play-circle';
            case 'episodes': return 'tv';
            case 'tracking': return 'layers';
            case 'watchlist': return 'bookmark';
            case 'genres': return 'compass';
            case 'consistency': return 'calendar';
            case 'collections': return 'folder-plus';
            case 'ratings': return 'star';
            case 'community': return 'users';
            default: return 'award';
        }
    };

    const formatCategoryName = (category: string) => {
        if (category === 'all') return 'All';
        return category.charAt(0).toUpperCase() + category.slice(1);
    };

    return (
        <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
            <GlassHeader
                title="Achievements"
                leftComponent={
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                        <Feather name="chevron-left" size={24} color={themeColors.text} />
                    </TouchableOpacity>
                }
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
                showsVerticalScrollIndicator={false}
            >
                {/* PROGRESS OVERVIEW BANNER */}
                <View style={[styles.overviewCard, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }]}>
                    <View style={styles.overviewHeader}>
                        <View>
                            <Text style={[styles.overviewTitle, { color: 'white' }]}>Badges Progress</Text>
                            <Text style={[styles.overviewSubtitle, { color: themeColors.textMuted }]}>
                                {earnedBadges.length} of {ACHIEVEMENTS.length} completed
                            </Text>
                        </View>
                        <View style={[styles.overviewIconCircle, { backgroundColor: `${themeColors.primary}12` }]}>
                            <Feather name="award" size={28} color={themeColors.primary} />
                        </View>
                    </View>

                    <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                        <View
                            style={[
                                styles.progressBar,
                                {
                                    backgroundColor: themeColors.primary,
                                    width: `${(earnedBadges.length / ACHIEVEMENTS.length) * 100}%`
                                }
                            ]}
                        />
                    </View>
                </View>

                {/* STATUS FILTERS RANGE */}
                <View style={styles.filterRow}>
                    {(['all', 'unlocked', 'locked'] as const).map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: statusFilter === filter ? themeColors.primary : 'rgba(255,255,255,0.04)',
                                    borderColor: statusFilter === filter ? themeColors.primary : 'rgba(255,255,255,0.08)'
                                }
                            ]}
                            onPress={() => setStatusFilter(filter)}
                        >
                            <Text style={[styles.filterChipText, { color: statusFilter === filter ? 'white' : themeColors.textDim }]}>
                                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* HORIZONTAL CATEGORY SCROLLER */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryScroller}
                    contentContainerStyle={styles.categoryScrollContent}
                >
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            style={[
                                styles.categoryChip,
                                {
                                    backgroundColor: categoryFilter === cat ? `${themeColors.primary}20` : 'rgba(255,255,255,0.02)',
                                    borderColor: categoryFilter === cat ? themeColors.primary : 'rgba(255,255,255,0.05)'
                                }
                            ]}
                            onPress={() => setCategoryFilter(cat)}
                        >
                            <Feather
                                name={getCategoryIcon(cat) as any}
                                size={14}
                                color={categoryFilter === cat ? themeColors.primary : themeColors.textDim}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={[styles.categoryChipText, { color: categoryFilter === cat ? themeColors.primary : themeColors.textDim }]}>
                                {formatCategoryName(cat)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* BADGES GRID */}
                {filteredBadges.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Feather name="search" size={48} color="rgba(255,255,255,0.15)" style={{ marginBottom: spacing.md }} />
                        <Text style={[styles.emptyText, { color: themeColors.textDim }]}>No badges match the selected filters.</Text>
                    </View>
                ) : (
                    <View style={styles.gridContainer}>
                        {filteredBadges.map((badge) => {
                            const isFavorite = favoriteBadgeId === badge.id;
                            return (
                                <AnimatedPressable
                                    key={badge.id}
                                    style={[
                                        styles.badgeCard,
                                        {
                                            width: (width - (spacing.xl * 2) - 16) / 2,
                                            backgroundColor: 'rgba(255,255,255,0.02)',
                                            borderColor: isFavorite ? themeColors.primary : 'rgba(255,255,255,0.04)'
                                        }
                                    ]}
                                    onPress={() => setSelectedBadge(badge)}
                                >
                                    <View style={[
                                        styles.badgeIconContainer,
                                        {
                                            backgroundColor: badge.isUnlocked ? `${themeColors.primary}12` : 'rgba(255,255,255,0.03)',
                                            borderColor: badge.isUnlocked ? `${themeColors.primary}30` : 'rgba(255,255,255,0.05)'
                                        }
                                    ]}>
                                        <Feather
                                            name={(badge.icon || "award") as any}
                                            size={24}
                                            color={badge.isUnlocked ? themeColors.primary : 'rgba(255,255,255,0.2)'}
                                        />
                                    </View>

                                    <Text style={[styles.badgeTitle, { color: badge.isUnlocked ? 'white' : 'rgba(255,255,255,0.4)' }]} numberOfLines={1}>
                                        {badge.title}
                                    </Text>

                                    <Text style={[styles.badgeCategoryTitle, { color: themeColors.textMuted }]}>
                                        {formatCategoryName(badge.category)}
                                    </Text>

                                    {/* Compact Progress Indicator */}
                                    {!badge.isUnlocked && (
                                        <View style={styles.badgeProgressContainer}>
                                            <View style={[styles.badgeProgressTrack, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                                                <View style={[styles.badgeProgressBar, { backgroundColor: themeColors.primary, width: `${badge.progress}%` }]} />
                                            </View>
                                            <Text style={[styles.badgeProgressText, { color: themeColors.textDim }]}>
                                                {Math.round(badge.progress)}%
                                            </Text>
                                        </View>
                                    )}

                                    {/* Showcase Indicator Badge overlay */}
                                    {isFavorite && (
                                        <View style={[styles.showcaseIndicator, { backgroundColor: themeColors.primary }]}>
                                            <Feather name="star" size={8} color="white" />
                                        </View>
                                    )}
                                </AnimatedPressable>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* DETAILED BADGE MODAL */}
            <CinematicModal
                visible={!!selectedBadge}
                onClose={() => setSelectedBadge(null)}
                maxWidth={350}
            >
                {selectedBadge && (() => {
                    // Re-fetch badge with live calculations
                    const activeBadgeCalc = achievementsWithProgress.find(b => b.id === selectedBadge.id)!;
                    const isFavorite = favoriteBadgeId === activeBadgeCalc.id;

                    return (
                        <View style={styles.modalContent}>
                            <View style={[
                                styles.modalTrophyCircle,
                                {
                                    backgroundColor: activeBadgeCalc.isUnlocked ? `${themeColors.primary}12` : 'rgba(255,255,255,0.03)',
                                    borderColor: activeBadgeCalc.isUnlocked ? `${themeColors.primary}30` : 'rgba(255,255,255,0.05)'
                                }
                            ]}>
                                <Feather
                                    name={(activeBadgeCalc.icon || "award") as any}
                                    size={48}
                                    color={activeBadgeCalc.isUnlocked ? themeColors.primary : 'rgba(255,255,255,0.2)'}
                                />
                            </View>

                            <Text style={[styles.modalTitle, { color: 'white' }]}>{activeBadgeCalc.title}</Text>
                            <Text style={[styles.modalCategory, { color: themeColors.primary }]}>
                                {formatCategoryName(activeBadgeCalc.category).toUpperCase()} BADGE
                            </Text>

                            <Text style={[styles.modalDesc, { color: themeColors.textDim }]}>
                                {activeBadgeCalc.description}
                            </Text>

                            {/* Requirement detailed line */}
                            <View style={[styles.modalMetaBox, { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }]}>
                                <Text style={[styles.metaLabel, { color: 'rgba(255,255,255,0.4)' }]}>Requirement</Text>
                                <Text style={[styles.metaValue, { color: 'white' }]}>
                                    {activeBadgeCalc.requirementLabel || 'Requirement details not configured'}
                                </Text>
                            </View>

                            {/* XP reward info */}
                            <View style={[styles.modalMetaBox, { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', marginTop: spacing.xs }]}>
                                <Text style={[styles.metaLabel, { color: 'rgba(255,255,255,0.4)' }]}>Reward</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Feather name="zap" size={12} color="#FFD700" style={{ marginRight: 4 }} />
                                    <Text style={[styles.metaValue, { color: 'white', fontWeight: 'bold' }]}>
                                        +{activeBadgeCalc.xpReward} XP
                                    </Text>
                                </View>
                            </View>

                            {/* Live progress section */}
                            <View style={styles.modalProgressSection}>
                                <View style={styles.modalProgressHeader}>
                                    <Text style={[styles.modalProgressLabel, { color: themeColors.textDim }]}>
                                        {activeBadgeCalc.isUnlocked ? 'Unlocked!' : 'Progress'}
                                    </Text>
                                    <Text style={[styles.modalProgressValue, { color: 'white' }]}>
                                        {activeBadgeCalc.currentValue} / {activeBadgeCalc.targetValue} ({Math.round(activeBadgeCalc.progress)}%)
                                    </Text>
                                </View>
                                <View style={[styles.modalProgressTrack, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                                    <View
                                        style={[
                                            styles.modalProgressBar,
                                            {
                                                backgroundColor: themeColors.primary,
                                                width: `${activeBadgeCalc.progress}%`
                                            }
                                        ]}
                                    />
                                </View>
                            </View>

                            {/* Showcase interaction */}
                            {activeBadgeCalc.isUnlocked ? (
                                <TouchableOpacity
                                    style={[
                                        styles.showcaseBtn,
                                        {
                                            backgroundColor: isFavorite ? 'rgba(255,255,255,0.05)' : themeColors.primary,
                                            borderColor: isFavorite ? themeColors.primary : 'transparent',
                                            borderWidth: isFavorite ? 1 : 0
                                        }
                                    ]}
                                    onPress={() => toggleShowcaseBadge(activeBadgeCalc.id)}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="star" size={16} color={isFavorite ? themeColors.primary : 'white'} style={{ marginRight: 8 }} />
                                    <Text style={[styles.showcaseBtnText, { color: isFavorite ? themeColors.primary : 'white' }]}>
                                        {isFavorite ? 'Remove Showcase' : 'Showcase on Profile'}
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={[styles.lockedDisclaimer, { backgroundColor: 'rgba(229, 9, 20, 0.05)', borderColor: 'rgba(229, 9, 20, 0.15)' }]}>
                                    <Feather name="lock" size={14} color="#FF3B30" style={{ marginRight: 6 }} />
                                    <Text style={styles.lockedDisclaimerText}>
                                        Unlock this badge to showcase it on your profile.
                                    </Text>
                                </View>
                            )}

                            <Button
                                title="Close"
                                variant="outline"
                                onPress={() => setSelectedBadge(null)}
                                style={styles.modalCloseBtn}
                            />
                        </View>
                    );
                })()}
            </CinematicModal>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.xl,
        gap: spacing.md,
    },
    overviewCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    overviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    overviewTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    overviewSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    overviewIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressTrack: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    filterRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    filterChip: {
        flex: 1,
        height: 38,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    categoryScroller: {
        flexGrow: 0,
        marginBottom: spacing.lg,
        marginHorizontal: -spacing.xl,
    },
    categoryScrollContent: {
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 36,
        paddingHorizontal: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
    },
    categoryChipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 50,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        justifyContent: 'flex-start',
    },
    badgeCard: {
        position: 'relative',
        borderRadius: 20,
        borderWidth: 1,
        padding: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    badgeIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    badgeTitle: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    badgeCategoryTitle: {
        fontSize: 9,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    badgeProgressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        width: '100%',
        marginTop: spacing.xs,
    },
    badgeProgressTrack: {
        flex: 1,
        height: 5,
        borderRadius: 2.5,
        overflow: 'hidden',
    },
    badgeProgressBar: {
        height: '100%',
        borderRadius: 2.5,
    },
    badgeProgressText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    showcaseIndicator: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalContent: {
        alignItems: 'center',
        paddingTop: spacing.md,
    },
    modalTrophyCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
        textAlign: 'center',
    },
    modalCategory: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
        marginTop: 2,
        marginBottom: spacing.md,
    },
    modalDesc: {
        fontSize: 14,
        lineHeight: 19,
        textAlign: 'center',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.sm,
    },
    modalMetaBox: {
        width: '100%',
        borderRadius: 14,
        borderWidth: 1,
        padding: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metaLabel: {
        fontSize: 13,
    },
    metaValue: {
        fontSize: 13,
        fontWeight: '700',
        maxWidth: '65%',
        textAlign: 'right',
    },
    modalProgressSection: {
        width: '100%',
        marginTop: spacing.lg,
        marginBottom: spacing.xxl,
    },
    modalProgressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    modalProgressLabel: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    modalProgressValue: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    modalProgressTrack: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    modalProgressBar: {
        height: '100%',
        borderRadius: 4,
    },
    showcaseBtn: {
        width: '100%',
        height: 48,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    showcaseBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    lockedDisclaimer: {
        width: '100%',
        borderRadius: 12,
        borderWidth: 1,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    lockedDisclaimerText: {
        color: '#FF3B30',
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    modalCloseBtn: {
        width: '100%',
        height: 48,
    },
});
