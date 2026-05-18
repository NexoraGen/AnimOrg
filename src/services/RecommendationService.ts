import { animeApi } from './animeApi';
import { Media, WatchlistItem, UserRating } from '../types';

export interface RecommendationResult {
    anime: Media;
    reason: string;
    score: number;
}

export interface RecommendationResult {
    anime: Media;
    reason: string;
    score: number;
    mode: 'personalized' | 'community';
}

export const RecommendationService = {
    /**
     * Generates a smart recommendation using either user-specific taste profiling or community buzz.
     */
    getSmartRecommendation: async (
        watchlist: WatchlistItem[],
        userRatings: UserRating[],
        favoriteGenres: string[],
        notInterested: string[],
        recommendationHistory: string[],
        mode: 'personalized' | 'community' = 'personalized'
    ): Promise<RecommendationResult | null> => {
        try {
            // 1. Build Candidate Pool from multiple API sources
            const [trending, seasonal, top, upcoming] = await Promise.all([
                animeApi.getTrendingAnime(1),
                animeApi.getSeasonalAnime(1),
                animeApi.getTopAnime(1),
                animeApi.getUpcomingAnime(1)
            ]);

            // Add specific recommendations for highly rated anime (Top 3)
            let specificRecs: Media[] = [];
            if (userRatings.length > 0) {
                const topRatedIds = userRatings
                    .filter(r => r.score >= 8)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3)
                    .map(r => r.animeId);

                const specificRecsPromises = topRatedIds.map(id =>
                    animeApi.getAnimeRecommendations(id).catch(() => [] as Media[])
                );
                const specificRecsResults = await Promise.all(specificRecsPromises);
                specificRecs = specificRecsResults.flat();
            }

            // Combine all candidates
            const allCandidates = [
                ...trending,
                ...seasonal,
                ...top,
                ...upcoming,
                ...specificRecs
            ];

            // Deduplicate items
            const seenIds = new Set<string>();
            const uniqueCandidates = allCandidates.filter(c => {
                if (!c || seenIds.has(c.id)) return false;
                seenIds.add(c.id);
                return true;
            });

            // 2. Strict Memory and Watchlist Filter (Last 10 Suggestions, Completed, watching, dropped, notInterested)
            const lastTenShown = recommendationHistory.slice(-10);

            // Exclude already actively watched, completed, or dropped shows
            const excludedWatchlistIds = watchlist
                .filter(w => w.status === 'watching' || w.status === 'completed' || w.status === 'dropped')
                .map(w => String(w.mediaId));

            const blacklist = new Set([
                ...excludedWatchlistIds,
                ...notInterested.map(String),
                ...lastTenShown.map(String)
            ]);

            const filteredPool = uniqueCandidates.filter(c => !blacklist.has(String(c.id)));

            if (filteredPool.length === 0) {
                // Safe Fallback: reuse candidates bypassing strict active watchlist checks, retaining notInterested blocks
                const softBlacklist = new Set([
                    ...notInterested.map(String),
                    ...lastTenShown.map(String)
                ]);
                const fallbackPool = uniqueCandidates.filter(c => !softBlacklist.has(String(c.id)));
                if (fallbackPool.length === 0) return null;
                return RecommendationService.scoreAndPick(fallbackPool, watchlist, userRatings, favoriteGenres, trending, mode);
            }

            return RecommendationService.scoreAndPick(filteredPool, watchlist, userRatings, favoriteGenres, trending, mode);

        } catch (error) {
            console.error('Recommendation Engine Error:', error);
            return null;
        }
    },

    /**
     * Score a list of candidate anime using either personalized taste or community features.
     */
    scoreAndPick: (
        pool: Media[],
        watchlist: WatchlistItem[],
        userRatings: UserRating[],
        favoriteGenres: string[],
        trending: Media[],
        mode: 'personalized' | 'community'
    ): RecommendationResult | null => {
        if (pool.length === 0) return null;

        const isGuest = watchlist.length === 0 && userRatings.length === 0;

        // Obtain favored studios based on 8+ ratings
        const favoredStudios = new Set<string>();
        userRatings.filter(r => r.score >= 8).forEach(r => {
            const item = watchlist.find(w => String(w.mediaId) === String(r.animeId));
            if (item && (item as any).studio) {
                favoredStudios.add((item as any).studio);
            }
        });

        const scored = pool.map(anime => {
            let score = 0;
            let explanation = '';

            if (mode === 'personalized' && !isGuest) {
                // ==========================================
                // MODE A: PERSONALIZED SCORING (Taste Profile)
                // ==========================================

                // Genre Matching
                const matchingGenres = anime.genres.filter(g => favoriteGenres.includes(g));
                if (matchingGenres.length > 0) {
                    score += matchingGenres.length * 40;
                    if (matchingGenres.length >= 2) {
                        explanation = `Because you enjoy ${matchingGenres.slice(0, 2).join(' & ')}`;
                    } else {
                        explanation = `Matches your preference for ${matchingGenres[0]}`;
                    }
                }

                // Studio Alignment
                if (anime.studio && favoredStudios.has(anime.studio)) {
                    score += 25;
                    explanation = `From Studio ${anime.studio}, who created your high-rated highlights`;
                }

                // Quality Multipliers
                if (anime.score) {
                    score += (anime.score / 10) * 20;
                }

                // Default Explanation
                if (!explanation) {
                    explanation = anime.genres.length > 0
                        ? `A tailored hidden gem within ${anime.genres.slice(0, 2).join('/')}`
                        : `A unique personalized match for your viewing style`;
                }

            } else if (mode === 'personalized' && isGuest) {
                // ==========================================
                // GUEST MODE A: GENRE DISCOVERY FALLBACK
                // ==========================================
                const popularGuestGenres = ['Action', 'Adventure', 'Fantasy', 'Sci-Fi', 'Comedy', 'Shounen'];
                const matchingGenres = anime.genres.filter(g => popularGuestGenres.includes(g));
                score += matchingGenres.length * 30;

                if (anime.score) {
                    score += anime.score * 5;
                }

                if (matchingGenres.length > 0) {
                    explanation = `Discover popular highlights in ${matchingGenres.slice(0, 2).join(' and ')}`;
                } else {
                    explanation = `Highly acclaimed entry point for anime newcomers`;
                }

            } else {
                // ==========================================
                // MODE B: COMMUNITY TRENDING (Social Discovery)
                // ==========================================
                // Rely heavily on MAL Popularity index & spike triggers
                const popularityRank = anime.popularity || 100000;
                if (popularityRank < 200) {
                    score += 60;
                } else if (popularityRank < 1000) {
                    score += 40;
                } else if (popularityRank < 3000) {
                    score += 25;
                }

                if (anime.score) {
                    score += (anime.score / 10) * 30;
                }

                const isTrendingNow = trending.some(t => String(t.id) === String(anime.id));
                if (isTrendingNow) {
                    score += 20;
                }

                // Deterministic social lines based on ID hashing to prevent layout flutter
                const socialSentences = [
                    'Spiking in community watchlists this week',
                    'Highly discussed among active fans in the feed',
                    'Trending among shoujo and fantasy lovers',
                    'Loved by users with tastes matching yours',
                    'Highly rated across AnimOrg global circles'
                ];
                const hash = anime.id.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
                explanation = socialSentences[hash % socialSentences.length];
            }

            return {
                anime,
                score,
                reason: explanation,
                mode
            };
        });

        // Resolve top pick sorted by calculated scores
        const sorted = scored.sort((a, b) => b.score - a.score);
        return sorted[0] || null;
    }
};
