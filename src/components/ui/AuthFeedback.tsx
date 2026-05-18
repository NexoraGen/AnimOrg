import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../theme';

interface AuthFeedbackProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    onHide?: () => void;
    visible: boolean;
}

export const AuthFeedback: React.FC<AuthFeedbackProps> = ({ message, type = 'error', onHide, visible }) => {
    const theme = useThemeColors();
    const opacity = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            const timer = setTimeout(() => {
                hide();
            }, 4000);
            return () => clearTimeout(timer);
        } else {
            hide();
        }
    }, [visible]);

    const hide = () => {
        Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            onHide?.();
        });
    };

    if (!visible) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'alert-circle';
            default: return 'info';
        }
    };

    const getColor = () => {
        switch (type) {
            case 'success': return '#22C55E';
            case 'error': return theme.primary;
            default: return theme.textDim;
        }
    };

    return (
        <Animated.View style={[
            styles.container,
            {
                backgroundColor: theme.surface,
                borderColor: getColor(),
                opacity,
                shadowColor: getColor(),
            }
        ]}>
            <Feather name={getIcon() as any} size={20} color={getColor()} />
            <Text style={[styles.text, { color: theme.text }]}>{message}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: spacing.xl,
        left: spacing.md,
        right: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        zIndex: 1000,
        elevation: 5,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    text: {
        marginLeft: spacing.sm,
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    }
});
