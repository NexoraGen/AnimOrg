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
export function useCategory(type: string): UseCategoryResult {
    const config = getCategoryConfig(type);

    const [data, setData] = useState<Media[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const pageRef = useRef(1);
    const isFetchingRef = useRef(false);

    const initialFetch = useCallback(async () => {
        if (!config.fetchFn) return;
        setIsLoading(true);
        pageRef.current = 1;
        setHasMore(true);

        try {
            const results = await config.fetchFn(1);
            setData(results);
            if (results.length === 0) setHasMore(false);
        } catch (error) {
            console.error(`[useCategory] Error fetching ${type}:`, error);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    }, [type]);

    const loadMore = useCallback(async () => {
        if (!config.supportsPagination) return;
        if (isFetchingRef.current || !hasMore) return;
        isFetchingRef.current = true;
        setIsLoadingMore(true);

        try {
            const nextPage = pageRef.current + 1;
            const results = await config.fetchFn(nextPage);
            if (results.length > 0) {
                setData(prev => {
                    // Deduplicate by id
                    const existingIds = new Set(prev.map(item => item.id));
                    const newItems = results.filter(item => !existingIds.has(item.id));
                    return [...prev, ...newItems];
                });
                pageRef.current = nextPage;
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error(`[useCategory] Error loading more ${type}:`, error);
        } finally {
            setIsLoadingMore(false);
            isFetchingRef.current = false;
        }
    }, [type, hasMore]);

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        pageRef.current = 1;
        setHasMore(true);

        try {
            const results = await config.fetchFn(1);
            setData(results);
            if (results.length === 0) setHasMore(false);
        } catch (error) {
            console.error(`[useCategory] Error refreshing ${type}:`, error);
        } finally {
            setIsRefreshing(false);
        }
    }, [type]);

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
