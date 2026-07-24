import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    useWindowDimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { AnimatedScreen } from '../src/components/layout/AnimatedScreen';
import { GlassHeader } from '../src/components/ui/GlassHeader';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useAppStore } from '../src/store/useAppStore';
import { LevelService } from '../src/services/LevelService';
import { RankService, RankProgressItem } from '../src/services/RankService';
import { spacing } from '../src/theme';

export default function RanksScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const themeColors = useThemeColors();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;

    const user = useAppStore(state => state.user);

    // Compute current user level and rank progress
    const levelInfo = useMemo(() => {
        return LevelService.getLevelInfo(user?.xp || 0);
    }, [user?.xp]);

    const allRanks = useMemo(() => {
        return RankService.getAllRanksWithProgress(levelInfo.level, levelInfo.currentXp);
    }, [levelInfo.level, levelInfo.currentXp]);

    const currentRankItem = useMemo(() => {
        return allRanks.find(r => r.status === 'current') || allRanks[0];
    }, [allRanks]);

    const nextRankItem = useMemo(() => {
        return allRanks.find(r => r.minimumLevel > levelInfo.level) || null;
    }, [allRanks, levelInfo.level]);

    return (
        <AnimatedScreen style={{ backgroundColor: themeColors.background }}>
            <GlassHeader
                title="AnimOrg Ranks"
                leftComponent={
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={[styles.headerButton, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
                        activeOpacity={0.7}
                    >
                        <Feather name="arrow-left" size={20} color={themeColors.text} />
                    </TouchableOpacity>
                }
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: Platform.OS === 'ios' ? insets.top + 60 : 70,
                        paddingBottom: insets.bottom + 40,
                        maxWidth: isDesktop ? 800 : '100%',
                        alignSelf: isDesktop ? 'center' : 'stretch',
                        width: '100%',
                    }
                ]}
            >
                {/* --- OVERALL PROGRESS HEADER CARD --- */}
                <Animated.View entering={FadeInUp.duration(400)}>
                    <LinearGradient
                        colors={[`${themeColors.primary}25`, 'rgba(20,20,28,0.95)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.progressCard, { borderColor: `${themeColors.primary}40` }]}
                    >
                        <View style={styles.cardHeaderRow}>
                            <View style={styles.rankIconBadge}>
                                <Text style={{ fontSize: 32 }}>{currentRankItem.icon}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.cardSubtitle, { color: themeColors.primary }]}>CURRENT RANK</Text>
                                <Text style={[styles.cardTitle, { color: themeColors.text }]}>{levelInfo.rankTitle}</Text>
                                <Text style={[styles.cardMetaText, { color: themeColors.textDim }]}>
                                    Level {levelInfo.level} • {levelInfo.currentXp.toLocaleString()} Total XP
                                </Text>
                            </View>
                        </View>

                        {/* XP Progress Track */}
                        <View style={styles.xpTrackWrapper}>
                            <View style={styles.xpTextRow}>
                                <Text style={[styles.xpText, { color: themeColors.textMuted }]}>
                                    {levelInfo.currentXp - levelInfo.xpForCurrentLevel} / {levelInfo.xpForNextLevel - levelInfo.xpForCurrentLevel} XP
                                </Text>
                                <Text style={[styles.xpPctText, { color: themeColors.primary }]}>
                                    {Math.round(levelInfo.progressPercentage)}%
                                </Text>
                            </View>

                            <View style={[styles.trackBackground, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                                <LinearGradient
                                    colors={[themeColors.primary, '#FF3B30']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.trackFill, { width: `${Math.min(100, Math.max(0, levelInfo.progressPercentage))}%` }]}
                                />
                            </View>
                        </View>

                        {/* Next Rank Requirement Banner */}
                        {nextRankItem ? (
                            <View style={[styles.nextRankBanner, { backgroundColor: `${themeColors.primary}12`, borderColor: `${themeColors.primary}30` }]}>
                                <Feather name="trending-up" size={16} color={themeColors.primary} />
                                <Text style={[styles.nextRankText, { color: themeColors.text }]}>
                                    You need <Text style={{ color: themeColors.primary, fontWeight: '800' }}>{(nextRankItem.xpRequired - levelInfo.currentXp).toLocaleString()} XP</Text> to reach <Text style={{ color: themeColors.primary, fontWeight: '800' }}>{nextRankItem.title}</Text>.
                                </Text>
                            </View>
                        ) : (
                            <View style={[styles.nextRankBanner, { backgroundColor: `${themeColors.primary}15`, borderColor: `${themeColors.primary}30` }]}>
                                <Feather name="award" size={16} color={themeColors.primary} />
                                <Text style={[styles.nextRankText, { color: themeColors.text }]}>
                                    You have reached the maximum rank: <Text style={{ color: themeColors.primary, fontWeight: '800' }}>AnimOrg Grandmaster</Text>!
                                </Text>
                            </View>
                        )}

                        {/* Motivational Text */}
                        <View style={styles.motivationalRow}>
                            <Feather name="zap" size={14} color="rgba(255,255,255,0.5)" />
                            <Text style={[styles.motivationalText, { color: themeColors.textDim }]}>
                                Keep watching and completing anime to unlock your next AnimOrg Rank.
                            </Text>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* --- SECTION TITLE --- */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>All AnimOrg Ranks</Text>
                    <Text style={[styles.sectionSubtitle, { color: themeColors.textDim }]}>9 Rank Tiers to Master</Text>
                </View>

                {/* --- RANKS TIMELINE LIST --- */}
                <View style={styles.ranksList}>
                    {allRanks.map((rank, index) => (
                        <RankCardItem
                            key={rank.id}
                            rank={rank}
                            index={index}
                            themeColors={themeColors}
                            isLast={index === allRanks.length - 1}
                        />
                    ))}
                </View>
            </ScrollView>
        </AnimatedScreen>
    );
}

