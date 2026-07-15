import { animeApi } from '../services/animeApi';
import { Media } from '../types';
import { useAppStore } from '../store/useAppStore';
import { RecommendationService } from '../services/RecommendationService';

export interface CategoryConfig {
    title: string;
    icon: string;
    fetchFn: (page: number) => Promise<Media[]>;
    emptyMessage: string;
    emptyIcon: string;
    analyticsName: string;
    supportsPagination: boolean;
    supportsFilters: boolean;
}

/**
 * Centralized category configuration.
 * To add a new category, simply add an entry here — no new screens required.
 */
export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
    trending: {
        title: 'Trending Now',
        icon: 'trending-up',
        fetchFn: (page) => animeApi.getTrendingAnime(page),
        emptyMessage: 'No trending anime available right now.',
        emptyIcon: 'trending-up',
        analyticsName: 'trending',
        supportsPagination: true,
        supportsFilters: false,
    },
    top: {
        title: 'Top Rated',
        icon: 'award',
        fetchFn: (page) => animeApi.getTopAnime(page),
        emptyMessage: 'No top-rated anime found.',
        emptyIcon: 'award',
        analyticsName: 'top_rated',
        supportsPagination: true,
        supportsFilters: false,
    },
    'current-season': {
        title: 'Airing This Season',
        icon: 'activity',
        fetchFn: (page) => animeApi.getSeasonalAnime(page),
        emptyMessage: 'No seasonal anime available.',
        emptyIcon: 'tv',
        analyticsName: 'current_season',
        supportsPagination: true,
        supportsFilters: false,
    },
    upcoming: {
        title: 'Upcoming Anime',
        icon: 'calendar',
        fetchFn: (page) => animeApi.getUpcomingAnime(page),
        emptyMessage: 'No upcoming anime found.',
        emptyIcon: 'calendar',
        analyticsName: 'upcoming',
        supportsPagination: true,
        supportsFilters: false,
    },
    popular: {
        title: 'Popular',
        icon: 'star',
        fetchFn: (page) => animeApi.getTopAnime(page),
        emptyMessage: 'No popular anime found.',
        emptyIcon: 'star',
        analyticsName: 'popular',
        supportsPagination: true,
        supportsFilters: false,
    },
    'made-for-you': {
        title: 'Made For You',
        icon: 'heart',
        fetchFn: async () => {
            const { watchlist, userRatings, getFavoriteGenres } = useAppStore.getState();
            const recs = await RecommendationService.getPersonalizedRecommendations(
                watchlist,
                userRatings,
                getFavoriteGenres(),
                30
            );
            return recs.map(r => r.anime);
        },
        emptyMessage: "We're still learning your preferences. Add anime to your watchlist!",
        emptyIcon: 'heart',
        analyticsName: 'made_for_you',
        supportsPagination: false,
        supportsFilters: false,
    },
    'continue-watching': {
        title: 'Continue Watching',
        icon: 'play-circle',
        fetchFn: async () => {
            const { watchlist, animeProgress } = useAppStore.getState();
            const watching = watchlist.filter(item => {
                const progress = animeProgress[String(item.mediaId)] || { lastWatchedEpisode: 0 };
                const totalEpisodes = item.episodes || 0;
                // Currently watching if marked as watching and not fully completed
                return item.status === 'watching' && (totalEpisodes === 0 || progress.lastWatchedEpisode < totalEpisodes);
            });
            return watching.map(item => ({
                id: item.mediaId,
                title: item.title || 'Unknown',
                posterPath: item.posterPath || '',
                rating: item.rating,
                genres: item.genres || [],
                description: '',
                backdropPath: '',
                releaseYear: 0,
                type: 'anime',
            }));
        },
        emptyMessage: "You don't have any ongoing anime in your watchlist.",
        emptyIcon: 'play-circle',
        analyticsName: 'continue_watching',
        supportsPagination: false,
        supportsFilters: false,
    },
    'plan-to-watch': {
        title: 'Plan to Watch',
        icon: 'clock',
        fetchFn: async () => {
            const { watchlist } = useAppStore.getState();
            const planToWatch = watchlist.filter(item => item.status === 'plan-to-watch');
            return planToWatch.map(item => ({
                id: item.mediaId,
                title: item.title || 'Unknown',
                posterPath: item.posterPath || '',
                rating: item.rating,
                genres: item.genres || [],
                description: '',
                backdropPath: '',
                releaseYear: 0,
                type: 'anime',
            }));
        },
        emptyMessage: "You don't have any anime planned to watch.",
        emptyIcon: 'clock',
        analyticsName: 'plan_to_watch',
        supportsPagination: false,
        supportsFilters: false,
    },
    'completed': {
        title: 'Completed Anime',
        icon: 'check-circle',
        fetchFn: async () => {
            const { watchlist } = useAppStore.getState();
            const completed = watchlist.filter(item => item.status === 'completed');
            return completed.map(item => ({
                id: item.mediaId,
                title: item.title || 'Unknown',
                posterPath: item.posterPath || '',
                rating: item.rating,
                genres: item.genres || [],
                description: '',
                backdropPath: '',
                releaseYear: 0,
                type: 'anime',
            }));
        },
        emptyMessage: "You haven't completed any anime yet.",
        emptyIcon: 'check-circle',
        analyticsName: 'completed',
        supportsPagination: false,
        supportsFilters: false,
    },
    'dropped': {
        title: 'Dropped Anime',
        icon: 'x-circle',
        fetchFn: async () => {
            const { watchlist } = useAppStore.getState();
            const dropped = watchlist.filter(item => item.status === 'dropped');
            return dropped.map(item => ({
                id: item.mediaId,
                title: item.title || 'Unknown',
                posterPath: item.posterPath || '',
                rating: item.rating,
                genres: item.genres || [],
                description: '',
                backdropPath: '',
                releaseYear: 0,
                type: 'anime',
            }));
        },
        emptyMessage: "No dropped anime.",
        emptyIcon: 'x-circle',
        analyticsName: 'dropped',
        supportsPagination: false,
        supportsFilters: false,
    },
    ratings: {
        title: 'My Ratings',
        icon: 'star',
        fetchFn: async () => {
            const { userRatings } = useAppStore.getState();
            return (userRatings || []).map(r => ({
                id: r.animeId,
                title: r.title,
                posterPath: r.posterPath,
                rating: r.score,
                type: 'anime',
                genres: [],
                description: '',
                backdropPath: '',
                releaseYear: 0
            }));
        },
        emptyMessage: "You haven't rated any anime yet.",
        emptyIcon: 'star',
        analyticsName: 'ratings',
        supportsPagination: false,
        supportsFilters: false,
    },
    favorites: {
        title: 'Favorite Anime',
        icon: 'heart',
        fetchFn: async () => {
            const { watchlist } = useAppStore.getState();
            const favorites = watchlist.filter(item => item.isFavorite);
            return favorites.map(item => ({
                id: item.mediaId,
                title: item.title || 'Unknown',
                posterPath: item.posterPath || '',
                rating: item.rating,
                genres: item.genres || [],
                description: '',
                backdropPath: '',
                releaseYear: 0,
                type: 'anime',
            }));
        },
        emptyMessage: "You don't have any favorite anime yet.",
        emptyIcon: 'heart',
        analyticsName: 'favorites',
        supportsPagination: false,
        supportsFilters: false,
    },
    recommendations: {
        title: 'Recommendations',
        icon: 'compass',
        fetchFn: async () => [],
        emptyMessage: "We're still learning your preferences.",
        emptyIcon: 'compass',
        analyticsName: 'recommendations',
        supportsPagination: false,
        supportsFilters: false,
    },
    schedule: {
        title: 'Airing Schedule',
        icon: 'clock',
        fetchFn: (page) => animeApi.getAiringSchedule(undefined),
        emptyMessage: 'No airing schedule available.',
        emptyIcon: 'clock',
        analyticsName: 'schedule',
        supportsPagination: false,
        supportsFilters: false,
    },
    // Genre-based categories
    action: {
        title: 'Action Anime',
        icon: 'zap',
        fetchFn: (page) => animeApi.getAnimeByGenre(1, page),
        emptyMessage: 'No action anime found.',
        emptyIcon: 'zap',
        analyticsName: 'genre_action',
        supportsPagination: true,
        supportsFilters: false,
    },
    romance: {
        title: 'Romance Anime',
        icon: 'heart',
        fetchFn: (page) => animeApi.getAnimeByGenre(22, page),
        emptyMessage: 'No romance anime found.',
        emptyIcon: 'heart',
        analyticsName: 'genre_romance',
        supportsPagination: true,
        supportsFilters: false,
    },
    fantasy: {
        title: 'Fantasy Anime',
        icon: 'feather',
        fetchFn: (page) => animeApi.getAnimeByGenre(10, page),
        emptyMessage: 'No fantasy anime found.',
        emptyIcon: 'feather',
        analyticsName: 'genre_fantasy',
        supportsPagination: true,
        supportsFilters: false,
    },
    comedy: {
        title: 'Comedy Anime',
        icon: 'smile',
        fetchFn: (page) => animeApi.getAnimeByGenre(4, page),
        emptyMessage: 'No comedy anime found.',
        emptyIcon: 'smile',
        analyticsName: 'genre_comedy',
        supportsPagination: true,
        supportsFilters: false,
    },
};

