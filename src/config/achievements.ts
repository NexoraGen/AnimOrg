export interface Badge {
    id: string;
    title: string;
    description: string;
    icon: string; // Feather icon name
    category: 'milestone' | 'genre' | 'behavior';
}

export const ACHIEVEMENTS: Badge[] = [
    {
        id: 'first_completed',
        title: 'First Step',
        description: 'Completed your first anime',
        icon: 'award',
        category: 'milestone',
    },
    {
        id: 'watched_100',
        title: 'Centurion',
        description: 'Watched 100 episodes',
        icon: 'activity',
        category: 'milestone',
    },
    {
        id: 'watched_500',
        title: 'Otaku Scholar',
        description: 'Watched 500 episodes',
        icon: 'book-open',
        category: 'milestone',
    },
    {
        id: 'watched_1000',
        title: 'Anime Deity',
        description: 'Watched 1000 episodes',
        icon: 'zap',
        category: 'milestone',
    },
    {
        id: 'romance_fan',
        title: 'Hopeless Romantic',
        description: 'Completed 5 Romance anime',
        icon: 'heart',
        category: 'genre',
    },
    {
        id: 'shonen_fan',
        title: 'Shonen Spirit',
        description: 'Completed 5 Shonen anime',
        icon: 'trending-up',
        category: 'genre',
    },
    {
        id: 'movie_collector',
        title: 'Cinephile',
        description: 'Completed 5 Anime Movies',
        icon: 'video',
        category: 'genre',
    },
    {
        id: 'night_owl',
        title: 'Night Owl',
        description: 'Watched an episode between 12 AM and 5 AM',
        icon: 'moon',
        category: 'behavior',
    },
    {
        id: 'weekend_binger',
        title: 'Weekend Warrior',
        description: 'Watched 5+ episodes on Saturday or Sunday',
        icon: 'coffee',
        category: 'behavior',
    },
    {
        id: 'season_explorer',
        title: 'Season Explorer',
        description: 'Tracked anime from 3 distinct seasons',
        icon: 'compass',
        category: 'behavior',
    },
];
