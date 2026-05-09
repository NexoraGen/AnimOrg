import React from 'react';
import { StyleSheet, Image, Pressable, Text, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { Media } from '../../types';

interface PosterCardProps {
  media: Media;
  onPress: (id: string) => void;
  width?: number;
  height?: number;
}

export const PosterCard: React.FC<PosterCardProps> = ({ 
  media, 
  onPress,
  width = 140,
  height = 200
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Pressable
      onPress={() => onPress(media.id)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ marginHorizontal: spacing.sm }}
    >
      <Animated.View style={[styles.container, { width, height }, animatedStyle]}>
        <Image 
          source={{ uri: media.posterPath }} 
          style={styles.image} 
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        >
          <Text style={styles.title} numberOfLines={2}>
            {media.title}
          </Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>⭐ {media.rating}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
    padding: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
  },
  ratingContainer: {
    marginTop: 4,
  },
  rating: {
    color: colors.primary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium as any,
  },
});
