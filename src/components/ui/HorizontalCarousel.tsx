import React from 'react';
import { 
  FlatList, 
  StyleSheet, 
  Text, 
  View, 
  ActivityIndicator 
} from 'react-native';
import { PosterCard } from './PosterCard';
import { Media } from '../../types';
import { colors, spacing, typography } from '../../theme';
import { SkeletonLoader } from './SkeletonLoader';

interface HorizontalCarouselProps {
  title: string;
  data: Media[];
  isLoading?: boolean;
  onPress: (id: string) => void;
}

export const HorizontalCarousel: React.FC<HorizontalCarouselProps> = ({ 
  title, 
  data, 
  isLoading,
  onPress 
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      {isLoading ? (
        <FlatList
          data={[1, 2, 3, 4]}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={() => (
            <SkeletonLoader 
              width={140} 
              height={200} 
              style={{ marginHorizontal: spacing.sm, borderRadius: 12 }} 
            />
          )}
          keyExtractor={(item) => item.toString()}
        />
      ) : (
        <FlatList
          data={data}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <PosterCard media={item} onPress={onPress} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
  },
});
