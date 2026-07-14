export interface Badge {
    id: string;
    title: string;
    description: string;
    icon: string; // Feather icon name
    category: 'watching' | 'episodes' | 'tracking' | 'watchlist' | 'genres' | 'consistency' | 'collections' | 'ratings' | 'community';
    xpReward: number;
}

export const ACHIEVEMENTS: Badge[] = [
    // --- WATCHING ---
    {
        id: 'first_completed',
        title: 'First Step',
        description: 'Completed your first anime',
        icon: 'check',
        category: 'watching',
        xpReward: 100
    },
    {
        id: 'completed_5',
        title: 'Rising Fan',
        description: 'Completed 5 anime series',
        icon: 'trending-up',
        category: 'watching',
        xpReward: 250
    },
    {
        id: 'completed_25',
        title: 'Seasoned Otaku',
        description: 'Completed 25 anime series',
        icon: 'award',
        category: 'watching',
        xpReward: 500
    },
    {
        id: 'completed_100',
        title: 'Anime Collector',
        description: 'Completed 100 anime series',
        icon: 'archive',
        category: 'watching',
        xpReward: 1000
    },

    // --- EPISODES ---
    {
        id: 'watched_100',
        title: 'Centurion',
        description: 'Watched 100 episodes',
        icon: 'activity',
        category: 'episodes',
        xpReward: 100
    },
    {
        id: 'watched_500',
        title: 'Otaku Scholar',
        description: 'Watched 500 episodes',
        icon: 'book-open',
        category: 'episodes',
        xpReward: 500
    },
    {
        id: 'watched_1000',
        title: 'Anime Deity',
        description: 'Watched 1000 episodes',
        icon: 'zap',
        category: 'episodes',
        xpReward: 1000
    },

    // --- TRACKING ---
    {
        id: 'first_tracked',
        title: 'Watcher Apprentice',
        description: 'Started tracking your first anime status',
        icon: 'play',
        category: 'tracking',
        xpReward: 50
    },
    {
        id: 'tracking_10',
        title: 'Parallel Viewer',
        description: 'Tracking 10 anime series',
        icon: 'layers',
        category: 'tracking',
        xpReward: 250
    },
    {
        id: 'tracking_50',
        title: 'Simulcast Master',
        description: 'Tracking 50 anime series',
        icon: 'tv',
        category: 'tracking',
        xpReward: 500
    },

    // --- WATCHLIST ---
    {
        id: 'first_watchlist',
        title: 'Wishlist Starter',
        description: 'Added your first anime to your watchlist',
        icon: 'bookmark',
        category: 'watchlist',
        xpReward: 50
    },
    {
        id: 'saved_25',
        title: 'Library Builder',
        description: 'Saved 25 anime in watchlist',
        icon: 'folder',
        category: 'watchlist',
        xpReward: 250
    },
    {
        id: 'saved_100',
        title: 'Vault Curator',
        description: 'Saved 100 anime in watchlist',
        icon: 'database',
        category: 'watchlist',
        xpReward: 500
    },

    // --- GENRES ---
    {
        id: 'genre_romance',
        title: 'Romance Explorer',
        description: 'Completed 5 Romance anime series',
        icon: 'heart',
        category: 'genres',
        xpReward: 200
    },
    {
        id: 'genre_mystery',
        title: 'Mystery Detective',
        description: 'Completed 5 Mystery anime series',
        icon: 'search',
        category: 'genres',
        xpReward: 200
    },
    {
        id: 'genre_fantasy',
        title: 'Fantasy Adventurer',
        description: 'Completed 5 Fantasy anime series',
        icon: 'compass',
        category: 'genres',
        xpReward: 200
    },
    {
        id: 'genre_scifi',
        title: 'Sci-Fi Enthusiast',
        description: 'Completed 5 Sci-Fi anime series',
        icon: 'cpu',
        category: 'genres',
        xpReward: 200
    },
    {
        id: 'genre_sliceoflife',
        title: 'Slice of Life Lover',
        description: 'Completed 5 Slice of Life anime series',
        icon: 'coffee',
        category: 'genres',
        xpReward: 200
    },
    {
        id: 'genre_horror',
        title: 'Horror Hunter',
        description: 'Completed 5 Horror anime series',
        icon: 'shield',
        category: 'genres',
        xpReward: 200
    },
    {
        id: 'genre_comedy',
        title: 'Comedy Collector',
        description: 'Completed 5 Comedy anime series',
        icon: 'smile',
        category: 'genres',
        xpReward: 200
    },
    {
        id: 'genre_sports',
        title: 'Sports Supporter',
        description: 'Completed 5 Sports anime series',
        icon: 'wind',
        category: 'genres',
        xpReward: 200
    },

    // --- CONSISTENCY ---
    {
        id: 'streak_7',
        title: 'Weekly Routine',
        description: 'Reached a 7-day watch streak',
        icon: 'calendar',
        category: 'consistency',
        xpReward: 200
    },
    {
        id: 'streak_30',
        title: 'Dedicated Watcher',
        description: 'Reached a 30-day watch streak',
        icon: 'clock',
        category: 'consistency',
        xpReward: 500
    },
    {
        id: 'streak_100',
        title: 'Unstoppable Fan',
        description: 'Reached a 100-day watch streak',
        icon: 'fire',
        category: 'consistency',
        xpReward: 1000
    },

    // --- COLLECTIONS ---
    {
        id: 'first_collection',
        title: 'Curator Genesis',
        description: 'Created your first collection',
        icon: 'plus-circle',
        category: 'collections',
        xpReward: 100
    },
    {
        id: 'organized_100',
        title: 'Grand Coordinator',
        description: 'Organized 100 anime in your collections',
        icon: 'grid',
        category: 'collections',
        xpReward: 500
    },

    // --- RATINGS ---
    {
        id: 'rated_first',
        title: 'Fair Critic',
        description: 'Rated your first anime series',
        icon: 'star',
        category: 'ratings',
        xpReward: 50
    },
    {
        id: 'rated_50',
        title: 'Hardened Reviewer',
        description: 'Rated 50 anime series',
        icon: 'sliders',
        category: 'ratings',
        xpReward: 500
    },

    // --- COMMUNITY ---
    {
        id: 'community_first_review',
        title: 'Fandom Voice',
        description: 'Published your first review',
        icon: 'edit-3',
        category: 'community',
        xpReward: 150
    },
    {
        id: 'community_helpful_reviewer',
        title: 'Helpful Reviewer',
        description: 'Published 3+ reviews or earned a review like',
        icon: 'thumbs-up',
        category: 'community',
        xpReward: 300
    },
    {
        id: 'community_top_reviewer',
        title: 'Top Reviewer',
        description: 'Published 10+ reviews or earned 10+ review likes',
        icon: 'users',
        category: 'community',
        xpReward: 750
    }
];
