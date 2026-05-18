import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface EmptyRecommendationsProps {
    onPress?: () => void;
}

export const EmptyRecommendations: React.FC<EmptyRecommendationsProps> = ({ onPress }) => {
    const themeColors = useThemeColors();

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['rgba(229, 9, 20, 0.1)', 'transparent']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            />

            <View style={[styles.card, { borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
                <View style={styles.iconContainer}>
                    <Feather name="heart" size={32} color={colors.primary} />
                    <View style={styles.glowEffect} />
                </View>

                <Text style={[styles.title, { color: themeColors.text }]}>
                    Your Personalized Hub awaits
                </Text>

                <Text style={[styles.subtitle, { color: themeColors.textDim }]}>
                    Add anime to your watchlist to unlock custom recommendations tailored to your taste.
                </Text>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={onPress}
                    activeOpacity={0.8}
                >
                    <Feather name="plus-circle" size={18} color="#FFF" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Start Exploring</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.md,
        marginBottom: spacing.xl,
        position: 'relative',
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
        height: 150,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        overflow: 'hidden',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(229, 9, 20, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        position: 'relative',
    },
    glowEffect: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        opacity: 0.3,
    },
    title: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold as any,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: typography.sizes.sm,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.md,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
        elevation: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    buttonIcon: {
        marginRight: spacing.sm,
    },
    buttonText: {
        color: '#FFF',
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.bold as any,
    },
});
