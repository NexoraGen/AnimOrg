import { RANKS, RankDefinition } from '../config/ranks';
import { getXpForLevel } from '../config/levelConfig';

export interface RankProgressItem extends RankDefinition {
    xpRequired: number;
    status: 'unlocked' | 'current' | 'locked';
    progressPercentage: number;
    xpNeededToUnlock: number;
}

export const RankService = {
    /**
     * Returns current rank configuration based on player level
     */
    getRankByLevel: (level: number): RankDefinition => {
        const rank = RANKS.find(r => level >= r.minimumLevel && level <= r.maximumLevel);
        return rank || RANKS[0];
    },

    /**
     * Returns next rank configuration if available
     */
    getNextRank: (level: number): RankDefinition | null => {
        const currentRank = RankService.getRankByLevel(level);
        const currentIndex = RANKS.findIndex(r => r.title === currentRank.title);
        if (currentIndex !== -1 && currentIndex < RANKS.length - 1) {
            return RANKS[currentIndex + 1];
        }
        return null;
    },

    /**
     * Calculates progress and XP requirements to reach the next rank tier
     */
    getProgressToNextRank: (level: number, currentXp: number) => {
        const nextRank = RankService.getNextRank(level);
        if (!nextRank) return null;

        const levelsToGo = nextRank.minimumLevel - level;
        const totalXpRequired = getXpForLevel(nextRank.minimumLevel);
        const xpRemaining = Math.max(0, totalXpRequired - currentXp);

        return {
            nextRankName: nextRank.title,
            nextRankIcon: nextRank.icon,
            reqLevel: nextRank.minimumLevel,
            levelsToGo,
            xpRemaining,
        };
    },

    /**
     * Returns all ranks enriched with user progression state (unlocked, current, locked)
     */
    getAllRanksWithProgress: (level: number, currentXp: number): RankProgressItem[] => {
        const currentRank = RankService.getRankByLevel(level);

        return RANKS.map(rank => {
            const xpRequired = getXpForLevel(rank.minimumLevel);
            let status: 'unlocked' | 'current' | 'locked' = 'locked';

            if (level > rank.maximumLevel) {
                status = 'unlocked';
            } else if (level >= rank.minimumLevel && level <= rank.maximumLevel) {
                status = 'current';
            } else {
                status = 'locked';
            }

            let progressPercentage = 0;
            if (status === 'unlocked') {
                progressPercentage = 100;
            } else if (status === 'current') {
                const startXp = getXpForLevel(rank.minimumLevel);
                const nextRankXp = rank.maximumLevel < 9999 ? getXpForLevel(rank.maximumLevel + 1) : startXp + 5000;
                const span = Math.max(1, nextRankXp - startXp);
                progressPercentage = Math.min(100, Math.max(0, ((currentXp - startXp) / span) * 100));
            } else {
                progressPercentage = 0;
            }

            const xpNeededToUnlock = Math.max(0, xpRequired - currentXp);

            return {
                ...rank,
                xpRequired,
                status,
                progressPercentage,
                xpNeededToUnlock,
            };
        });
    }
};

export type RankUtils = typeof RankService;
