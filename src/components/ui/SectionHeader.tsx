import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface SectionHeaderProps {
  title: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
  icon?: React.ReactNode | string;
  subtitle?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  onViewAll,
  viewAllLabel = 'View All',
  icon,
  subtitle
}) => {
  const themeColors = useThemeColors();

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      return <Feather name={icon as any} size={18} color={themeColors.primary} />;
    }
    return icon;
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <View style={styles.titleRow}>
          {icon && <View style={styles.iconContainer}>{renderIcon()}</View>}
          <Text style={[styles.title, { color: themeColors.text }]}>{title}</Text>
        </View>
        {subtitle && (
          <Text style={[styles.subtitle, { color: themeColors.textDim }]}>{subtitle}</Text>
        )}
      </View>

      {onViewAll && (
        <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
          <Text style={[styles.viewAllText, { color: themeColors.primary }]}>{viewAllLabel}</Text>
          <Feather name="chevron-right" size={16} color={themeColors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  leftSection: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '900' as any,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.5,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700' as any,
  },
});
