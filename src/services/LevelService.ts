import { getXpForLevel, getLevelTitle } from '../config/levelConfig';
import { RankService } from './RankService';

export interface LevelInfo {
    level: number;
    title: string;
    currentXp: number;
    xpForCurrentLevel: number;
    xpForNextLevel: number;
    progressPercentage: number;
    rankTitle: string;
    rankIcon: string;
    rankDescription: string;
    nextRankTitle: string | null;
    nextRankMinLevel: number | null;
}

export const LevelService = {
    /**
     * Determine the current level and details from total XP
     */
    getLevelInfo: (totalXp: number): LevelInfo => {
        let level = 1;
        // Iterate levels to find where the XP falls
        while (totalXp >= getXpForLevel(level + 1)) {
            level++;
        }

        const xpForCurrentLevel = getXpForLevel(level);
        const xpForNextLevel = getXpForLevel(level + 1);

        // XP gained within the current level
        const xpIntoCurrentLevel = totalXp - xpForCurrentLevel;
        // Total XP required to transition from level to level+1
        const xpDiffNeeded = xpForNextLevel - xpForCurrentLevel;

        const progressPercentage = xpDiffNeeded > 0
            ? Math.min(Math.max((xpIntoCurrentLevel / xpDiffNeeded) * 100, 0), 100)
            : 100;

        const currentRank = RankService.getRankByLevel(level);
        const nextRankObj = RankService.getNextRank(level);

        return {
            level,
            title: getLevelTitle(level),
            currentXp: totalXp,
            xpForCurrentLevel,
            xpForNextLevel,
            progressPercentage,
            rankTitle: currentRank.title,
            rankIcon: currentRank.icon,
            rankDescription: currentRank.description,
            nextRankTitle: nextRankObj ? nextRankObj.title : null,
            nextRankMinLevel: nextRankObj ? nextRankObj.minimumLevel : null,
        };
    }
};
