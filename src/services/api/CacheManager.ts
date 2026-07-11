import AsyncStorage from '@react-native-async-storage/async-storage';

export const TTL = {
    SEARCH: 60 * 60 * 1000,             // 1 hour
    TRENDING: 30 * 60 * 1000,           // 30 minutes
    POPULAR: 30 * 60 * 1000,            // 30 minutes
    TOP_RATED: 30 * 60 * 1000,          // 30 minutes
    SEASONAL: 6 * 60 * 60 * 1000,         // 6 hours
    AIRING: 60 * 60 * 1000,             // 1 hour
    ANIME_DETAILS: 24 * 60 * 60 * 1000,  // 24 hours
    CHARACTERS: 7 * 24 * 60 * 60 * 1000,  // 7 days
    GENRES: 30 * 24 * 60 * 60 * 1000,     // 30 days
    RECOMMENDATIONS: 24 * 60 * 60 * 1000, // 24 hours (updated from 12 hours)
    EPISODES: 24 * 60 * 60 * 1000,        // 24 hours (new TTL)
};

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

/**
 * Centralized caching using memory (L1) and AsyncStorage (L2).
 * Implements concurrent request deduplication (Promise collapsing).
 * Supports Stale-While-Revalidate (background refresh) and Offline Fallback.
 */
class CacheManagerImpl {
    private memoryCache = new Map<string, CacheEntry<any>>();
    private activeRequests = new Map<string, Promise<any>>();

    // Hard limits for memory size
    private MAX_MEMORY_SIZE = 150;

    async fetchWithCache<T>(
        cacheKey: string,
        operation: () => Promise<T>,
        ttlMs: number,
        onUpdate?: (data: T) => void
    ): Promise<T> {
        const now = Date.now();

        // Helper to trigger background refresh
        const triggerBackgroundRefresh = async (existingStaleData?: T) => {
            if (this.activeRequests.has(cacheKey)) {
                try {
                    const freshData = await this.activeRequests.get(cacheKey);
                    if (onUpdate) onUpdate(freshData);
                } catch (e) {
                    console.warn(`[CacheManager] Background deduplicated refresh failed:`, e);
                }
                return;
            }

            const refreshPromise = (async () => {
                try {
                    const freshData = await operation();
                    this.setMemoryCache(cacheKey, freshData);
                    AsyncStorage.setItem(cacheKey, JSON.stringify({ data: freshData, timestamp: Date.now() }))
                        .catch(err => console.warn(`[CacheManager] L2 Write Error on refresh for ${cacheKey}:`, err));
                    if (onUpdate) onUpdate(freshData);
                    return freshData;
                } catch (error) {
                    console.warn(`[CacheManager] Background refresh failed for ${cacheKey}:`, error);
                    // Do NOT rethrow — this is a fire-and-forget background task.
                    // Rethrowing would create unhandled promise rejections.
                    return existingStaleData as T;
                } finally {
                    this.activeRequests.delete(cacheKey);
                }
            })();

            this.activeRequests.set(cacheKey, refreshPromise);
        };

        // 1. Check L1 Memory Cache
        const inMem = this.memoryCache.get(cacheKey);
        if (inMem) {
            const isFresh = now - inMem.timestamp < ttlMs;
            if (isFresh) {
                return inMem.data as T;
            } else {
                // Stale hit in L1 - return stale immediately, trigger bg refresh
                // onUpdate will fire ONLY when fresh data arrives from background
                triggerBackgroundRefresh(inMem.data).catch(() => { });
                return inMem.data as T;
            }
        }

        // 2. Check L2 AsyncStorage Cache
        let storedData: T | null = null;
        let storedTimestamp = 0;

        try {
            const stored = await AsyncStorage.getItem(cacheKey);
            if (stored) {
                const parsed = JSON.parse(stored) as CacheEntry<T>;
                storedData = parsed.data;
                storedTimestamp = parsed.timestamp;
            }
        } catch (err) {
            console.warn(`[CacheManager] L2 Read Error for ${cacheKey}:`, err);
        }

        if (storedData !== null) {
            const isFresh = now - storedTimestamp < ttlMs;
            // Restore to L1
            this.memoryCache.set(cacheKey, { data: storedData, timestamp: storedTimestamp });
            if (isFresh) {
                return storedData;
            } else {
                // Stale hit in L2 - return stale immediately, trigger bg refresh
                // onUpdate will fire ONLY when fresh data arrives from background
                triggerBackgroundRefresh(storedData).catch(() => { });
                return storedData;
            }
        }

        // 3. Cache Miss - Execute Network Operation (L1 & L2 misses)
        if (this.activeRequests.has(cacheKey)) {
            return this.activeRequests.get(cacheKey) as Promise<T>;
        }

        const executionPromise = (async () => {
            try {
                const freshData = await operation();
                this.setMemoryCache(cacheKey, freshData);
                AsyncStorage.setItem(cacheKey, JSON.stringify({ data: freshData, timestamp: Date.now() }))
                    .catch(err => console.warn(`[CacheManager] L2 Write Error for ${cacheKey}:`, err));
                if (onUpdate) onUpdate(freshData);
                return freshData;
            } catch (error) {
                // 4. Offline Fallback: If network operation fails, retrieve any expired cache if available!
                console.warn(`[CacheManager] Network request failed for ${cacheKey}. Attempting offline fallback cache check...`, error);

                const fallbackMem = this.memoryCache.get(cacheKey);
                if (fallbackMem) {
                    console.log(`[CacheManager] Offline Fallback: Returning expired L1 cache for ${cacheKey}`);
                    return fallbackMem.data as T;
                }

                try {
                    const stored = await AsyncStorage.getItem(cacheKey);
                    if (stored) {
                        const parsed = JSON.parse(stored) as CacheEntry<T>;
                        console.log(`[CacheManager] Offline Fallback: Returning expired L2 cache for ${cacheKey}`);
                        this.memoryCache.set(cacheKey, { data: parsed.data, timestamp: parsed.timestamp });
                        return parsed.data;
                    }
                } catch (l2FallbackErr) {
                    console.warn(`[CacheManager] L2 Offline Fallback Read failed for ${cacheKey}:`, l2FallbackErr);
                }

                throw error;
            } finally {
                this.activeRequests.delete(cacheKey);
            }
        })();

        this.activeRequests.set(cacheKey, executionPromise);
        return executionPromise as Promise<T>;
    }

