import { RANKS, RankDefinition } from '../config/ranks';
import { getXpForLevel } from '../config/levelConfig';

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
    }
};
export type RankUtils = typeof RankService;
