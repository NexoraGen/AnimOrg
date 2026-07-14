import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, FadeOut, FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { typography, spacing, borderRadius } from '../../theme';
import { LevelInfo } from '../../services/LevelService';
import { getXpForLevel } from '../../config/levelConfig';

interface RankDetailsModalProps {
    visible: boolean;
    onClose: () => void;
    levelInfo: LevelInfo;
}

export const RankDetailsModal: React.FC<RankDetailsModalProps> = ({ visible, onClose, levelInfo }) => {
    const themeColors = useThemeColors();

    if (!visible) return null;

    const xpForNextRank = levelInfo.nextRankMinLevel ? getXpForLevel(levelInfo.nextRankMinLevel) : 0;
    const xpNeededForNextRank = Math.max(0, xpForNextRank - levelInfo.currentXp);

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View
                    entering={FadeIn.duration(250)}
                    exiting={FadeOut.duration(200)}
                    style={[styles.backdrop, { backgroundColor: 'rgba(10, 10, 14, 0.92)' }]}
                    onTouchStart={onClose}
                />

                <Animated.View
                    entering={FadeInUp.duration(350).springify().damping(18)}
                    exiting={FadeOutDown.duration(200)}
                    style={[styles.card, { backgroundColor: themeColors.surface, borderColor: `${themeColors.primary}20` }]}
                >
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: themeColors.text }]}>AnimOrg Rank</Text>
                        <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                            <Feather name="x" size={18} color="white" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.rankBadgeRow}>
                        <Text style={styles.rankIcon}>{levelInfo.rankIcon}</Text>
                        <View>
                            <Text style={[styles.rankTitle, { color: themeColors.primary }]}>{levelInfo.rankTitle}</Text>
                            <Text style={[styles.levelSubtitle, { color: themeColors.textDim }]}>Level {levelInfo.level} • {levelInfo.currentXp} XP</Text>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />

                    <Text style={[styles.label, { color: 'rgba(255,255,255,0.4)' }]}>RANK DESCRIPTION</Text>
                    <Text style={[styles.description, { color: themeColors.text }]}>
                        "{levelInfo.rankDescription}"
                    </Text>

                    <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />

                    <Text style={[styles.label, { color: 'rgba(255,255,255,0.4)' }]}>NEXT RANK PROGRESS</Text>
                    {levelInfo.nextRankTitle ? (
                        <View style={styles.nextRankBox}>
                            <View style={styles.nextRankLabelRow}>
                                <Text style={[styles.nextRankTitleText, { color: 'white' }]}>
                                    Next Rank: <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>{levelInfo.nextRankTitle}</Text>
                                </Text>
                                <Text style={[styles.nextRankLevelText, { color: themeColors.textDim }]}>
                                    Min. Level {levelInfo.nextRankMinLevel}
                                </Text>
                            </View>
                            <Text style={[styles.xpNeededText, { color: themeColors.textDim }]}>
                                Needs <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>{xpNeededForNextRank} XP</Text> more to ascend.
                            </Text>
                        </View>
                    ) : (
                        <Text style={[styles.description, { color: themeColors.primary }]}>
                            You have attained the ultimate rank: AnimOrg Legend! 🚀
                        </Text>
                    )}

                    <TouchableOpacity
                        style={[styles.btn, { backgroundColor: themeColors.primary }]}
                        onPress={onClose}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.btnText}>Got It</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    card: {
        width: '85%',
        maxWidth: 340,
        borderRadius: 24,
        borderWidth: 1,
        padding: spacing.xl,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    closeButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginVertical: spacing.sm,
    },
    rankIcon: {
        fontSize: 36,
    },
    rankTitle: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    levelSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    divider: {
        height: 1,
        width: '100%',
        marginVertical: spacing.md,
    },
    label: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 8,
    },
    description: {
        fontSize: 13,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    nextRankBox: {
        marginTop: 2,
        gap: 4,
    },
    nextRankLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    nextRankTitleText: {
        fontSize: 13,
    },
    nextRankLevelText: {
        fontSize: 11,
    },
    xpNeededText: {
        fontSize: 12,
    },
    btn: {
        width: '100%',
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xl,
    },
    btnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
