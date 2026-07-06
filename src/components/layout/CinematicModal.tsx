import React, { useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    TouchableOpacity,
    useWindowDimensions,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/useThemeColors';
import { motion } from '../../theme/motion';

interface CinematicModalProps {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: number;
    widthPercentage?: number;
    showBlur?: boolean;
}

export const CinematicModal: React.FC<CinematicModalProps> = ({
    visible,
    onClose,
    children,
    maxWidth = 440,
    widthPercentage = 0.88,
    showBlur = true,
}) => {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const theme = useThemeColors();

    if (!visible && Platform.OS !== 'web') return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {showBlur && (
                    <BlurView
                        intensity={Platform.OS === 'android' ? 40 : 65}
                        tint="dark"
                        style={StyleSheet.absoluteFill}
                    />
                )}
                <Animated.View
                    entering={FadeIn.duration(motion.durations.base)}
                    exiting={FadeOut.duration(motion.durations.fast)}
                    style={[
                        styles.backdrop,
                        {
                            backgroundColor: 'rgba(0,0,0,0.7)'
                        }
                    ]}
                />

                <TouchableOpacity
                    style={styles.backdropPress}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardView}
                >
                    <Animated.View
                        entering={SlideInDown.springify().damping(motion.springs.modal.damping).stiffness(motion.springs.modal.stiffness).mass(motion.springs.modal.mass)}
                        exiting={SlideOutDown.duration(motion.durations.fast)}
                        style={[
                            styles.modalContainer,
                            {
                                width: '92%',
                                maxWidth: maxWidth,
                                backgroundColor: theme.surfaceVariant,
                                maxHeight: screenHeight * 0.95,
                            }
                        ]}
                    >
                        {children}
                    </Animated.View>
                </KeyboardAvoidingView>
            </View>
        </Modal >
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        zIndex: 9999,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    backdropPress: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 2,
    },
    keyboardView: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3,
    },
    modalContainer: {
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.6,
        shadowRadius: 30,
        elevation: 24,
        alignSelf: 'center',
        zIndex: 4,
        position: 'relative',
    },
});
