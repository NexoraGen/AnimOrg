import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Review } from '../../types';
import { StarRating } from './StarRating';
import { ExpandableText } from './ExpandableText';
import { useThemeColors } from '../../hooks/useThemeColors';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { getSafeRelativeTime } from '../../utils/date';

interface ReviewCardProps {
  review: Review;
  onLike?: (reviewId: string) => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onLike
}) => {
  const themeColors = useThemeColors();

  const [showSpoiler, setShowSpoiler] = React.useState(false);


  return (
    <View style={[styles.container, { backgroundColor: themeColors.surfaceVariant, borderColor: themeColors.border }]}>
      <View style={styles.header}>
        <Image
          source={review.avatarUrl ? { uri: review.avatarUrl } : { uri: 'https://cdn.myanimelist.net/images/characters/11/294371.jpg' }}
          style={styles.avatar}
          transition={300}
        />
        <View style={styles.headerInfo}>
          <Text style={[styles.username, { color: themeColors.text }]}>{review.username || 'Anonymous'}</Text>
          <Text style={[styles.timestamp, { color: themeColors.textMuted }]}>
            {getSafeRelativeTime(review.createdAt)}
          </Text>
        </View>
      </View>

      <View style={styles.ratingContainer}>
        <StarRating rating={review.rating} size={14} />
      </View>

      {review.isSpoiler ? (
        <View style={[styles.spoilerContainer, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
          <Feather name="eye-off" size={20} color={themeColors.textMuted} />
          <Text style={[styles.spoilerText, { color: themeColors.textMuted }]}>Contains Spoilers</Text>
          <TouchableOpacity style={styles.viewAnyway}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>View Anyway</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ExpandableText
          text={review.text}
          maxLines={3}
          style={styles.text}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => onLike?.(review.id)}
          style={styles.likeButton}
        >
          <Feather name="heart" size={14} color={themeColors.primary} />
          <Text style={[styles.likeCount, { color: themeColors.textMuted }]}>{review.likes}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 280,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginRight: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  username: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
  },
  timestamp: {
    fontSize: typography.sizes.xs,
  },
  ratingContainer: {
    marginBottom: spacing.xs,
  },
  text: {
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  footer: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeCount: {
    fontSize: typography.sizes.sm,
    marginLeft: 4,
  },
  spoilerContainer: {
    height: 100,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  spoilerText: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  viewAnyway: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
});
