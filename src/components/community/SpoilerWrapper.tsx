import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { colors, spacing, borderRadius } from '../../theme';

interface SpoilerWrapperProps {
    children: React.ReactNode;
    severity?: 'anime' | 'manga';
    initiallyRevealed?: boolean;
}

export function SpoilerWrapper({ children, severity = 'anime', initiallyRevealed = false }: SpoilerWrapperProps) {
    const themeColors = useThemeColors();
    const [isRevealed, setIsRevealed] = useState(initiallyRevealed);

    if (isRevealed) {
        return <View>{children}</View>;
    }

    const label = severity === 'manga' ? 'Manga Spoilers' : 'Anime Spoilers';

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsRevealed(true)}
            style={[styles.container, { backgroundColor: themeColors.surfaceVariant, borderColor: themeColors.border }]}
        >
            <View style={styles.contentMask}>
                <View style={{ opacity: 0.05 }} pointerEvents="none">
                    {children}
                </View>
            </View>

            <View style={styles.overlay}>
                <View style={[styles.warningBadge, { backgroundColor: 'rgba(255,59,48,0.1)' }]}>
                    <Feather name="alert-triangle" size={16} color="#FF3B30" />
                    <Text style={styles.warningText}>{label}</Text>
                </View>
                <Text style={[styles.tapText, { color: themeColors.textDim }]}>
                    Tap to reveal
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: borderRadius.md,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
        marginVertical: spacing.sm,
    },
    contentMask: {
        minHeight: 100, // Provides some footprint so it's clickable
        backgroundColor: '#000',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.85)',
        padding: spacing.md,
    },
    warningBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: spacing.sm,
        gap: 6,
    },
    warningText: {
        color: '#FF3B30',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    tapText: {
        fontSize: 13,
        fontWeight: '600',
    }
});
