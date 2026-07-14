import { ACHIEVEMENTS, Badge } from '../config/achievements';
import { WatchlistItem, AnimeProgress } from '../types';

export interface CollectionLike {
    id: string;
    animeIds: string[];
}

export interface RatingLike {
    animeId: string;
}

export interface AchievementContext {
    longestStreak?: number;
    userRatings?: RatingLike[];
    collections?: CollectionLike[];
    totalReviews?: number;
    reviewLikes?: number;
}

export interface AchievementProgress {
    badgeId: string;
    current: number;
    target: number;
    percentage: number;
    unlocked: boolean;
}

export const AchievementService = {
    /**
     * Determine badges to award based on current watch/interact state
     */
    evaluateBadges: (
        currentBadges: string[],
        watchlist: WatchlistItem[],
        animeProgress: Record<string, AnimeProgress>,
        context?: AchievementContext
    ): string[] => {
        const earned = new Set<string>(currentBadges || []);

        const completedList = (watchlist || []).filter(w => w.status === 'completed');
        const trackingList = (watchlist || []).filter(w => w.status === 'watching');
        const watchlistCount = (watchlist || []).length;

        // 1. WATCHING
        if (completedList.length >= 1) earned.add('first_completed');
        if (completedList.length >= 5) earned.add('completed_5');
        if (completedList.length >= 25) earned.add('completed_25');
        if (completedList.length >= 100) earned.add('completed_100');

        // Ep watch count calculations
        let totalEpisodesWatched = 0;
        try {
            totalEpisodesWatched = Object.values(animeProgress || {}).reduce((acc, p) => {
                const epCount = Object.values(p.watchedEpisodes || {}).filter(Boolean).length;
                return acc + Math.max(p.lastWatchedEpisode || 0, epCount);
            }, 0);
        } catch {
            totalEpisodesWatched = 0;
        }

        // 2. EPISODES
        if (totalEpisodesWatched >= 100) earned.add('watched_100');
        if (totalEpisodesWatched >= 500) earned.add('watched_500');
        if (totalEpisodesWatched >= 1000) earned.add('watched_1000');

        // 3. TRACKING
        if (trackingList.length >= 1) earned.add('first_tracked');
        if (trackingList.length >= 10) earned.add('tracking_10');
        if (trackingList.length >= 50) earned.add('tracking_50');

        // 4. WATCHLIST
        if (watchlistCount >= 1) earned.add('first_watchlist');
        if (watchlistCount >= 25) earned.add('saved_25');
        if (watchlistCount >= 100) earned.add('saved_100');

        // Helper to check genre completed count
        const getGenreCount = (genreName: string): number => {
            return completedList.filter(item =>
                item.genres?.some(g => g.toLowerCase() === genreName.toLowerCase())
            ).length;
        };

        // 5. GENRES
        if (getGenreCount('romance') >= 5) earned.add('genre_romance');
        if (getGenreCount('mystery') >= 5) earned.add('genre_mystery');
        if (getGenreCount('fantasy') >= 5) earned.add('genre_fantasy');
        if (getGenreCount('sci-fi') >= 5) earned.add('genre_scifi');
        if (getGenreCount('slice of life') >= 5) earned.add('genre_sliceoflife');
        if (getGenreCount('horror') >= 5) earned.add('genre_horror');
        if (getGenreCount('comedy') >= 5) earned.add('genre_comedy');
        if (getGenreCount('sports') >= 5) earned.add('genre_sports');

        // 6. CONSISTENCY (Streaks)
        const streakVal = context?.longestStreak || 0;
        if (streakVal >= 7) earned.add('streak_7');
        if (streakVal >= 30) earned.add('streak_30');
        if (streakVal >= 100) earned.add('streak_100');

        // 7. COLLECTIONS
        const collectionsCount = context?.collections?.length || 0;
        const totalOrganized = context?.collections?.reduce((acc, col) => acc + (col.animeIds?.length || 0), 0) || 0;
        if (collectionsCount >= 1) earned.add('first_collection');
        if (totalOrganized >= 100) earned.add('organized_100');

        // 8. RATINGS
        const ratingsCount = context?.userRatings?.length || 0;
        if (ratingsCount >= 1) earned.add('rated_first');
        if (ratingsCount >= 50) earned.add('rated_50');

        // 9. COMMUNITY
        const reviewsCount = context?.totalReviews || 0;
        const totalLikes = context?.reviewLikes || 0;
        if (reviewsCount >= 1) earned.add('community_first_review');
        if (reviewsCount >= 3 || totalLikes >= 1) earned.add('community_helpful_reviewer');
        if (reviewsCount >= 10 || totalLikes >= 10) earned.add('community_top_reviewer');

        return Array.from(earned);
    },

    /**
     * Compute current progress statistics for a given badge ID
     */
    getBadgeProgress: (
        badgeId: string,
        watchlist: WatchlistItem[],
        animeProgress: Record<string, AnimeProgress>,
        context?: AchievementContext,
        unlockedBadges: string[] = []
    ): AchievementProgress => {
        const isUnlocked = unlockedBadges.includes(badgeId);

        const completedList = (watchlist || []).filter(w => w.status === 'completed');
        const trackingList = (watchlist || []).filter(w => w.status === 'watching');
        const watchlistCount = (watchlist || []).length;

        let totalEpisodesWatched = 0;
        try {
            totalEpisodesWatched = Object.values(animeProgress || {}).reduce((acc, p) => {
                const epCount = Object.values(p.watchedEpisodes || {}).filter(Boolean).length;
                return acc + Math.max(p.lastWatchedEpisode || 0, epCount);
            }, 0);
        } catch {
            totalEpisodesWatched = 0;
        }

        const getGenreCount = (genreName: string): number => {
            return completedList.filter(item =>
                item.genres?.some(g => g.toLowerCase() === genreName.toLowerCase())
            ).length;
        };

        const collectionsCount = context?.collections?.length || 0;
        const totalOrganized = context?.collections?.reduce((acc, col) => acc + (col.animeIds?.length || 0), 0) || 0;
        const ratingsCount = context?.userRatings?.length || 0;
        const reviewsCount = context?.totalReviews || 0;
        const totalLikes = context?.reviewLikes || 0;
        const streakVal = context?.longestStreak || 0;

        let current = 0;
        let target = 1;

        switch (badgeId) {
            // Watching
            case 'first_completed':
                current = completedList.length;
                target = 1;
                break;
            case 'completed_5':
                current = completedList.length;
                target = 5;
                break;
            case 'completed_25':
                current = completedList.length;
                target = 25;
                break;
            case 'completed_100':
                current = completedList.length;
                target = 100;
                break;

            // Episodes
            case 'watched_100':
                current = totalEpisodesWatched;
                target = 100;
                break;
            case 'watched_500':
                current = totalEpisodesWatched;
                target = 500;
                break;
            case 'watched_1000':
                current = totalEpisodesWatched;
                target = 1000;
                break;

            // Tracking
            case 'first_tracked':
                current = trackingList.length;
                target = 1;
                break;
            case 'tracking_10':
                current = trackingList.length;
                target = 10;
                break;
            case 'tracking_50':
                current = trackingList.length;
                target = 50;
                break;

            // Watchlist
            case 'first_watchlist':
                current = watchlistCount;
                target = 1;
                break;
            case 'saved_25':
                current = watchlistCount;
                target = 25;
                break;
            case 'saved_100':
                current = watchlistCount;
                target = 100;
                break;

            // Genres
            case 'genre_romance':
                current = getGenreCount('romance');
                target = 5;
                break;
            case 'genre_mystery':
                current = getGenreCount('mystery');
                target = 5;
                break;
            case 'genre_fantasy':
                current = getGenreCount('fantasy');
                target = 5;
                break;
            case 'genre_scifi':
                current = getGenreCount('sci-fi');
                target = 5;
                break;
            case 'genre_sliceoflife':
                current = getGenreCount('slice of life');
                target = 5;
                break;
            case 'genre_horror':
                current = getGenreCount('horror');
                target = 5;
                break;
            case 'genre_comedy':
                current = getGenreCount('comedy');
                target = 5;
                break;
            case 'genre_sports':
                current = getGenreCount('sports');
                target = 5;
                break;

            // Consistency
            case 'streak_7':
                current = streakVal;
                target = 7;
                break;
            case 'streak_30':
                current = streakVal;
                target = 30;
                break;
            case 'streak_100':
                current = streakVal;
                target = 100;
                break;

            // Collections
            case 'first_collection':
                current = collectionsCount;
                target = 1;
                break;
            case 'organized_100':
                current = totalOrganized;
                target = 100;
                break;

            // Ratings
            case 'rated_first':
                current = ratingsCount;
                target = 1;
                break;
            case 'rated_50':
                current = ratingsCount;
                target = 50;
                break;

            // Community
            case 'community_first_review':
                current = reviewsCount;
                target = 1;
                break;
            case 'community_helpful_reviewer':
                current = reviewsCount >= 3 ? 3 : (totalLikes >= 1 ? 3 : Math.max(reviewsCount, totalLikes));
                target = 3;
                break;
            case 'community_top_reviewer':
                current = reviewsCount >= 10 ? 10 : (totalLikes >= 10 ? 10 : Math.max(reviewsCount, totalLikes));
                target = 10;
                break;

            default:
                current = 0;
                target = 1;
        }

        // Bound current between 0 and target, unless unlocked, in which case it is capped at target
        if (current < 0) current = 0;
        if (isUnlocked) {
            current = target;
        } else if (current > target) {
            current = target;
        }

        const percentage = target > 0 ? Math.round((current / target) * 100) : 0;

        return {
            badgeId,
            current,
            target,
            percentage,
            unlocked: isUnlocked
        };
    }
};
