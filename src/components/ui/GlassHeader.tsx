import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store/useAppStore';

export const HEADER_HEIGHT = 65;

interface GlassHeaderProps {
  title: string;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  showLogo?: boolean;
  transparent?: boolean;
}

export const GlassHeader: React.FC<GlassHeaderProps> = ({
  title,
  leftComponent,
  rightComponent,
  showLogo = false,
  transparent = false
}) => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const theme = useAppStore(state => state.theme);

  return (
    <View style={[
      styles.header,
      { backgroundColor: transparent ? 'transparent' : colors.background, paddingTop: insets.top }
    ]}>
      <View style={styles.content}>
        <View style={styles.leftContainer}>
          {leftComponent}
          {showLogo && (
            <View style={[styles.brandRow, leftComponent ? { marginLeft: 16 } : null]}>
              <Image
                source={require('../../../assets/icon.png')}
                style={styles.logoImage}
              />
              <Text style={[styles.title, styles.brandTitle, { color: colors.text }]}>
                Anim<Text style={[styles.accentTitle, { color: colors.primary }]}>Org</Text>
              </Text>
            </View>
          )}
        </View>

        <View style={styles.centerContainer}>
          {!showLogo && (
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          )}
        </View>

        <View style={styles.rightContainer}>
          {rightComponent}
        </View>
      </View>
      {!transparent && (
        <LinearGradient
          colors={[colors.background, 'transparent']}
          style={styles.bottomGradient}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  bottomGradient: {
    height: 10,
    position: 'absolute',
    bottom: -10,
    left: 0,
    right: 0,
  },
  content: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 10,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    letterSpacing: 0.5,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900' as any,
    letterSpacing: -0.5,
  },
  accentTitle: {
    color: colors.primary,
  },
  leftContainer: {
    minWidth: 40,
  },
  rightContainer: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
});
