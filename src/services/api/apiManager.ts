import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Thread-safe Global Throttler supporting max concurrent requests
class RequestThrottler {
    private activeCount = 0;
    private queue: (() => void)[] = [];
    private maxConcurrency = 2; // Keep AniList & Jikan safe from rate limits

    async run<T>(fn: () => Promise<T>): Promise<T> {
        if (this.activeCount >= this.maxConcurrency) {
            await new Promise<void>(resolve => this.queue.push(resolve));
        }
        this.activeCount++;
        try {
            return await fn();
        } finally {
            this.activeCount--;
            const next = this.queue.shift();
            if (next) next();
        }
    }
}

export const globalThrottler = new RequestThrottler();

// 2. High-fidelity InMemory cache mapping
const inMemoryCache = new Map<string, { data: any; timestamp: number }>();
const MAX_CACHE_SIZE = 120;

// Custom Cache durations mapping
export const CACHE_TTL = {
    trending: 30 * 60 * 1000,       // 30 mins
    seasonal: 30 * 60 * 1000,       // 30 mins
    top_rated: 24 * 60 * 60 * 1000, // 24 hours
    curated: 24 * 60 * 60 * 1000,   // 24 hours
    schedule: 30 * 60 * 1000,      // 30 mins
    details: 12 * 60 * 60 * 1000,   // 12 hours
    characters: 24 * 60 * 60 * 1000, // 24 hours
    other: 30 * 60 * 1000,         // default 30 mins
};

export type CacheCategory = keyof typeof CACHE_TTL;

export const apiManager = {
    /**
     * Retrieves data from the cache (in-memory -> AsyncStorage falls).
     */
    getCache: async (key: string, ttl: number): Promise<any | null> => {
        // Check in-memory
        const memory = inMemoryCache.get(key);
        if (memory && Date.now() - memory.timestamp < ttl) {
            return memory.data;
        }

        // Check AsyncStorage parsing
        try {
            const stored = await AsyncStorage.getItem(`swr_cache_${key}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Date.now() - parsed.timestamp < ttl) {
                    // Sync into memory for rapid access
                    inMemoryCache.set(key, parsed);
                    return parsed.data;
                }
            }
        } catch {
            // Sliently fail storage read exceptions
        }
        return null;
    },

    /**
     * Saves data into both memory and AsyncStorage caches.
     */
    setCache: async (key: string, data: any): Promise<void> => {
        const payload = { data, timestamp: Date.now() };

        // Memory Cache Eviction Strategy
        if (inMemoryCache.size >= MAX_CACHE_SIZE) {
            const oldest = inMemoryCache.keys().next().value;
            if (oldest) inMemoryCache.delete(oldest);
        }
        inMemoryCache.set(key, payload);

        try {
            await AsyncStorage.setItem(`swr_cache_${key}`, JSON.stringify(payload));
        } catch {
            // Sliently fail storage write errors
        }
    },

    /**
     * Central broker managing SWR execution, Concurrent Throttling, and Auto Failover.
     */
    fetchWithSWR: async <T>(
        category: CacheCategory,
        cacheKey: string,
        primaryFetcher: () => Promise<T>,
        fallbackFetcher?: () => Promise<T>,
        onUpdate?: (freshData: T) => void
    ): Promise<T> => {
        const ttl = CACHE_TTL[category] || CACHE_TTL.other;

        const executeAndCache = async (): Promise<T> => {
            return globalThrottler.run(async () => {
                try {
                    const freshData = await primaryFetcher();
                    await apiManager.setCache(cacheKey, freshData);
                    return freshData;
                } catch (error) {
                    console.warn(`[API Manager] Primary fetch failed for ${cacheKey}. Triggering secondary fallback...`, error);
                    if (fallbackFetcher) {
                        try {
                            const fallbackData = await fallbackFetcher();
                            await apiManager.setCache(cacheKey, fallbackData);
                            return fallbackData;
                        } catch (fallbackError) {
                            console.error(`[API Manager] Catastrophic failure. Both primary & fallback crashed for ${cacheKey}:`, fallbackError);
                            throw fallbackError;
                        }
                    }
                    throw error;
                }
            });
        };

        // 1. Double check cached index
        const cachedData = await apiManager.getCache(cacheKey, ttl);

        if (cachedData !== null) {
            // If we have cached data, we check if it is still valid or stale
            const storedPayload = inMemoryCache.get(cacheKey) ||
                await (async () => {
                    try {
                        const raw = await AsyncStorage.getItem(`swr_cache_${cacheKey}`);
                        return raw ? JSON.parse(raw) : null;
                    } catch { return null; }
                })();

            const isStale = storedPayload ? (Date.now() - storedPayload.timestamp >= ttl) : true;

            if (isStale) {
                if (onUpdate) {
                    // Flow 2: Refresh silently in background, return stale instantly!
                    executeAndCache()
                        .then(fresh => {
                            // Checks if the new data differs from the cached content to avoid redundant UI re-renders
                            if (JSON.stringify(fresh) !== JSON.stringify(cachedData)) {
                                console.log(`[API SWR] Cache revalidated with updates for ${cacheKey}. Notifying subscriber.`);
                                onUpdate(fresh);
                            }
                        })
                        .catch(() => {
                            /* Background fetch crash handled silently. Stale details persist on screen safely */
                        });
                    return cachedData;
                } else {
                    // No callback provided: Fetch synchronously in foreground
                    try {
                        return await executeAndCache();
                    } catch {
                        return cachedData; // Fallback to stale values on total offline blackout
                    }
                }
            }
            return cachedData; // Cache is fresh!
        }

        // 2. Cache absent completely: Fetch in foreground
        try {
            return await executeAndCache();
        } catch (error) {
            // Retrieve expired cache if any exist (to avoid loading failure on first boot in air-tight environments)
            try {
                const stored = await AsyncStorage.getItem(`swr_cache_${cacheKey}`);
                if (stored) {
                    return JSON.parse(stored).data;
                }
            } catch { }
            throw error;
        }
    }
};
