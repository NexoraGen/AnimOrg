import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { spacing, borderRadius } from '../../src/theme';
import { GlassHeader, PosterCard, HEADER_HEIGHT, SkeletonLoader } from '../../src/components/ui';
import { AnimatedScreen } from '../../src/components/layout/AnimatedScreen';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useCategory } from '../../src/hooks/useCategory';

const SORT_OPTIONS = [
  { id: 'popularity', label: 'Popularity' },
  { id: 'score', label: 'Score' },
  { id: 'newest', label: 'Newest' },
];

export default function CategoryScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const themeColors = useThemeColors();

  const {
    data,
    isLoading,
    isLoadingMore,
    isRefreshing,
    title,
    icon,
    emptyMessage,
    emptyIcon,
    supportsPagination,
    loadMore,
    onRefresh,
    initialFetch,
  } = useCategory(type || 'trending');

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('popularity');

  const numColumns = viewMode === 'grid' ? (width > 1024 ? 5 : width > 768 ? 4 : 2) : 1;
  const cardWidth = viewMode === 'grid'
    ? (width - spacing.md * 2 - spacing.md * (numColumns - 1)) / numColumns
    : width - spacing.md * 2;

  useEffect(() => {
    initialFetch();
  }, [type, sortBy]);

  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
  }, []);

  const handleMediaPress = useCallback((id: string) => {
    router.push(`/details/${id}`);
  }, [router]);

  const handleLoadMore = useCallback(() => {
    if (supportsPagination) {
      loadMore();
    }
  }, [supportsPagination, loadMore]);

  const renderEmptyState = useCallback(() => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: `${themeColors.primary}15` }]}>
        <Feather name={emptyIcon as any} size={40} color={themeColors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: themeColors.textDim }]}>{emptyMessage}</Text>
    </Animated.View>
  ), [emptyIcon, emptyMessage, title, themeColors]);

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GlassHeader
        title={title}
        leftComponent={
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="chevron-left" color={themeColors.text} size={28} />
          </TouchableOpacity>
        }
        rightComponent={
          <TouchableOpacity onPress={toggleViewMode} style={styles.viewToggle}>
            <Feather name={viewMode === 'grid' ? 'list' : 'grid'} color={themeColors.text} size={22} />
          </TouchableOpacity>
        }
      />

      <View style={{ flex: 1, paddingTop: insets.top + HEADER_HEIGHT }}>
        {/* Sort filter bar */}
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.filterChip,
                  { backgroundColor: themeColors.surfaceVariant },
                  sortBy === opt.id && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
                ]}
                onPress={() => setSortBy(opt.id)}
              >
                <Text style={[
                  styles.filterText,
                  { color: themeColors.textMuted },
                  sortBy === opt.id && { color: '#FFF', fontWeight: 'bold' }
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={[styles.resultCount, { color: themeColors.textDim }]}>
            {data.length > 0 ? `${data.length}+ anime` : ''}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.gridContainer}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <SkeletonLoader
                key={i}
                width={cardWidth}
                height={viewMode === 'grid' ? cardWidth * 1.5 : 100}
                style={{ marginBottom: spacing.md, borderRadius: 12 }}
              />
            ))}
          </View>
        ) : data.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlashList
            data={data}
            numColumns={numColumns}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={[styles.cardContainer, { width: cardWidth }]}>
                <PosterCard
                  media={item}
                  onPress={handleMediaPress}
                  width={cardWidth}
                  variant={viewMode === 'list' ? 'list' : 'default'}
                  disableEntryAnimation
                />
              </View>
            )}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            // @ts-ignore
            estimatedItemSize={viewMode === 'grid' ? cardWidth * 1.5 : 100}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={themeColors.primary}
              />
            }
            ListFooterComponent={
              isLoadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator color={themeColors.primary} size="small" />
                  <Text style={[styles.loadingMoreText, { color: themeColors.textDim }]}>Loading more...</Text>
                </View>
              ) : <View style={{ height: 100 }} />
            }
          />
        )}
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 4,
  },
  viewToggle: {
    padding: 4,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterText: {
    fontSize: 12,
  },
  resultCount: {
    fontSize: 10,
    marginLeft: spacing.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  cardContainer: {
    marginBottom: spacing.md,
  },
  footerLoader: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
