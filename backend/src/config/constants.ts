/**
 * Centralized constants for the AnimOrg Backend Proxy.
 * Prevents magic strings and controls cache configurations centrally.
 */

// Centralized cache Time-To-Live (TTL) values in seconds
export const CACHE_TTL = {
    ANIME_DETAILS: 86400, // 24 hours (for Anime detail pages, relations, specs)
    TOP_ANIME: 43200,      // 12 hours (refreshed twice a day)
    RECOMMENDATIONS: 43200,// 12 hours
    CHARACTERS: 43200,     // 12 hours
    EPISODES: 43200,       // 12 hours
    SEASONAL: 86400,       // 24 hours (current season, upcoming season)
    AIRING_SCHEDULE: 3600, // 1 hour (frequently air status changes)
    SEARCH_QUERY: 900,     // 15 minutes (ephemeral search terms)
    GENRES_LIST: 86400,    // 24 hours (rarely changes)
    HOME_PAGE: 600,        // 10 minutes (responsive trending dashboard)
};

// Cache key prefixes
export const CACHE_KEYS = {
    ANIME: "anime",
    SEARCH: "search",
    TOP: "top_anime",
    UPCOMING: "upcoming_anime",
    SEASON: "season_now",
    SCHEDULE: "schedule",
    EPISODES: "episodes",
    CHARACTERS: "characters",
    RECOMMENDATIONS: "recommendations",
    RELATIONS: "relations",
    GENRES: "genres_list",
    CHAR_SEARCH: "char_search",
    HOME: "home_dashboard",
};

// Jikan API endpoints base configuration
export const JIKAN_API = {
    BASE_URL: "https://animorg-proxy.itisnexora.workers.dev/v4",
    ENDPOINTS: {
        ANIME_DETAILS: (id: string) => `/anime/${id}/full`,
        ANIME_CHARACTERS: (id: string) => `/anime/${id}/characters`,
        ANIME_RECOMMENDATIONS: (id: string) => `/anime/${id}/recommendations`,
        ANIME_RELATIONS: (id: string) => `/anime/${id}/relations`,
        ANIME_EPISODES: (id: string) => `/anime/${id}/episodes`,
        TOP_ANIME: "/top/anime",
        SEASON_NOW: "/seasons/now",
        SEASON_UPCOMING: "/seasons/upcoming",
        AIRING_SCHEDULE: "/schedules",
        GENRES: "/genres/anime",
        ANIME_SEARCH: "/anime",
        CHARACTER_SEARCH: "/characters",
    }
};
