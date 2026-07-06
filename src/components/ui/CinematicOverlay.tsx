import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, TouchableWithoutFeedback } from 'react-native';

interface CinematicOverlayProps {
    visible: boolean;
    onPress?: () => void;
}

export const CinematicOverlay: React.FC<CinematicOverlayProps> = React.memo(({ visible, onPress }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [shouldRender, setShouldRender] = React.useState(visible);

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
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
                { opacity: fadeAnim },
            ]}
        >
            <TouchableWithoutFeedback onPress={onPress}>
                <View style={styles.backdrop} />
            </TouchableWithoutFeedback>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
});
