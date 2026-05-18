import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../../theme';

const { width, height } = Dimensions.get('window');

interface CinematicOverlayProps {
    visible: boolean;
    onPress?: () => void;
}

export const CinematicOverlay: React.FC<CinematicOverlayProps> = ({ visible, onPress }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [shouldRender, setShouldRender] = React.useState(visible);

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setShouldRender(false);
            });
        }
    }, [visible]);

    if (!shouldRender) return null;

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                },
            ]}
        >
            <TouchableWithoutFeedback onPress={onPress}>
                <View style={styles.backdrop}>
                    <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={[styles.dimmer, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />

                    {/* Subtle Ambient Red Glow */}
                    <View style={styles.glow} />
                </View>
            </TouchableWithoutFeedback>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
    },
    backdrop: {
        flex: 1,
    },
    dimmer: {
        ...StyleSheet.absoluteFillObject,
    },
    glow: {
        position: 'absolute',
        bottom: -height * 0.2,
        left: -width * 0.2,
        width: width * 1.4,
        height: height * 0.4,
        borderRadius: width * 0.7,
        backgroundColor: colors.primary,
        opacity: 0.1,
        transform: [{ scaleX: 1.5 }],
        filter: 'blur(100px)', // Note: standard RN doesn't support filter: blur, but some platforms might.
        // For universal RN, we'll use a gradient or just opacity.
    }
});
