import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, spacing } from '../../theme';

const LOADING_MESSAGES = [
    "Gathering chakra...",
    "Unlocking the Mangekyou...",
    "Powering up to Super Saiyan...",
    "Channelling nen reserves...",
    "Locating the One Piece...",
    "Accessing the Soul Society...",
    "Synthesizing philosopher's stone...",
    "Releasing the Bankai..."
];

export function AnimatedLoader({ size = 80 }: { size?: number }) {
    const [message, setMessage] = useState(LOADING_MESSAGES[0]);
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const rotateCounterAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(0.8)).current;
    const textFadeAnim = useRef(new Animated.Value(1)).current;
    const messageIndex = useRef(0);

    useEffect(() => {
        // 1. Clockwise rotation
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 2000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // 2. Counter-clockwise rotation
        Animated.loop(
            Animated.timing(rotateCounterAnim, {
                toValue: 1,
                duration: 2500,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // 3. Glowing Pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.8,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // 4. Rotating Loading Messages
        const messageInterval = setInterval(() => {
            Animated.timing(textFadeAnim, {
                toValue: 0,
                duration: 350,
                useNativeDriver: true,
            }).start(() => {
                messageIndex.current = (messageIndex.current + 1) % LOADING_MESSAGES.length;
                setMessage(LOADING_MESSAGES[messageIndex.current]);
                Animated.timing(textFadeAnim, {
                    toValue: 1,
                    duration: 350,
                    useNativeDriver: true,
                }).start();
            });
        }, 1800);

        return () => clearInterval(messageInterval);
    }, []);

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const rotateCounter = rotateCounterAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['360deg', '0deg'],
    });

    return (
        <View style={styles.container}>
            <View style={[styles.loaderWrapper, { width: size, height: size }]}>
                {/* Neon Glow Energy Orb Core */}
                <Animated.View
                    style={[
                        styles.core,
                        {
                            width: size * 0.4,
                            height: size * 0.4,
                            borderRadius: (size * 0.4) / 2,
                            transform: [{ scale: pulseAnim }],
                        },
                    ]}
                />

                {/* Ring 1: Clockwise Shuriken Blades */}
                <Animated.View
                    style={[
                        styles.ring1,
                        {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            transform: [{ rotate }],
                        },
                    ]}
                />

                {/* Ring 2: Counter-Clockwise Energy Ring */}
                <Animated.View
                    style={[
                        styles.ring2,
                        {
                            width: size * 0.8,
                            height: size * 0.8,
                            borderRadius: (size * 0.8) / 2,
                            transform: [{ rotate: rotateCounter }],
                        },
                    ]}
                />
            </View>

            {/* Rotating Anime loading message */}
            <Animated.Text style={[styles.text, { opacity: textFadeAnim }]}>
                {message}
            </Animated.Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
    },
    loaderWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    core: {
        backgroundColor: '#E50914',
        shadowColor: '#E50914',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.85,
        shadowRadius: 15,
        elevation: 8,
    },
    ring1: {
        position: 'absolute',
        borderWidth: 4,
        borderColor: 'transparent',
        borderTopColor: '#E50914',
        borderBottomColor: '#E50914',
        shadowColor: '#E50914',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    ring2: {
        position: 'absolute',
        borderWidth: 2.5,
        borderColor: 'transparent',
        borderLeftColor: '#FFF',
        borderRightColor: '#FFF',
        opacity: 0.8,
        shadowColor: '#FFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    text: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
        fontStyle: 'italic',
        letterSpacing: 1.5,
        textAlign: 'center',
        minHeight: 20,
        textShadowColor: 'rgba(235, 9, 20, 0.4)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
    },
});
