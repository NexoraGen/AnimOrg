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
        title: 'AnimOrg Rookie',
        icon: '🌱',
        description: 'Welcome to AnimOrg! Starting your premier tracking journey.'
    },
    {
        minimumLevel: 5,
        maximumLevel: 9,
        title: 'AnimOrg Explorer',
        icon: '✨',
        description: 'Diving into anime catalogs and setting up your first watchlist.'
    },
    {
        minimumLevel: 10,
        maximumLevel: 14,
        title: 'AnimOrg Scout',
        icon: '🎬',
        description: 'Deeper tracking of seasonal titles, episodes, and reviews.'
    },
    {
        minimumLevel: 15,
        maximumLevel: 24,
        title: 'AnimOrg Enthusiast',
        icon: '📖',
        description: 'Expressing passion through reviews, ratings, and genre tags.'
    },
    {
        minimumLevel: 25,
        maximumLevel: 39,
        title: 'AnimOrg Veteran',
        icon: '⚔️',
        description: 'A solid track record of watching classics and creating collections.'
    },
    {
        minimumLevel: 40,
        maximumLevel: 59,
        title: 'AnimOrg Elite',
        icon: '👑',
        description: 'Commanding extensive database lists, rating insights, and scores.'
    },
    {
        minimumLevel: 60,
        maximumLevel: 79,
        title: 'AnimOrg Master',
        icon: '🌌',
        description: 'Deep dedication with hundreds of watched episodes cataloged.'
    },
    {
        minimumLevel: 80,
        maximumLevel: 99,
        title: 'AnimOrg Legend',
        icon: '🏆',
        description: 'A mythic presence in the community, logging milestones effortlessly.'
    },
    {
        minimumLevel: 100,
        maximumLevel: 9999,
        title: 'AnimOrg Grandmaster',
        icon: '🚀',
        description: 'The absolute zenith of tracking. A legendary archivist.'
    }
];
