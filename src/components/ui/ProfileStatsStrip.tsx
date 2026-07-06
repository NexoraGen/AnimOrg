import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface ProfileStatsStripProps {
  followingCount: number;
  followersCount: number;
  postsCount: number;
  onFollowingPress?: () => void;
  onFollowersPress?: () => void;
  onPostsPress?: () => void;
}

export const ProfileStatsStrip: React.FC<ProfileStatsStripProps> = ({
  followingCount,
  followersCount,
  postsCount,
  onFollowingPress,
  onFollowersPress,
  onPostsPress,
}) => {
  const themeColors = useThemeColors();

  const StatItem = ({ label, count, onPress }: { label: string; count: number; onPress?: () => void }) => (
    <TouchableOpacity
      style={styles.statItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.count, { color: themeColors.text }]}>{count}</Text>
      <Text style={[styles.label, { color: themeColors.textDim }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { borderBottomColor: 'rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.1)' }]}>
      <StatItem label="FOLLOWING" count={followingCount} onPress={onFollowingPress} />
      <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
      <StatItem label="FOLLOWERS" count={followersCount} onPress={onFollowersPress} />
      <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
      <StatItem label="POSTS" count={postsCount} onPress={onPostsPress} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    marginBottom: 0,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  count: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
    opacity: 0.4,
  },
  divider: {
    width: 1,
    height: 24,
  },
});
