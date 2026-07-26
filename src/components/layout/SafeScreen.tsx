import React from 'react';
import { StyleSheet, ViewProps, Platform, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedScreen } from './AnimatedScreen';
import { useThemeColors } from '../../hooks/useThemeColors';

interface SafeScreenProps extends ViewProps {
    children: React.ReactNode;
    applyTopPadding?: boolean;
    applyBottomPadding?: boolean;
    disableAnimation?: boolean;
}

export const SafeScreen: React.FC<SafeScreenProps> = ({
    children,
    style,
    applyTopPadding = false,
    applyBottomPadding = false,
    disableAnimation = false,
    ...props
}) => {
    const insets = useSafeAreaInsets();
    const colors = useThemeColors();

    const safeTop = insets.top || (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
    const safeBottom = insets.bottom;

    const containerStyle = [
        styles.container,
        { backgroundColor: colors.background },
        applyTopPadding && { paddingTop: safeTop },
        applyBottomPadding && { paddingBottom: safeBottom },
        style,
    ];

    if (disableAnimation) {
        return (
            <View style={containerStyle} {...props}>
                {children}
            </View>
        );
    }

    return (
        <AnimatedScreen style={containerStyle} {...props}>
            {children}
        </AnimatedScreen>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
