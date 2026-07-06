import React from 'react';
import {
  StyleSheet,
  View,
  Platform
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PosterCard } from './PosterCard';
import { ContinueWatchingCard } from './ContinueWatchingCard';
import { SectionHeader } from './SectionHeader';
import { Media, WatchHistoryEntry } from '../../types';
import { spacing } from '../../theme';
import { SkeletonLoader } from './SkeletonLoader';
import { useThemeColors } from '../../hooks/useThemeColors';

interface HorizontalCarouselProps {
  title: string;
  data: (Media | WatchHistoryEntry)[];
  isLoading?: boolean;
  onPress: (id: string) => void;
  onViewAll?: () => void;
  variant?: 'default' | 'wide';
  cardWidth?: number;
  cardHeight?: number;
  subtitle?: string;
  renderItem?: (info: { item: any; index: number }) => React.ReactElement | null;
  itemWidth?: number;
  icon?: any;
}

export const HorizontalCarousel: React.FC<HorizontalCarouselProps> = ({
  title,
  data,
  isLoading,
  onPress,
  onViewAll,
  variant = 'default',
  cardWidth,
  cardHeight,
  subtitle,
  renderItem,
  itemWidth,
  icon
}) => {
  const colors = useThemeColors();

  const defaultWidth = variant === 'wide' ? 240 : 180;
  const defaultHeight = variant === 'wide' ? 140 : 260;
  const width = cardWidth || defaultWidth;
  const height = cardHeight || defaultHeight;

  const renderItemInternal = React.useCallback((info: { item: any; index: number }) => {
    if (renderItem) return renderItem(info);
    const { item } = info;
    if (variant === 'wide') {
      return (
        <ContinueWatchingCard
          entry={item as WatchHistoryEntry}
          onPress={onPress}
        />
      );
    }
    return (
      <PosterCard
        media={item as Media}
        onPress={onPress}
        width={width}
        height={height}
      />
    );
  }, [renderItem, variant, onPress, width, height]);

  const keyExtractor = React.useCallback((item: any) => {
    const itemId = item.id || item.animeId || item.anime?.id;
    return `${title}-${itemId || Math.random()}`;
  }, [title]);

  return (
    <View style={styles.container}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        onViewAll={onViewAll}
        icon={icon}
      />

      {isLoading ? (
        <FlashList
          data={[1, 2, 3, 4, 5]}
          horizontal
          // @ts-ignore
          estimatedItemSize={width}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
          renderItem={() => (
            <SkeletonLoader
              width={width}
              height={height}
              style={{ marginHorizontal: spacing.sm, borderRadius: 12 }}
            />
          )}
          keyExtractor={(item) => `skeleton-${title}-${item}`}
        />
      ) : (
        <FlashList
          data={data as any}
          horizontal
          // @ts-ignore
          estimatedItemSize={width}
          showsHorizontalScrollIndicator={false}
          snapToInterval={itemWidth || (width + spacing.sm)}
          decelerationRate="fast"
          snapToAlignment="start"
          ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
          renderItem={renderItemInternal}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          drawDistance={width * 2}
          removeClippedSubviews
          // @ts-ignore
          initialNumToRender={5}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
    marginTop: 0,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
});
