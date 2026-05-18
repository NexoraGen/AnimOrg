import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius, typography } from '../../theme';
import { ANIME_LOGO } from '../../constants/images';

type StreamingHeaderProps = {
  avatarUrl?: string;
  onAvatarPress?: () => void;
  showAvatar?: boolean;
};

export const StreamingHeader: React.FC<StreamingHeaderProps> = ({ avatarUrl, onAvatarPress, showAvatar = true }) => {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#000', '#000', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.6)']}
      style={[
        styles.header,
        {
          paddingTop: insets.top,
          height: 70 + insets.top
        }
      ]}
    >
      <View style={styles.brandContainer}>
        <Image
          source={ANIME_LOGO}
          style={styles.logo}
          contentFit="contain"
        />
        <Text style={styles.title}>
          Anim<Text style={{ color: theme.primary }}>Org</Text>
        </Text>
      </View>
      {showAvatar && (
        <TouchableOpacity onPress={onAvatarPress} style={styles.avatarWrapper}>
          <Image
            source={avatarUrl ? { uri: avatarUrl } : require('../../../assets/guest-avatar.png')}
            style={[styles.avatar, { borderColor: theme.primary }]}
            contentFit="cover"
            transition={300}
          />
        </TouchableOpacity>
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        style={styles.bottomFade}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  bottomFade: {
    position: 'absolute',
    bottom: -100,
    left: 0,
    right: 0,
    height: 100,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 10,
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900' as any,
    letterSpacing: -0.5,
  },
  avatarWrapper: {
    padding: 2,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
});
