import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';

type GradientBorderProps = {
  children: React.ReactNode;
  borderWidth?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

/**
 * Wraps children with a red cinematic gradient border.
 * Used for avatar, level badge, etc.
 */
export const GradientBorder: React.FC<GradientBorderProps> = ({
  children,
  borderWidth = 3,
  borderRadius = 12,
  style,
}) => {
  return (
    <View style={[{ borderRadius, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={[colors.primary, `${colors.primary}00`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius, padding: borderWidth }}
      >
        <View style={[styles.inner, { borderRadius: borderRadius - borderWidth }]}>{children}</View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  inner: {
    backgroundColor: 'transparent',
  },
});
