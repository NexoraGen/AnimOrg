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
            <View style={styles.card}>
                <Feather name="layers" size={28} color={themeColors.textDim} style={{ marginBottom: spacing.md }} />

                <Text style={[styles.title, { color: themeColors.textDim }]}>
                    No Recommendations
                </Text>

                <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
                    Interact with anime to unlock your curated hub.
                </Text>

                <TouchableOpacity
                    style={[styles.button, { borderColor: themeColors.border, borderWidth: 1 }]}
                    onPress={onPress}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.buttonText, { color: themeColors.textDim }]}>Explore Anime</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.md,
        marginVertical: spacing.xxl,
        alignItems: 'center',
    },
    card: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
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
