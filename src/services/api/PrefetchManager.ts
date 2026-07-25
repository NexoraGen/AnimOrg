import { InteractionManager } from 'react-native';
import { animeApi } from '../animeApi';

class PrefetchManagerImpl {
    private prefetchedIds = new Set<string>();

    prefetchAnime(id: string) {
        const idStr = String(id);
        if (this.prefetchedIds.has(idStr)) return;
        this.prefetchedIds.add(idStr);

        InteractionManager.runAfterInteractions(() => {
            // Run silently in background without onUpdate or await blocking
            animeApi.getAnimeDetails(idStr)
                .then(() => {
                    console.log(`[PrefetchManager] Prefetched details for ${idStr}`);
                    // Also prefetch characters and recommendations to make the transition buttery smooth!
                    return Promise.all([
                        animeApi.getAnimeCharacters(idStr),
                        animeApi.getAnimeRecommendations(idStr),
                    ]);
                })
                .then(() => {
                    console.log(`[PrefetchManager] Prefetched characters and recommendations for ${idStr}`);
                })
                .catch(err => {
                    console.warn(`[PrefetchManager] Prefetch failed for ${idStr}:`, err);
                });
        });
    }

    prefetchMultiple(ids: string[]) {
        ids.forEach(id => this.prefetchAnime(id));
    }
}

export const PrefetchManager = new PrefetchManagerImpl();
