import { ACHIEVEMENTS, Badge } from '../config/achievements';
import { WatchlistItem, AnimeProgress } from '../types';

export const AchievementService = {
    /**
     * Determine badges to award based on current watch state
     */
    evaluateBadges: (
        currentBadges: string[],
        watchlist: WatchlistItem[],
        animeProgress: Record<string, AnimeProgress>,
        context?: {
            watchHour?: number;
            watchDay?: number;
        }
    ): string[] => {
        const earned = new Set<string>(currentBadges || []);
        const completedList = (watchlist || []).filter(w => w.status === 'completed');

        // 1. first_completed
        if (completedList.length >= 1) {
            earned.add('first_completed');
        }

        // Calculate total episodes watched
        const totalEpisodesWatched = Object.values(animeProgress || {}).reduce((acc, p) => acc + (p.lastWatchedEpisode || 0), 0);

        // 2. watched_100
        if (totalEpisodesWatched >= 100) {
            earned.add('watched_100');
        }
        // 3. watched_500
        if (totalEpisodesWatched >= 500) {
            earned.add('watched_500');
        }
        // 4. watched_1000
        if (totalEpisodesWatched >= 1000) {
            earned.add('watched_1000');
        }

        // 5. Romance Fan (Completed 5 romance anime)
        const romanceCompleted = completedList.filter(item =>
            item.genres?.some(g => g.toLowerCase() === 'romance')
        ).length;
        if (romanceCompleted >= 5) {
            earned.add('romance_fan');
        }

        // 6. Shonen Fan (Completed 5 shonen anime)
        const shonenCompleted = completedList.filter(item =>
            item.genres?.some(g => g.toLowerCase() === 'shonen')
        ).length;
        if (shonenCompleted >= 5) {
            earned.add('shonen_fan');
        }

        // 7. Movie Collector (Completed 5 Anime Movies)
        const moviesCompleted = completedList.filter(item =>
            item.format?.toLowerCase() === 'movie' ||
            item.genres?.some(g => g.toLowerCase() === 'movie')
        ).length;
        if (moviesCompleted >= 5) {
            earned.add('movie_collector');
        }

        // 8. Night Owl
        if (context?.watchHour !== undefined && (context.watchHour >= 0 && context.watchHour < 5)) {
            earned.add('night_owl');
        }

        // 9. Weekend Warrior
        if (context?.watchDay !== undefined && (context.watchDay === 0 || context.watchDay === 6)) {
            if (totalEpisodesWatched >= 5) {
                earned.add('weekend_binger');
            }
        }

        // 10. Season Explorer (Tracked anime from 3 distinct seasons/years)
        const distinctSeasons = new Set<string>();
        (watchlist || []).forEach(item => {
            if (item.broadcast?.day) {
                distinctSeasons.add(item.broadcast.day);
            }
            if (item.airing_start) {
                const year = item.airing_start.split('-')[0];
                if (year) distinctSeasons.add(year);
            }
        });
        if (distinctSeasons.size >= 3) {
            earned.add('season_explorer');
        }

        return Array.from(earned);
    }
};
