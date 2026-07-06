import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation
} from 'react-native-reanimated';
import { borderRadius } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { durations } from '../../theme/motion';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  circle = false,
  borderRadius: customBorderRadius,
  style
}) => {
  const themeColors = useThemeColors();
  const translateX = useSharedValue(-100);

  useEffect(() => {
    translateX.value = -100;
    translateX.value = withRepeat(
      withTiming(200, {
        duration: 1800,
        easing: Easing.bezier(0.2, 0.0, 0, 1.0),
      }),
      -1,
      false
    );

    return () => {
      cancelAnimation(translateX);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: `${translateX.value}%` }],
    };
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: circle ? 9999 : (customBorderRadius || borderRadius.md),
          backgroundColor: themeColors.surfaceVariant,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    // Base styles
  },
});
