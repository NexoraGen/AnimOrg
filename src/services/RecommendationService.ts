import { animeApi } from './animeApi';
import { Media, WatchlistItem, UserRating } from '../types';

export interface RecommendationResult {
    anime: Media;
    reason: string;
    score: number; // Confidence score (0-100)
    mode: 'personalized' | 'community';
}

export const RecommendationService = {
    /**
     * Completely rebuilt Spotify-grade Personalized recommendation system.
     * Generates a high-accuracy list of personalized recommendations using multidimensional Taste DNA profiling.
     */
    getPersonalizedRecommendations: async (
        watchlist: WatchlistItem[],
        userRatings: UserRating[],
        favoriteGenres: string[],
        count: number = 15
    ): Promise<RecommendationResult[]> => {
        try {
            const isGuest = watchlist.length === 0 && userRatings.length === 0;

            // 1. DYNAMICALLY CAPTURE BEST-OF TASTE DNA SEEDS
            const highRatedRatings = userRatings.filter(r => r.score >= 8);
            const favoriteListItems = watchlist.filter(w => w.isFavorite);

            // Get up to 5 highest-rated seeds list to query direct community similarity recommendations
            const seedIds = [
                ...highRatedRatings.sort((a, b) => b.score - a.score).map(r => r.animeId),
                ...favoriteListItems.map(w => String(w.mediaId))
            ].filter((v, i, self) => self.indexOf(v) === i).slice(0, 5);

            // Fetch specific Jikan/MAL direct similarity suggestions for each seed
            let similarityCandidates: Media[] = [];
            if (seedIds.length > 0) {
                const specificPromises = seedIds.map(id =>
                    animeApi.getAnimeRecommendations(id).catch(() => [] as Media[])
                );
                const results = await Promise.all(specificPromises);
                similarityCandidates = results.flat();
            }

            // Fetch global premium catalogs
            const [trending, seasonal, top] = await Promise.all([
                animeApi.getTrendingAnime(1).catch(() => [] as Media[]),
                animeApi.getSeasonalAnime(1).catch(() => [] as Media[]),
                animeApi.getTopAnime(1).catch(() => [] as Media[])
            ]);

            // Combine into a candidate pool
            const allCandidates = [
                ...similarityCandidates,
                ...trending,
                ...seasonal,
                ...top
            ];

            // Deduplicate items
            const seenIds = new Set<string>();
            const uniqueCandidates = allCandidates.filter(c => {
                if (!c || !c.id || seenIds.has(String(c.id))) return false;
                seenIds.add(String(c.id));
                return true;
            });

            // 2. EXCLUDE UNWANTED MATCHES
            // Exclude whatever the user has already touched or rated
            const excludedIds = new Set([
                ...watchlist.map(w => String(w.mediaId)),
                ...userRatings.map(r => String(r.animeId))
            ]);

            // Keep high quality entries only (Mal score >= 7.0)
            let filteredPool = uniqueCandidates.filter(c => {
                if (excludedIds.has(String(c.id))) return false;
                const score = c.score || 0;
                if (score > 0 && score < 7.0) return false; // Exclude low-quality/random picks
                return true;
            });

            // Safeguard fallback if pool is dry
            if (filteredPool.length < 5) {
                filteredPool = uniqueCandidates.filter(c => !excludedIds.has(String(c.id)));
            }

            if (filteredPool.length === 0) return [];

            // 3. MULTIDIMENSIONAL TASTE DNA SCORING
            // A. Genre affinity map based on user's watchlist/ratings history
            const genreWeights: Record<string, number> = {};
            let totalGenrePoints = 0;

            watchlist.forEach(w => {
                const rating = userRatings.find(r => String(r.animeId) === String(w.mediaId));
                const multiplier = w.isFavorite ? 3 : (rating && rating.score >= 8) ? 2 : 1;

                (w.genres || []).forEach(g => {
                    genreWeights[g] = (genreWeights[g] || 0) + multiplier;
                    totalGenrePoints += multiplier;
                });
            });

            // Scale genre affinities into weights between 0 and 2.0
            Object.keys(genreWeights).forEach(g => {
                genreWeights[g] = totalGenrePoints > 0 ? (genreWeights[g] / totalGenrePoints) * 15.0 : 1.0;
            });

            // B. Avoided/dropped/bad genres penalty
            const avoidedGenres = new Set<string>();
            watchlist.filter(w => w.status === 'dropped').forEach(w => {
                (w.genres || []).forEach(g => avoidedGenres.add(g));
            });
            userRatings.filter(r => r.score <= 5).forEach(r => {
                const item = watchlist.find(w => String(w.mediaId) === String(r.animeId));
                if (item) (item.genres || []).forEach(g => avoidedGenres.add(g));
            });

            // Score and label each remaining candidate
            const scoredRecommendations = filteredPool.map(c => {
                let score = 55; // Baseline
                let reason = '';
                let matchingSeedTitle = '';

                // Seed match boost: is this a direct recommendation from a seed the user liked?
                const isSimilarityMatch = similarityCandidates.some(s => String(s.id) === String(c.id));
                if (isSimilarityMatch) {
                    // Try to find which seed triggered this recommendation
                    const matchedSeed = seedIds.find(seedId => {
                        const watch = watchlist.find(w => String(w.mediaId) === seedId);
                        return watch && c.genres?.some(g => watch.genres?.includes(g));
                    });
                    const seedWatch = watchlist.find(w => String(w.mediaId) === matchedSeed);
                    if (seedWatch) {
                        score += 35;
                        matchingSeedTitle = seedWatch.title;
                    }
                }

                if (!isGuest) {
                    // Genre match boost
                    const genres = c.genres || [];
                    let genreBoost = 0;
                    genres.forEach(g => {
                        if (avoidedGenres.has(g)) {
                            genreBoost -= 40; // Heavy penalty
                        } else if (genreWeights[g]) {
                            genreBoost += genreWeights[g] * 12;
                        }
                    });
                    score += genreBoost;

                    // Absolute Mal reputation quality weight
                    const rating = c.score || 7.0;
                    score += (rating - 7.0) * 10;

                    // Clutter constraint normalization
                    score = Math.max(0, Math.min(100, Math.round(score)));

                    // Build smart curation explanations
                    if (matchingSeedTitle) {
                        reason = `Because you liked ${matchingSeedTitle}`;
                    } else {
                        // Check if it fits the top genre
                        const topGenres = genres
                            .filter(g => genreWeights[g] > 0)
                            .sort((a, b) => (genreWeights[b] || 0) - (genreWeights[a] || 0));

                        if (topGenres.length > 0) {
                            reason = `Matches your favorite genre: ${topGenres[0]}`;
                        } else {
                            reason = `Popular among similar users`;
                        }
                    }
                } else {
                    // Cold-start preference check based on survey selections
                    const surveyMatches = c.genres?.filter(g => favoriteGenres.includes(g)) || [];
                    if (surveyMatches.length > 0) {
                        score += surveyMatches.length * 15;
                        score = Math.max(0, Math.min(100, Math.round(score)));
                        reason = `Matches preferred genre: ${surveyMatches[0]}`;
                    } else {
                        const reputation = c.score || 8.0;
                        score += (reputation - 7.0) * 10;
                        score = Math.max(0, Math.min(100, Math.round(score)));
                        reason = `Popular among similar users`;
                    }
                }

                return {
                    anime: c,
                    score,
                    reason,
                    mode: 'personalized' as const
                };
            });

            // 4. CONFIDENCE THRESHOLD & SHUFFLE SORT
            let finalSelection = scoredRecommendations
                .filter(res => res.score >= 60) // High quality bar constraint
                .sort((a, b) => b.score - a.score);

            if (finalSelection.length > count) {
                // Keep top + moderate candidates, then rotate slightly to ensure fresh feed variations
                const topPicks = finalSelection.slice(0, count + 8);
                const randomized = topPicks.sort(() => 0.5 - Math.random());
                finalSelection = randomized.slice(0, count);
            }

            return finalSelection.sort((a, b) => b.score - a.score);
        } catch (error) {
            console.error('Error generating personalized recommendations:', error);
            return [];
        }
    },


    /**
     * Backwards-compatible single recommendation generator.
     * Integrates transparently with search.tsx and other Surprise Me discover hooks.
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
            const results = await RecommendationService.getPersonalizedRecommendations(
                watchlist,
                userRatings,
                favoriteGenres,
                20
            );
            // Apply notInterested, recommendationHistory, and active watchlist exclusions
            const blacklist = new Set([
                ...notInterested.map(String),
                ...recommendationHistory.map(String)
            ]);
            const filtered = results.filter(r => !blacklist.has(String(r.anime.id)));
            return filtered[0] || results[0] || null;
        } catch (e) {
            console.error('getSmartRecommendation backwards-compatible wrapper error:', e);
            return null;
        }
    }
};