interface RankCardItemProps {
    rank: RankProgressItem;
    index: number;
    themeColors: any;
    isLast: boolean;
}

const RankCardItem: React.FC<RankCardItemProps> = React.memo(({ rank, index, themeColors, isLast }) => {
    const isCurrent = rank.status === 'current';
    const isUnlocked = rank.status === 'unlocked';
    const isLocked = rank.status === 'locked';

    return (
        <Animated.View entering={FadeInUp.delay(index * 50).duration(300)}>
            <View style={styles.timelineRow}>
                {/* Timeline Connector Line */}
                {!isLast && (
                    <View
                        style={[
                            styles.timelineLine,
                            { backgroundColor: isUnlocked || isCurrent ? `${themeColors.primary}40` : 'rgba(255,255,255,0.06)' }
                        ]}
                    />
                )}

                {/* Rank Card Container */}
                <View
                    style={[
                        styles.rankCard,
                        isCurrent && [
                            styles.currentRankCard,
                            { borderColor: themeColors.primary, backgroundColor: `${themeColors.primary}12` }
                        ],
                        isUnlocked && {
                            borderColor: 'rgba(255,255,255,0.12)',
                            backgroundColor: 'rgba(255,255,255,0.03)'
                        },
                        isLocked && {
                            borderColor: 'rgba(255,255,255,0.05)',
                            backgroundColor: 'rgba(255,255,255,0.015)',
                            opacity: 0.6
                        }
                    ]}
                >
                    <View style={styles.cardTopRow}>
                        {/* Icon Circle */}
                        <View
                            style={[
                                styles.iconContainer,
                                isCurrent && { backgroundColor: `${themeColors.primary}25`, borderColor: themeColors.primary },
                                isUnlocked && { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' },
                                isLocked && { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }
                            ]}
                        >
                            <Text style={{ fontSize: 26 }}>{rank.icon}</Text>
                        </View>

                        {/* Rank Details */}
                        <View style={{ flex: 1, marginLeft: spacing.md }}>
                            <View style={styles.rankTitleRow}>
                                <Text
                                    style={[
                                        styles.rankItemTitle,
                                        { color: isCurrent ? themeColors.primary : themeColors.text }
                                    ]}
                                >
                                    {rank.title}
                                </Text>

                                {/* Status Badge */}
                                {isCurrent && (
                                    <View style={[styles.statusBadge, { backgroundColor: themeColors.primary }]}>
                                        <Text style={styles.statusBadgeText}>CURRENT RANK</Text>
                                    </View>
                                )}
                                {isUnlocked && (
                                    <View style={[styles.statusBadge, { backgroundColor: '#34C75925', borderColor: '#34C759' }]}>
                                        <Feather name="check" size={10} color="#34C759" style={{ marginRight: 2 }} />
                                        <Text style={[styles.statusBadgeText, { color: '#34C759' }]}>UNLOCKED</Text>
                                    </View>
                                )}
                                {isLocked && (
                                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                                        <Feather name="lock" size={10} color={themeColors.textDim} style={{ marginRight: 2 }} />
                                        <Text style={[styles.statusBadgeText, { color: themeColors.textDim }]}>LOCKED</Text>
                                    </View>
                                )}
                            </View>

                            {/* Requirement & Level */}
                            <Text style={[styles.reqText, { color: themeColors.textDim }]}>
                                Min Level {rank.minimumLevel} • {rank.xpRequired.toLocaleString()} XP
                            </Text>
                        </View>
                    </View>

                    {/* Description */}
                    <Text style={[styles.rankDescription, { color: isCurrent ? themeColors.text : themeColors.textMuted }]}>
                        "{rank.description}"
                    </Text>

                    {/* Progress Bar for Current Rank */}
                    {isCurrent && (
                        <View style={{ marginTop: spacing.md }}>
                            <View style={[styles.trackBackground, { height: 6, backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                <View
                                    style={[
                                        styles.trackFill,
                                        { height: 6, width: `${rank.progressPercentage}%`, backgroundColor: themeColors.primary }
                                    ]}
                                />
                            </View>
                        </View>
                    )}

                    {/* Locked XP Needed Banner */}
                    {isLocked && (
                        <Text style={[styles.lockedNeededText, { color: themeColors.textDim }]}>
                            Needs <Text style={{ color: themeColors.primary, fontWeight: '700' }}>{rank.xpNeededToUnlock.toLocaleString()} XP</Text> more to unlock.
                        </Text>
                    )}
                </View>
            </View>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    headerButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: spacing.xl,
    },
    progressCard: {
        borderRadius: 24,
        borderWidth: 1,
        padding: spacing.xl,
        marginBottom: spacing.xl,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rankIconBadge: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    cardSubtitle: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    cardMetaText: {
        fontSize: 12,
        marginTop: 2,
    },
    xpTrackWrapper: {
        marginTop: spacing.lg,
    },
    xpTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    xpText: {
        fontSize: 12,
        fontWeight: '600',
    },
    xpPctText: {
        fontSize: 12,
        fontWeight: '900',
    },
    trackBackground: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        width: '100%',
    },
    trackFill: {
        height: '100%',
        borderRadius: 4,
    },
    nextRankBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: spacing.lg,
    },
    nextRankText: {
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
    motivationalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: spacing.md,
    },
    motivationalText: {
        fontSize: 11,
        fontStyle: 'italic',
    },
    sectionHeader: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '900',
    },
    sectionSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    ranksList: {
        gap: spacing.md,
    },
    timelineRow: {
        position: 'relative',
    },
    timelineLine: {
        position: 'absolute',
        left: 28,
        top: 60,
        bottom: -16,
        width: 2,
        zIndex: -1,
    },
    rankCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: spacing.md,
    },
    currentRankCard: {
        shadowColor: '#E50914',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 4,
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 6,
    },
    rankItemTitle: {
        fontSize: 16,
        fontWeight: '900',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    statusBadgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    reqText: {
        fontSize: 12,
        marginTop: 2,
    },
    rankDescription: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: spacing.sm,
        fontStyle: 'italic',
    },
    lockedNeededText: {
        fontSize: 11,
        marginTop: spacing.sm,
    },
});
