import { useState, useCallback, useRef } from 'react';
import { getCategoryConfig } from '../config/categoryConfig';
import { Media } from '../types';

interface UseCategoryResult {
    data: Media[];
    isLoading: boolean;
    isLoadingMore: boolean;
    isRefreshing: boolean;
    hasMore: boolean;
    title: string;
    icon: string;
    emptyMessage: string;
    emptyIcon: string;
    supportsPagination: boolean;
    supportsFilters: boolean;
    loadMore: () => void;
    onRefresh: () => void;
    initialFetch: () => void;
}

/**
 * Reusable hook that encapsulates all category data fetching,
 * pagination, refresh, and duplicate-request prevention.
 */
export function useCategory(type: string, sortBy: string = 'popularity'): UseCategoryResult {
    const config = getCategoryConfig(type);

    const cacheKey = `${type}_${sortBy}`;
    const [prevKey, setPrevKey] = useState(cacheKey);
    const cacheRef = useRef<Record<string, { data: Media[]; page: number; hasMore: boolean }>>({});

    const [data, setData] = useState<Media[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const pageRef = useRef(1);
    const isFetchingRef = useRef(false);

    // Derived state update when type or sortBy changes
    if (cacheKey !== prevKey) {
        setPrevKey(cacheKey);
        const cached = cacheRef.current[cacheKey];
        if (cached) {
            setData(cached.data);
            setHasMore(cached.hasMore);
            pageRef.current = cached.page;
            setIsLoading(false);
        } else {
            setData([]);
            setHasMore(true);
            pageRef.current = 1;
            setIsLoading(true);
        }
    }

    const initialFetch = useCallback(async () => {
        if (!config.fetchFn) return;

        const currentCache = cacheRef.current[cacheKey];
        if (currentCache) {
            setData(currentCache.data);
            setHasMore(currentCache.hasMore);
            pageRef.current = currentCache.page;
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        pageRef.current = 1;
        setHasMore(true);

        try {
            const results = await config.fetchFn(1, sortBy);
            setData(results);
            if (results.length === 0) setHasMore(false);

            cacheRef.current[cacheKey] = {
                data: results,
                page: 1,
                hasMore: results.length > 0
            };
        } catch (error) {
            console.error(`[useCategory] Error fetching ${type}:`, error);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    }, [type, sortBy, config, cacheKey]);

    const loadMore = useCallback(async () => {
        if (!config.supportsPagination) return;
        if (isFetchingRef.current || !hasMore) return;
        isFetchingRef.current = true;
        setIsLoadingMore(true);

        try {
            const nextPage = pageRef.current + 1;
            const results = await config.fetchFn(nextPage, sortBy);
            if (results.length > 0) {
                setData(prev => {
                    const existingIds = new Set(prev.map(item => item.id));
                    const newItems = results.filter(item => !existingIds.has(item.id));
                    const updated = [...prev, ...newItems];

                    cacheRef.current[cacheKey] = {
                        data: updated,
                        page: nextPage,
                        hasMore: true
                    };

                    return updated;
                });
                pageRef.current = nextPage;
            } else {
                setHasMore(false);
                if (cacheRef.current[cacheKey]) {
                    cacheRef.current[cacheKey].hasMore = false;
                }
            }
        } catch (error) {
            console.error(`[useCategory] Error loading more ${type}:`, error);
        } finally {
            setIsLoadingMore(false);
            isFetchingRef.current = false;
        }
    }, [type, sortBy, hasMore, config, cacheKey]);

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        pageRef.current = 1;
        setHasMore(true);

        try {
            const results = await config.fetchFn(1, sortBy);
            setData(results);
            if (results.length === 0) setHasMore(false);

            cacheRef.current[cacheKey] = {
                data: results,
                page: 1,
                hasMore: results.length > 0
            };
        } catch (error) {
            console.error(`[useCategory] Error refreshing ${type}:`, error);
        } finally {
            setIsRefreshing(false);
        }
    }, [type, sortBy, config, cacheKey]);

    return {
        data,
        isLoading,
        isLoadingMore,
        isRefreshing,
        hasMore,
        title: config.title,
        icon: config.icon,
        emptyMessage: config.emptyMessage,
        emptyIcon: config.emptyIcon,
        supportsPagination: config.supportsPagination,
        supportsFilters: config.supportsFilters,
        loadMore,
        onRefresh,
        initialFetch,
    };
}
