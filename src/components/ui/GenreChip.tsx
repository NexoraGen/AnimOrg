import React, { useRef } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Animated
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { borderRadius, spacing, typography } from '../../theme';

interface GenreChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export const GenreChip: React.FC<GenreChipProps> = React.memo(({
  label,
  selected = false,
  onPress
}) => {
  const colors = useThemeColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.chip,
          {
            backgroundColor: selected ? colors.primary : colors.surface,
            borderColor: selected ? colors.primary : colors.border,
            borderWidth: selected ? 1.5 : 1,
            shadowColor: colors.primary,
            shadowOpacity: selected ? 0.6 : 0,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 0 },
            elevation: selected ? 10 : 0,
          }
        ]}
      >
        <Text
          style={[
            styles.label,
            {
              color: selected ? '#FFFFFF' : colors.textDim,
              fontWeight: selected ? '800' : '600'
            }
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
  },
});
