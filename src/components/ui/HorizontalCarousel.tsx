import React from 'react';
import {
  StyleSheet,
  View,
  Platform
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PosterCard } from './PosterCard';
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
  disableSnap?: boolean;
}

const HorizontalCarouselComponent: React.FC<HorizontalCarouselProps> = ({
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
  icon,
  disableSnap = true
}) => {
  const colors = useThemeColors();

  const defaultWidth = variant === 'wide' ? 240 : 180;
  const defaultHeight = variant === 'wide' ? 140 : 260;
  const width = cardWidth || defaultWidth;
  const height = cardHeight || defaultHeight;

  const renderItemInternal = React.useCallback((info: { item: any; index: number }) => {
    if (renderItem) return renderItem(info);
    const { item } = info;
    return (
      <PosterCard
        media={item as Media}
        onPress={onPress}
        width={width}
        height={height}
        disableEntryAnimation
      />
    );
  }, [renderItem, onPress, width, height]);

  const keyExtractor = React.useCallback((item: any) => {
    const itemId = item.id || item.animeId || item.anime?.id;
    return `${title}-${itemId || Math.random()}`;
  }, [title]);

  const getItemLayout = React.useCallback((data: any, index: number) => {
    // For variant === 'wide', the items touch without external gap (except padding at start/end of the list)
    // For default, PosterCard has marginHorizontal of spacing.S (8px), meaning each card takes width + 16px of horizontal space
    const itemStride = itemWidth || (variant === 'wide' ? width : width + 16);
    return {
      length: itemStride,
      offset: itemStride * index,
      index,
    };
  }, [variant, width, itemWidth]);

  return (
    <View style={styles.container}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        onViewAll={onViewAll}
        icon={icon}
      />

      {isLoading ? (
        <View style={{ minHeight: height + spacing.md }}>
          <FlashList
            data={[1, 2, 3, 4, 5]}
            horizontal
            showsHorizontalScrollIndicator={false}
            estimatedItemSize={width + 16}
            renderItem={() => (
              <SkeletonLoader
                width={width}
                height={height}
                style={{ marginHorizontal: spacing.sm, borderRadius: 12 }}
              />
            )}
            keyExtractor={(item) => `skeleton-${title}-${item}`}
          />
        </View>
      ) : (
        <View style={{ minHeight: height + spacing.md }}>
          <FlashList
            data={data}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={renderItemInternal}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            estimatedItemSize={itemWidth || (variant === 'wide' ? width : width + 16)}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );
};

export const HorizontalCarousel = React.memo(HorizontalCarouselComponent);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.XL,
    marginTop: 0,
  },
  listContent: {
    paddingHorizontal: spacing.M,
    paddingBottom: spacing.XS,
  },
});
