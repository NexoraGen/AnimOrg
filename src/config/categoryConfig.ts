import { animeApi } from '../services/animeApi';
import { Media } from '../types';

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
        fetchFn: async () => [], // Handled client-side via RecommendationService
        emptyMessage: "We're still learning your preferences. Add anime to your watchlist!",
        emptyIcon: 'heart',
        analyticsName: 'made_for_you',
        supportsPagination: false,
        supportsFilters: false,
    },
    'continue-watching': {
        title: 'Continue Watching',
        icon: 'play-circle',
        fetchFn: async () => [], // Handled client-side via local store
        emptyMessage: "You haven't started tracking any anime yet.",
        emptyIcon: 'play-circle',
        analyticsName: 'continue_watching',
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

/**
 * Resolve category config, returning a sensible fallback for unknown types.
 */
export const getCategoryConfig = (type: string): CategoryConfig => {
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
