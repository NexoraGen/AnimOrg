import { RankService } from '../services/RankService';

export const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700];

export const getXpForLevel = (level: number): number => {
    if (level <= 1) return 0;
    if (level <= 5) return LEVEL_THRESHOLDS[level - 1];

    // Smooth curve: step increases by 50 for each level above 5
    // L5 = 700
    // L6 = 700 + 250 = 950
    // L7 = 950 + 300 = 1250
    // L8 = 1250 + 350 = 1600
    let xp = 700;
    for (let l = 6; l <= level; l++) {
        xp += 200 + (l - 5) * 50;
    }
    return xp;
};

export const getLevelTitle = (level: number): string => {
    return RankService.getRankByLevel(level).title;
};

