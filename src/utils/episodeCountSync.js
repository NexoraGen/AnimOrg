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
exports.EpisodeCountRegistry = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
class EpisodeCountRegistryImpl {
    constructor() {
        this.knownCounts = {};
        this.initialized = false;
        this.initializingPromise = null;
        this.listeners = new Set();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.initialized)
                return;
            if (this.initializingPromise)
                return this.initializingPromise;
            this.initializingPromise = (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const stored = yield async_storage_1.default.getItem('animorg_known_episodes');
                    if (stored) {
                        this.knownCounts = JSON.parse(stored);
                    }
                }
                catch (e) {
                    console.warn('[EpisodeCountRegistry] Failed to load registry from storage:', e);
                }
                this.initialized = true;
                this.initializingPromise = null;
            }))();
            return this.initializingPromise;
        });
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    getKnownCount(animeId) {
        return this.knownCounts[String(animeId)] || null;
    }
    registerCount(animeId, count) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.init();
            const idStr = String(animeId);
            const existing = this.knownCounts[idStr] || 0;
            if (count > existing) {
                this.knownCounts[idStr] = count;
                try {
                    yield async_storage_1.default.setItem('animorg_known_episodes', JSON.stringify(this.knownCounts));
                }
                catch (e) {
                    console.warn('[EpisodeCountRegistry] Failed to save registry to storage:', e);
                }
                // Notify reactive listeners (e.g. details page)
                this.listeners.forEach(listener => {
                    try {
                        listener(idStr, count);
                    }
                    catch (e) {
                        console.warn('[EpisodeCountRegistry] listener error:', e);
                    }
                });
                // Patch cached details entry in CacheManager silently
                try {
                    const { CacheManager } = require('../services/api/CacheManager');
                    CacheManager.patchCacheEntry(`details_${idStr}`, (media) => {
                        if (media && (!media.episodes || media.episodes < count)) {
                            return Object.assign(Object.assign({}, media), { episodes: count });
                        }
                        return media;
                    }).catch(() => { });
                }
                catch (cacheErr) {
                    console.debug('[EpisodeCountRegistry] Cache patch skipped:', cacheErr);
                }
                // Synchronize back to the Zustand store (watchlist & continueWatching)
                try {
                    const { useAppStore } = require('../store/useAppStore');
                    const state = useAppStore.getState();
                    const currentItem = state.watchlist.find((w) => String(w.mediaId) === idStr);
                    if (currentItem && (currentItem.episodes || 0) < count) {
                        console.log(`[EpisodeCountSync] Auto-correcting watchlist count for ${currentItem.title} from ${currentItem.episodes} to ${count}`);
                        useAppStore.setState((s) => ({
                            watchlist: s.watchlist.map((w) => String(w.mediaId) === idStr ? Object.assign(Object.assign({}, w), { episodes: count }) : w)
                        }));
                        // Direct sync with Firestore in background if authenticated
                        if (state.user) {
                            const updated = useAppStore.getState().watchlist.find((w) => String(w.mediaId) === idStr);
                            if (updated) {
                                const { firestoreService } = require('../services/firebase/firestore');
                                firestoreService.addToWatchlist(state.user.id, updated).catch((err) => {
                                    console.warn('[EpisodeCountSync] Watchlist Firestore sync failed:', err);
                                });
                                firestoreService.syncTrackedAnime(state.user.id, updated).catch((err) => {
                                    console.warn('[EpisodeCountSync] Tracked sync failed:', err);
                                });
                            }
                        }
                    }
                }
                catch (storeError) {
                    console.debug('[EpisodeCountRegistry] Zustand store import skipped or failed:', storeError);
                }
            }
        });
    }
    checkAndFixMedia(media) {
        if (!media || !media.id)
            return media;
        const known = this.getKnownCount(media.id);
        if (known && (!media.episodes || media.episodes < known)) {
            return Object.assign(Object.assign({}, media), { episodes: known });
        }
        return media;
    }
}
exports.EpisodeCountRegistry = new EpisodeCountRegistryImpl();
// Prompt initialization in background asynchronously
exports.EpisodeCountRegistry.init().catch(() => { });