    private setMemoryCache(key: string, data: any) {
        if (this.memoryCache.size >= this.MAX_MEMORY_SIZE) {
            const firstKey = this.memoryCache.keys().next().value;
            if (firstKey) this.memoryCache.delete(firstKey);
        }
        this.memoryCache.set(key, { data, timestamp: Date.now() });
    }

    async setCacheEntry<T>(cacheKey: string, data: T) {
        this.setMemoryCache(cacheKey, data);
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }))
            .catch(err => console.warn(`[CacheManager] L2 Write Error on setCacheEntry for ${cacheKey}:`, err));
    }

    async getCacheEntry<T>(cacheKey: string): Promise<T | null> {
        const mem = this.memoryCache.get(cacheKey);
        if (mem && mem.data) return mem.data as T;
        try {
            const stored = await AsyncStorage.getItem(cacheKey);
            if (stored) {
                const parsed = JSON.parse(stored) as CacheEntry<T>;
                if (parsed.data) {
                    this.memoryCache.set(cacheKey, parsed);
                    return parsed.data;
                }
            }
        } catch (e) {
            console.warn(`[CacheManager] getCacheEntry failed for ${cacheKey}:`, e);
        }
        return null;
    }

    async patchCacheEntry<T>(cacheKey: string, patcher: (data: T) => T): Promise<void> {
        const existing = await this.getCacheEntry<T>(cacheKey);
        if (existing) {
            const patched = patcher(existing);
            await this.setCacheEntry(cacheKey, patched);
        }
    }

    async clearCache() {
        this.memoryCache.clear();
    }
}

export const CacheManager = new CacheManagerImpl();
