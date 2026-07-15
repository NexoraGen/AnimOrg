import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { spacing, borderRadius } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface ProfileStatCardProps {
    label: string;
    value: string | number;
    icon: keyof typeof Feather.glyphMap;
    index: number;
    onPress?: () => void;
    helperText?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ProfileStatCard: React.FC<ProfileStatCardProps> = ({
    label,
    value,
    icon,
    index,
    onPress,
    helperText
}) => {
    const themeColors = useThemeColors();
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 400,
                delay: index * 100,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 400,
                delay: index * 100,
                useNativeDriver: true,
            }),
        ]).start();
    }, [index]);

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.95,
            speed: 50,
            bounciness: 4,
            useNativeDriver: true,
        }).start();

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        }
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            speed: 50,
            bounciness: 4,
            useNativeDriver: true,
        }).start();
    };

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[
                styles.card,
                {
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                    opacity,
                    transform: [{ scale }, { translateY }],
                }
            ]}
        >
            {/* Centered glowing red circular background for icon */}
            <View style={[styles.glowContainer, { backgroundColor: `${themeColors.primary}12`, borderColor: `${themeColors.primary}25` }]}>
                <Feather name={icon} size={24} color={themeColors.primary} />
            </View>

            {/* Large Value */}
            <Text style={styles.value} numberOfLines={1}>
                {value}
            </Text>

            {/* Label */}
            <Text style={[styles.label, { color: 'rgba(255, 255, 255, 0.6)' }]} numberOfLines={1}>
                {label}
            </Text>

            {/* Optional Helper Text */}
            {helperText ? (
                <Text style={[styles.helperText, { color: 'rgba(255, 255, 255, 0.4)' }]} numberOfLines={1}>
                    {helperText}
                </Text>
            ) : null}
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        height: 160,
        borderRadius: 24,
        borderWidth: 1.5,
        padding: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    glowContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        marginBottom: spacing.xs,
    },
    value: {
        fontSize: 22,
        fontWeight: '900',
        color: 'white',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 4,
    },
    helperText: {
        fontSize: 11,
        fontWeight: '400',
        textAlign: 'center',
        marginTop: 2,
    },
});
