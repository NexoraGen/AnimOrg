import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  interpolateColor
} from 'react-native-reanimated';
import { useThemeColors } from '../../hooks/useThemeColors';
import { colors as themeColors } from '../../theme';
import * as Haptics from 'expo-haptics';

interface StarRatingProps {
  rating: number; // 0-10 (standardized)
  size?: number;
  interactive?: boolean;
  onChange?: (score: number) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 24,
  interactive = false,
  onChange
}) => {
  const colors = useThemeColors();

  const handlePress = async (index: number) => {
    if (!interactive || !onChange) return;

    const score = (index + 1) * 2;
    onChange(score);

    try {
      if (Haptics.impactAsync) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) { }
  };

  return (
    <View style={styles.container}>
      {[...Array(5)].map((_, index) => {
        const starScore = (index + 1) * 2;
        const isFull = rating >= starScore;
        const isHalf = rating >= starScore - 1 && rating < starScore;

        return (
          <StarIcon
            key={index}
            index={index}
            isFull={isFull}
            isHalf={isHalf}
            size={size}
            activeColor={themeColors.primary}
            inactiveColor={colors.textMuted}
            onPress={() => handlePress(index)}
            interactive={interactive}
          />
        );
      })}
    </View>
  );
};

interface StarIconProps {
  index: number;
  isFull: boolean;
  isHalf: boolean;
  size: number;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
  interactive: boolean;
}

const StarIcon: React.FC<StarIconProps> = ({
  isFull,
  isHalf,
  size,
  activeColor,
  inactiveColor,
  onPress,
  interactive
}) => {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (isFull) {
      scale.value = withSequence(
        withSpring(1.2),
        withSpring(1)
      );
      glow.value = withSpring(1);
    } else {
      glow.value = withSpring(0);
    }
  }, [isFull]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: isFull || isHalf ? 1 : 0.6,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={!interactive}
      style={[styles.star, animatedStyle]}
    >
      <FontAwesome
        name={isFull ? "star" : isHalf ? "star-half-o" : "star-o"}
        size={size}
        color={isFull || isHalf ? activeColor : inactiveColor}
      />
      {isFull && (
        <View style={[
          styles.glow,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: activeColor,
            opacity: 0.2
          }
        ]} />
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    paddingRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: -1,
  }
});
