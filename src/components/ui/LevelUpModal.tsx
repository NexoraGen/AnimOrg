import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, FadeOut, FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '../../hooks/useThemeColors';
import { typography, spacing, borderRadius } from '../../theme';
import { getLevelTitle } from '../../config/levelConfig';
import { RankService } from '../../services/RankService';

interface LevelUpModalProps {
    visible: boolean;
    onClose: () => void;
    oldLevel: number;
    newLevel: number;
    isRankUp?: boolean;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ visible, onClose, oldLevel, newLevel, isRankUp = false }) => {
    const themeColors = useThemeColors();
    const rankInfo = RankService.getRankByLevel(newLevel);

    useEffect(() => {
        if (visible) {
            // Trigger a triple success haptic feedback
            try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
                // Silent
            }
        }
    }, [visible]);

    if (!visible) return null;

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
                    style={[styles.backdrop, { backgroundColor: 'rgba(10, 10, 14, 0.94)' }]}
                />

                <Animated.View
                    entering={FadeInUp.duration(400).springify().damping(15)}
                    exiting={FadeOutDown.duration(200)}
                    style={[styles.card, { backgroundColor: themeColors.surface, borderColor: `${themeColors.primary}30` }]}
                >
                    {/* Confetti dots simulation */}
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                        <View style={[styles.dot, { backgroundColor: themeColors.primary, top: 40, left: 50 }]} />
                        <View style={[styles.dot2, { backgroundColor: '#FFD700', top: 90, right: 60 }]} />
                        <View style={[styles.dot, { backgroundColor: '#00BFFF', bottom: 100, left: 70 }]} />
                        <View style={[styles.dot2, { backgroundColor: '#ADFF2F', bottom: 120, right: 50 }]} />
                    </View>

                    <View style={[styles.glowCircle, { backgroundColor: `${themeColors.primary}12`, borderColor: `${themeColors.primary}30` }]}>
                        <Feather name={isRankUp ? "star" : "award"} size={48} color={themeColors.primary} />
                    </View>

                    <Text style={[styles.title, { color: themeColors.primary }]}>
                        {isRankUp ? 'NEW RANK UNLOCKED!' : 'LEVEL UP!'}
                    </Text>

                    <Text style={[styles.desc, { color: themeColors.textDim }]}>
                        {isRankUp
                            ? 'You have ascended to a high honor tier through your journey!'
                            : 'You have grown in your Otaku path. Keep watching to unlock further milestones!'}
                    </Text>

                    {isRankUp ? (
                        <View style={styles.rankCelebRow}>
                            <Text style={styles.rankCelebIcon}>{rankInfo.icon}</Text>
                            <Text style={[styles.rankCelebTitle, { color: 'white', fontWeight: 'bold' }]}>
                                {rankInfo.title}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.levelRow}>
                            <View style={[styles.levelBox, { backgroundColor: themeColors.surfaceVariant }]}>
                                <Text style={[styles.levelText, { color: themeColors.textDim }]}>{oldLevel}</Text>
                            </View>
                            <Feather name="arrow-right" size={24} color={themeColors.primary} style={styles.arrow} />
                            <View style={[styles.levelBox, { backgroundColor: themeColors.primary }]}>
                                <Text style={[styles.levelText, { color: '#FFF' }]}>{newLevel}</Text>
                            </View>
                        </View>
                    )}

                    <Text style={[styles.titleText, { color: themeColors.text, fontStyle: isRankUp ? 'italic' : 'normal' }]}>
                        {isRankUp
                            ? `"${rankInfo.description}"`
                            : `Rank Unlocked: ${getLevelTitle(newLevel)}`}
                    </Text>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: themeColors.primary }]}
                        onPress={onClose}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>Continue</Text>
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
        borderWidth: 1.5,
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 8,
    },
    glowCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    desc: {
        fontSize: 13,
        lineHeight: 18,
        textAlign: 'center',
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.sm,
    },
    levelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    levelBox: {
        width: 64,
        height: 64,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 2,
    },
    levelText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    arrow: {
        marginHorizontal: spacing.xs,
    },
    titleText: {
        fontSize: 14,
        marginBottom: spacing.xl,
        textAlign: 'center',
    },
    button: {
        width: '100%',
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        position: 'absolute',
        opacity: 0.6,
    },
    dot2: {
        width: 8,
        height: 8,
        borderRadius: 2,
        transform: [{ rotate: '45deg' }],
        position: 'absolute',
        opacity: 0.6,
    },
    rankCelebRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginVertical: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    rankCelebIcon: {
        fontSize: 32,
    },
    rankCelebTitle: {
        fontSize: 20,
        letterSpacing: 0.5,
    },
});
