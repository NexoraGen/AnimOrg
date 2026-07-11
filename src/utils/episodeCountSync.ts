import AsyncStorage from '@react-native-async-storage/async-storage';
import { Media } from '../types';

type EpisodeCountListener = (animeId: string, count: number) => void;

class EpisodeCountRegistryImpl {
    private knownCounts: Record<string, number> = {};
    private initialized = false;
    private initializingPromise: Promise<void> | null = null;
    private listeners: Set<EpisodeCountListener> = new Set();

    async init(): Promise<void> {
        if (this.initialized) return;
        if (this.initializingPromise) return this.initializingPromise;

        this.initializingPromise = (async () => {
            try {
                const stored = await AsyncStorage.getItem('animorg_known_episodes');
                if (stored) {
                    this.knownCounts = JSON.parse(stored);
                }
            } catch (e) {
                console.warn('[EpisodeCountRegistry] Failed to load registry from storage:', e);
            }
            this.initialized = true;
            this.initializingPromise = null;
        })();

        return this.initializingPromise;
    }

    subscribe(listener: EpisodeCountListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    getKnownCount(animeId: string): number | null {
        return this.knownCounts[String(animeId)] || null;
    }

    async registerCount(animeId: string, count: number): Promise<void> {
        await this.init();
        const idStr = String(animeId);
        const existing = this.knownCounts[idStr] || 0;
        if (count > existing) {
            this.knownCounts[idStr] = count;
            try {
                await AsyncStorage.setItem('animorg_known_episodes', JSON.stringify(this.knownCounts));
            } catch (e) {
                console.warn('[EpisodeCountRegistry] Failed to save registry to storage:', e);
            }

            // Notify reactive listeners (e.g. details page)
            this.listeners.forEach(listener => {
                try {
                    listener(idStr, count);
                } catch (e) {
                    console.warn('[EpisodeCountRegistry] listener error:', e);
                }
            });

            // Patch cached details entry in CacheManager silently
            try {
                const { CacheManager } = require('../services/api/CacheManager');
                CacheManager.patchCacheEntry(`details_${idStr}`, (media: Media) => {
                    if (media && (!media.episodes || media.episodes < count)) {
                        return { ...media, episodes: count };
                    }
                    return media;
                }).catch(() => { });
            } catch (cacheErr) {
                console.debug('[EpisodeCountRegistry] Cache patch skipped:', cacheErr);
            }

            // Synchronize back to the Zustand store (watchlist & continueWatching)
            try {
                const { useAppStore } = require('../store/useAppStore');
                const state = useAppStore.getState();
                const currentItem = state.watchlist.find((w: any) => String(w.mediaId) === idStr);

                if (currentItem && (currentItem.episodes || 0) < count) {
                    console.log(`[EpisodeCountSync] Auto-correcting watchlist count for ${currentItem.title} from ${currentItem.episodes} to ${count}`);

                    useAppStore.setState((s: any) => ({
                        watchlist: s.watchlist.map((w: any) =>
                            String(w.mediaId) === idStr ? { ...w, episodes: count } : w
                        )
                    }));

                    // Direct sync with Firestore in background if authenticated
                    if (state.user) {
                        const updated = useAppStore.getState().watchlist.find((w: any) => String(w.mediaId) === idStr);
                        if (updated) {
                            const { firestoreService } = require('../services/firebase/firestore');
                            firestoreService.addToWatchlist(state.user.id, updated).catch((err: any) => {
                                console.warn('[EpisodeCountSync] Watchlist Firestore sync failed:', err);
                            });
                            firestoreService.syncTrackedAnime(state.user.id, updated).catch((err: any) => {
                                console.warn('[EpisodeCountSync] Tracked sync failed:', err);
                            });
                        }
                    }
                }
            } catch (storeError) {
                console.debug('[EpisodeCountRegistry] Zustand store import skipped or failed:', storeError);
            }
        }
    }

    checkAndFixMedia(media: Media | null): Media | null {
        if (!media || !media.id) return media;
        const known = this.getKnownCount(media.id);
        if (known && (!media.episodes || media.episodes < known)) {
            return { ...media, episodes: known };
        }
        return media;
    }
}

export const EpisodeCountRegistry = new EpisodeCountRegistryImpl();
// Prompt initialization in background asynchronously
EpisodeCountRegistry.init().catch(() => { });
