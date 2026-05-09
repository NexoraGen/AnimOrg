import React from 'react';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, spacing, typography } from '../../theme';

interface GlassHeaderProps {
  title: string;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
}

export const GlassHeader: React.FC<GlassHeaderProps> = ({ 
  title, 
  leftComponent, 
  rightComponent 
}) => {
  return (
    <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
      <SafeAreaView>
        <View style={styles.content}>
          <View style={styles.leftContainer}>{leftComponent}</View>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.rightContainer}>{rightComponent}</View>
        </View>
      </SafeAreaView>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  content: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    letterSpacing: 1,
  },
  leftContainer: {
    width: 40,
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
});
