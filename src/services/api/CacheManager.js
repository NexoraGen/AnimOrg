"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = exports.TTL = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
exports.TTL = {
    SEARCH: 60 * 60 * 1000, // 1 hour
    TRENDING: 30 * 60 * 1000, // 30 minutes
    POPULAR: 30 * 60 * 1000, // 30 minutes
    TOP_RATED: 30 * 60 * 1000, // 30 minutes
    SEASONAL: 6 * 60 * 60 * 1000, // 6 hours
    AIRING: 60 * 60 * 1000, // 1 hour
    ANIME_DETAILS: 24 * 60 * 60 * 1000, // 24 hours
    CHARACTERS: 7 * 24 * 60 * 60 * 1000, // 7 days
    GENRES: 30 * 24 * 60 * 60 * 1000, // 30 days
    RECOMMENDATIONS: 24 * 60 * 60 * 1000, // 24 hours (updated from 12 hours)
    EPISODES: 24 * 60 * 60 * 1000, // 24 hours (new TTL)
};
/**
 * Centralized caching using memory (L1) and AsyncStorage (L2).
 * Implements concurrent request deduplication (Promise collapsing).
 * Supports Stale-While-Revalidate (background refresh) and Offline Fallback.
 */
class CacheManagerImpl {
    constructor() {
        this.memoryCache = new Map();
        this.activeRequests = new Map();
        // Hard limits for memory size
        this.MAX_MEMORY_SIZE = 150;
    }
    fetchWithCache(cacheKey, operation, ttlMs, onUpdate) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            // Helper to trigger background refresh
            const triggerBackgroundRefresh = (existingStaleData) => __awaiter(this, void 0, void 0, function* () {
                if (this.activeRequests.has(cacheKey)) {
                    try {
                        const freshData = yield this.activeRequests.get(cacheKey);
                        if (onUpdate)
                            onUpdate(freshData);
                    }
                    catch (e) {
                        console.warn(`[CacheManager] Background deduplicated refresh failed:`, e);
                    }
                    return;
                }
                const refreshPromise = (() => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const freshData = yield operation();
                        this.setMemoryCache(cacheKey, freshData);
                        async_storage_1.default.setItem(cacheKey, JSON.stringify({ data: freshData, timestamp: Date.now() }))
                            .catch(err => console.warn(`[CacheManager] L2 Write Error on refresh for ${cacheKey}:`, err));
                        if (onUpdate)
                            onUpdate(freshData);
                        return freshData;
                    }
                    catch (error) {
                        console.warn(`[CacheManager] Background refresh failed for ${cacheKey}:`, error);
                        // Do NOT rethrow — this is a fire-and-forget background task.
                        // Rethrowing would create unhandled promise rejections.
                        return existingStaleData;
                    }
                    finally {
                        this.activeRequests.delete(cacheKey);
                    }
                }))();
                this.activeRequests.set(cacheKey, refreshPromise);
            });
            // 1. Check L1 Memory Cache
            const inMem = this.memoryCache.get(cacheKey);
            if (inMem) {
                const isFresh = now - inMem.timestamp < ttlMs;
                if (isFresh) {
                    return inMem.data;
                }
                else {
                    // Stale hit in L1 - return stale immediately, trigger bg refresh
                    // onUpdate will fire ONLY when fresh data arrives from background
                    triggerBackgroundRefresh(inMem.data).catch(() => { });
                    return inMem.data;
                }
            }
            // 2. Check L2 AsyncStorage Cache
            let storedData = null;
            let storedTimestamp = 0;
            try {
                const stored = yield async_storage_1.default.getItem(cacheKey);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    storedData = parsed.data;
                    storedTimestamp = parsed.timestamp;
                }
            }
            catch (err) {
                console.warn(`[CacheManager] L2 Read Error for ${cacheKey}:`, err);
            }
            if (storedData !== null) {
                const isFresh = now - storedTimestamp < ttlMs;
                // Restore to L1
                this.memoryCache.set(cacheKey, { data: storedData, timestamp: storedTimestamp });
                if (isFresh) {
                    return storedData;
                }
                else {
                    // Stale hit in L2 - return stale immediately, trigger bg refresh
                    // onUpdate will fire ONLY when fresh data arrives from background
                    triggerBackgroundRefresh(storedData).catch(() => { });
                    return storedData;
                }
            }
            // 3. Cache Miss - Execute Network Operation (L1 & L2 misses)
            if (this.activeRequests.has(cacheKey)) {
                return this.activeRequests.get(cacheKey);
            }
            const executionPromise = (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const freshData = yield operation();
                    this.setMemoryCache(cacheKey, freshData);
                    async_storage_1.default.setItem(cacheKey, JSON.stringify({ data: freshData, timestamp: Date.now() }))
                        .catch(err => console.warn(`[CacheManager] L2 Write Error for ${cacheKey}:`, err));
                    if (onUpdate)
                        onUpdate(freshData);
                    return freshData;
                }
                catch (error) {
                    // 4. Offline Fallback: If network operation fails, retrieve any expired cache if available!
                    console.warn(`[CacheManager] Network request failed for ${cacheKey}. Attempting offline fallback cache check...`, error);
                    const fallbackMem = this.memoryCache.get(cacheKey);
                    if (fallbackMem) {
                        console.log(`[CacheManager] Offline Fallback: Returning expired L1 cache for ${cacheKey}`);
                        return fallbackMem.data;
                    }
                    try {
                        const stored = yield async_storage_1.default.getItem(cacheKey);
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            console.log(`[CacheManager] Offline Fallback: Returning expired L2 cache for ${cacheKey}`);
                            this.memoryCache.set(cacheKey, { data: parsed.data, timestamp: parsed.timestamp });
                            return parsed.data;
                        }
                    }
                    catch (l2FallbackErr) {
                        console.warn(`[CacheManager] L2 Offline Fallback Read failed for ${cacheKey}:`, l2FallbackErr);
                    }
                    throw error;
                }
                finally {
                    this.activeRequests.delete(cacheKey);
                }
            }))();
            this.activeRequests.set(cacheKey, executionPromise);
            return executionPromise;
        });
    }
    setMemoryCache(key, data) {
        if (this.memoryCache.size >= this.MAX_MEMORY_SIZE) {
            const firstKey = this.memoryCache.keys().next().value;
            if (firstKey)
                this.memoryCache.delete(firstKey);
        }
        this.memoryCache.set(key, { data, timestamp: Date.now() });
    }
    setCacheEntry(cacheKey, data) {
        return __awaiter(this, void 0, void 0, function* () {
            this.setMemoryCache(cacheKey, data);
            yield async_storage_1.default.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }))
                .catch(err => console.warn(`[CacheManager] L2 Write Error on setCacheEntry for ${cacheKey}:`, err));
        });
    }
    getCacheEntry(cacheKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const mem = this.memoryCache.get(cacheKey);
            if (mem && mem.data)
                return mem.data;
            try {
                const stored = yield async_storage_1.default.getItem(cacheKey);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.data) {
                        this.memoryCache.set(cacheKey, parsed);
                        return parsed.data;
                    }
                }
            }
            catch (e) {
                console.warn(`[CacheManager] getCacheEntry failed for ${cacheKey}:`, e);
            }
            return null;
        });
    }
    patchCacheEntry(cacheKey, patcher) {
        return __awaiter(this, void 0, void 0, function* () {
            const existing = yield this.getCacheEntry(cacheKey);
            if (existing) {
                const patched = patcher(existing);
                yield this.setCacheEntry(cacheKey, patched);
            }
        });
    }
    clearCache() {
        return __awaiter(this, void 0, void 0, function* () {
            this.memoryCache.clear();
        });
    }
}
exports.CacheManager = new CacheManagerImpl();