const CURATED_LISTS = [
    'All-Time Legends',
    'Modern Masterpieces',
    'Must Watch Shonen',
    'Dark Masterpieces',
    'Psychological Peaks',
    'Best Storytelling',
    'Highest Rated Anime',
    'Fan Favorites',
    'Beginner Essentials',
    'Anime Hall of Fame'
];

const getCuratedListNameBySlug = (slug: string) => {
    const slugified = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return CURATED_LISTS.find(name => slugified(name) === slug);
};

/**
 * Resolve category config, returning a sensible fallback for unknown types.
 */
export const getCategoryConfig = (type: string): CategoryConfig => {
    // Check if the type is a slug of a curated list
    const curatedListName = getCuratedListNameBySlug(type);
    if (curatedListName) {
        return {
            title: curatedListName,
            icon: 'award',
            fetchFn: async (page) => {
                return animeApi.getCuratedList(curatedListName);
            },
            emptyMessage: 'No anime found in this curated list.',
            emptyIcon: 'award',
            analyticsName: `curated_${type.replace(/-/g, '_')}`,
            supportsPagination: false,
            supportsFilters: false,
        };
    }

    return CATEGORY_CONFIG[type] || {
        title: type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        icon: 'list',
        fetchFn: async () => [],
        emptyMessage: 'No anime found for this category.',
        emptyIcon: 'inbox',
        analyticsName: type,
        supportsPagination: false,
        supportsFilters: false,
    };
};
