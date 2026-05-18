import React, { useRef } from 'react';
import { Pressable, Animated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '../../hooks/useThemeColors';

/**
 * Pressable wrapper that adds a subtle scale animation on press and optional haptic feedback.
 * Usage: <AnimatedPressable onPress={...}>...</AnimatedPressable>
 */
const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

export const AnimatedPressable: React.FC<{
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
  haptic?: boolean; // defaults to true on mobile platforms
}> = ({ onPress, style, children, haptic = true }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const themeColors = useThemeColors();

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.96,
      duration: 100,
      useNativeDriver: true,
    }).start();
    if (Platform.OS !== 'web' && haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedPressableComponent
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressableComponent>
  );
};
