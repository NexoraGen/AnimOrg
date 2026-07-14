export interface RankDefinition {
    minimumLevel: number;
    maximumLevel: number;
    title: string;
    icon: string; // Emoji representing the rank
    description: string;
}

export const RANKS: RankDefinition[] = [
    {
        minimumLevel: 1,
        maximumLevel: 4,
        title: 'Newcomer',
        icon: '🌱',
        description: 'Welcome to AnimOrg! You are starting to catalog and discover your anime collection.'
    },
    {
        minimumLevel: 5,
        maximumLevel: 9,
        title: 'Anime Explorer',
        icon: '✨',
        description: 'You are discovering new worlds and building your anime journey.'
    },
    {
        minimumLevel: 10,
        maximumLevel: 14,
        title: 'Story Seeker',
        icon: '🎬',
        description: 'Diving deeper into complex narratives and tracking your seasonal favorites.'
    },
    {
        minimumLevel: 15,
        maximumLevel: 19,
        title: 'Manga Scholar',
        icon: '📖',
        description: 'Analyzing plot arcs, character development, and source adaptations.'
    },
    {
        minimumLevel: 20,
        maximumLevel: 24,
        title: 'Genre Connoisseur',
        icon: '🎭',
        description: 'Having broad knowledge across romance, action, slice-of-life and sci-fi genres.'
    },
    {
        minimumLevel: 25,
        maximumLevel: 29,
        title: 'Elite Otaku',
        icon: '⚔️',
        description: 'A dedicated follower of Japanese animation, completing shows at an impressive pace.'
    },
    {
        minimumLevel: 30,
        maximumLevel: 39,
        title: 'Anime Veteran',
        icon: '🔥',
        description: 'Your dedication to anime continues to grow, and you have seen legendary masterpieces.'
    },
    {
        minimumLevel: 40,
        maximumLevel: 49,
        title: 'Mythic Collector',
        icon: '💎',
        description: 'Curating custom watchlists and rating anime like a seasoned industry critic.'
    },
    {
        minimumLevel: 50,
        maximumLevel: 64,
        title: 'Grand Archivist',
        icon: '👑',
        description: 'Holding memory of hundreds of episodes and detailed database knowledge.'
    },
    {
        minimumLevel: 65,
        maximumLevel: 79,
        title: 'Celestial Curator',
        icon: '🌌',
        description: 'Floating above ordinary realms of fandom, organizing lists with ultimate precision.'
    },
    {
        minimumLevel: 80,
        maximumLevel: 99,
        title: 'Anime Virtuoso',
        icon: '🏆',
        description: 'Flawless commitment to anime cataloging, tracking every watch milestone.'
    },
    {
        minimumLevel: 100,
        maximumLevel: 9999,
        title: 'AnimOrg Legend',
        icon: '🚀',
        description: 'The absolute pinnacle. Your title is etched forever in the history of anime trackers.'
    }
];

export const getRankForLevel = (level: number): RankDefinition => {
    const rank = RANKS.find(r => level >= r.minimumLevel && level <= r.maximumLevel);
    return rank || RANKS[0];
};

export const getNextRank = (level: number): RankDefinition | null => {
    const currentRank = getRankForLevel(level);
    const currentIndex = RANKS.findIndex(r => r.title === currentRank.title);
    if (currentIndex !== -1 && currentIndex < RANKS.length - 1) {
        return RANKS[currentIndex + 1];
    }
    return null;
};
