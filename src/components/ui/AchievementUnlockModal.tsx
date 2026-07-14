import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, FadeOut, FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '../../hooks/useThemeColors';
import { typography, spacing, borderRadius } from '../../theme';
import { Badge } from '../../config/achievements';

interface AchievementUnlockModalProps {
    visible: boolean;
    badge: Badge | null;
    onClose: () => void;
}

export const AchievementUnlockModal: React.FC<AchievementUnlockModalProps> = ({ visible, badge, onClose }) => {
    const themeColors = useThemeColors();

    useEffect(() => {
        if (visible && badge) {
            try {
                // Triple haptic impact for heavy reward celebration
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
                // Silent
            }
        }
    }, [visible, badge]);

    if (!visible || !badge) return null;

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
                    entering={FadeInUp.duration(450).springify().damping(15)}
                    exiting={FadeOutDown.duration(200)}
                    style={[styles.card, { backgroundColor: themeColors.surface, borderColor: `${themeColors.primary}30` }]}
                >
                    {/* Confetti simulation */}
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                        <View style={[styles.dot, { backgroundColor: themeColors.primary, top: 40, left: 40 }]} />
                        <View style={[styles.dot2, { backgroundColor: '#FFD700', top: 80, right: 50 }]} />
                        <View style={[styles.dot, { backgroundColor: '#FF8C00', bottom: 120, left: 60 }]} />
                        <View style={[styles.dot2, { backgroundColor: '#32CD32', bottom: 80, right: 60 }]} />
                    </View>

                    <View style={[styles.trophyContainer, { backgroundColor: `${themeColors.primary}12`, borderColor: `${themeColors.primary}30` }]}>
                        <Feather name={(badge.icon || "award") as any} size={54} color={themeColors.primary} />
                    </View>

                    <Text style={[styles.achievementSubtitle, { color: themeColors.textMuted }]}>
                        🏆 ACHIEVEMENT UNLOCKED!
                    </Text>

                    <Text style={[styles.title, { color: themeColors.text }]}>
                        {badge.title}
                    </Text>

                    <Text style={[styles.desc, { color: themeColors.textDim }]}>
                        {badge.description}
                    </Text>

                    <View style={[styles.rewardBox, { backgroundColor: themeColors.surfaceVariant }]}>
                        <Feather name="zap" size={16} color="#FFD700" style={{ marginRight: 6 }} />
                        <Text style={[styles.rewardText, { color: themeColors.text }]}>
                            +{badge.xpReward} XP Reward
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: themeColors.primary }]}
                        onPress={onClose}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>Awesome!</Text>
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
    trophyContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    achievementSubtitle: {
        fontSize: 12,
        fontWeight: typography.weights.bold as any,
        letterSpacing: 2,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: typography.weights.bold as any,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    desc: {
        fontSize: 14,
        lineHeight: 19,
        textAlign: 'center',
        marginBottom: spacing.md,
        paddingHorizontal: spacing.sm,
    },
    rewardBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: 12,
        marginBottom: spacing.xl,
    },
    rewardText: {
        fontSize: 14,
        fontWeight: typography.weights.semibold as any,
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
});
