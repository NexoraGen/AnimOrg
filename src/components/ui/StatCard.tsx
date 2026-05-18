import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, style }) => {
  const themeColors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surface, borderColor: themeColors.border }, style]}>
      <View style={[styles.iconWrapper, { backgroundColor: `${themeColors.primary}15` }]}>
        <Feather name={icon} size={18} color={themeColors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.value, { color: themeColors.text }]}>{value}</Text>
        <Text style={[styles.label, { color: themeColors.textDim }]}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 140,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    justifyContent: 'center',
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
});
