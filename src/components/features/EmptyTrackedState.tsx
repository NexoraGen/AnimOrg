import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';

export const EmptyTrackedState = () => {
    const router = useRouter();
    const themeColors = useThemeColors();

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['rgba(229, 9, 20, 0.05)', 'rgba(0, 0, 0, 0.45)', 'rgba(229, 9, 20, 0.02)']}
                style={styles.gradientBg}
            >
                {/* Visual Ambient Glow */}
                <View style={styles.glowRing}>
                    <View style={[styles.iconWrapper, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}30` }]}>
                        <Feather name="tv" size={32} color={colors.primary} />
                    </View>
                </View>

                <Text style={[styles.title, { color: themeColors.text }]}>
                    Track Anime to Build Your Calendar
                </Text>
                <Text style={[styles.subtitle, { color: themeColors.textDim }]}>
                    Save your seasonal shows to compile episode counters, live release countdowns, and specialized weekly schedule cards here.
                </Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => router.push('/(tabs)/search')}
                    activeOpacity={0.8}
                >
                    <Feather name="search" size={14} color="#FFF" />
                    <Text style={styles.buttonText}>Discover Anime</Text>
                    <Feather name="arrow-right" size={14} color="#FFF" style={styles.buttonArrow} />
                </TouchableOpacity>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: spacing.xl,
        marginBottom: spacing.xl,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    gradientBg: {
        padding: spacing.xl + 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glowRing: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginBottom: spacing.md,
    },
    iconWrapper: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: spacing.xs,
        letterSpacing: -0.3,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.md,
        fontWeight: '500',
    },
    button: {
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
        marginHorizontal: 8,
    },
    buttonArrow: {
        opacity: 0.8,
    },
});
