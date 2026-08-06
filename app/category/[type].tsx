import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  TouchableOpacity,
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
import { SwipeableTabs } from '../../src/components/layout/SwipeableTabs';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useCategory } from '../../src/hooks/useCategory';
import { getSafeTopInset } from '../../src/utils/layout';
import { getCategoryConfig } from '../../src/config/categoryConfig';

const SORT_OPTIONS = [
  { id: 'popularity', label: 'Popularity' },
  { id: 'score', label: 'Score' },
  { id: 'newest', label: 'Newest' },
];

const CategoryTabFeed = React.memo(({ type, sortBy, viewMode, cardWidth, numColumns, handleMediaPress }: any) => {
  const themeColors = useThemeColors();

  const {
    data,
    isLoading,
    isLoadingMore,
    isRefreshing,
    title,
    emptyMessage,
    emptyIcon,
    supportsPagination,
    loadMore,
    onRefresh,
    initialFetch,
  } = useCategory(type || 'trending', sortBy);

  useEffect(() => {
    initialFetch();
  }, [type, sortBy, initialFetch]);

  const handleLoadMore = useCallback(() => {
    if (supportsPagination) {
      loadMore();
    }
  }, [supportsPagination, loadMore]);

  const renderEmptyState = useCallback(() => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: `${themeColors.primary}15` }]} >
        <Feather name={emptyIcon as any} size={40} color={themeColors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: themeColors.textDim }]}>{emptyMessage}</Text>
    </Animated.View>
  ), [emptyIcon, emptyMessage, title, themeColors]);

  return (
    <View style={styles.feedContainer}>
      <View style={styles.tabResultHeader}>
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
              style={{ marginBottom: spacing.M, borderRadius: 12 }}
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
                height={viewMode === 'grid' ? cardWidth * 1.5 : undefined}
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
  );
});

export default function CategoryScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const themeColors = useThemeColors();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState(SORT_OPTIONS[0].label);

  const numColumns = viewMode === 'grid' ? (width > 1024 ? 5 : width > 768 ? 4 : 2) : 1;
  const cardWidth = viewMode === 'grid'
    ? (width - spacing.M * 2 - spacing.M * (numColumns - 1)) / numColumns
    : width - spacing.M * 2;

  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
  }, []);

  const handleMediaPress = useCallback((id: string) => {
    router.push(`/details/${id}`);
  }, [router]);

  const resolvedType = type || 'trending';
  const config = useMemo(() => getCategoryConfig(resolvedType), [resolvedType]);

  return (
    <AnimatedScreen style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GlassHeader
        title={config.title}
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

      <View style={{ flex: 1, paddingTop: getSafeTopInset(insets) + HEADER_HEIGHT }}>
        {resolvedType === 'upcoming' || resolvedType === 'ratings' ? (
          <CategoryTabFeed
            type={resolvedType}
            sortBy="newest"
            viewMode={viewMode}
            cardWidth={cardWidth}
            numColumns={numColumns}
            handleMediaPress={handleMediaPress}
          />
        ) : (
          <SwipeableTabs
            tabs={SORT_OPTIONS.map(opt => opt.label)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          >
            {SORT_OPTIONS.map(opt => (
              <CategoryTabFeed
                key={opt.id}
                type={resolvedType}
                sortBy={opt.id}
                viewMode={viewMode}
                cardWidth={cardWidth}
                numColumns={numColumns}
                handleMediaPress={handleMediaPress}
              />
            ))}
          </SwipeableTabs>
        )}
      </View>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  feedContainer: {
    flex: 1,
  },
  tabResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.M,
    paddingTop: spacing.XS,
    paddingBottom: spacing.XS,
  },
  backButton: {
    padding: 4,
  },
  viewToggle: {
    padding: 4,
  },
  resultCount: {
    fontSize: 10,
    marginLeft: 0,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.M,
    justifyContent: 'space-between',
    paddingTop: spacing.S,
  },
  listContent: {
    paddingHorizontal: spacing.M,
  },
  cardContainer: {
    marginBottom: spacing.M,
  },
  footerLoader: {
    paddingVertical: spacing.XL,
    alignItems: 'center',
    gap: spacing.XS,
  },
  loadingMoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.XL,
    paddingBottom: spacing.XXL * 2,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.L,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.S,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
