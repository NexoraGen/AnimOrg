import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../theme';

type AnimatedToggleProps = {
  value: boolean;
  onToggle: () => void;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  style?: any;
};

/**
 * A Pressable toggle used in Settings screen.
 * Features animated knob movement, background colour transition, optional haptic feedback.
 */
export const AnimatedToggle: React.FC<AnimatedToggleProps> = ({
  value,
  onToggle,
  label,
  icon,
  style,
}) => {
  const theme = useThemeColors();
  const translateX = useRef(new Animated.Value(value ? 20 : 0)).current;
  const bgColor = useRef(new Animated.Value(value ? 1 : 0)).current; // 0 = border, 1 = primary

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: value ? 20 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(bgColor, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle();
  };

  const interpolatedBg = bgColor.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.border, theme.primary],
  });

  return (
    <Pressable onPress={handlePress} style={[styles.container, style]} android_ripple={{ color: theme.primary + '30' }}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconBox, { backgroundColor: theme.surfaceVariant }]}>
          <Feather name={icon} size={18} color={theme.text} />
        </View>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
      </View>
      <Animated.View style={[styles.toggle, { backgroundColor: interpolatedBg }]}>
        <Animated.View style={[styles.toggleKnob, { transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowLabel: {
    fontSize: typography.sizes.md,
    fontWeight: '500' as any,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
