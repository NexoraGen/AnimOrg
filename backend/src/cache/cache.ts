import NodeCache from "node-cache";

export interface CacheEntry<T = any> {
    data: T;
    cachedAt: number;
}

const cache = new NodeCache({
    stdTTL: 3600, // Default: 1 hour
    checkperiod: 120,
    useClones: false,
});

// Get fresh cache
export function getFreshCache<T = any>(
    key: string
): CacheEntry<T> | undefined {
    return cache.get<CacheEntry<T>>(key);
}

// Get stale cache (currently same as fresh, future-ready for Redis)
export function getStaleCache<T = any>(
    key: string
): CacheEntry<T> | undefined {
    return cache.get<CacheEntry<T>>(key);
}

// Save with custom TTL
export function saveCache(
    key: string,
    data: any,
    ttlSeconds: number = 3600
) {
    cache.set(
        key,
        {
            data,
            cachedAt: Date.now(),
        },
        ttlSeconds
    );
}

// Delete one cache entry
export function clearCache(key?: string) {
    if (key) {
        cache.del(key);
    } else {
        cache.flushAll();
    }
}

// Cache statistics
export function getCacheStats() {
    return cache.getStats();
}

// Number of cached keys
export function getCacheKeys() {
    return cache.keys();
}

// Check if key exists
export function hasCache(key: string) {
    return cache.has(key);
}