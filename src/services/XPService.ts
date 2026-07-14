import { XP_VALUES, XP_CAPS } from '../config/xpConfig';
import { LevelService } from './LevelService';
import { User } from '../types';

export interface XPUpdateResult {
    updatedProfile: Partial<User>;
    xpAdded: number;
    levelUp: boolean;
    oldLevel: number;
    newLevel: number;
}

const getLocalDateString = (): string => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getYesterdayDateString = (): string => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const XPService = {
    /**
     * Universal method to process a progression event and return changes
     */
    processXPEvent: (
        user: User,
        event: keyof typeof XP_VALUES,
        context?: {
            newGenre?: boolean;
            firstCompleted?: boolean;
            allEpisodesInSeasonCompleted?: boolean;
        }
    ): XPUpdateResult => {
        const updatedProfile: Partial<User> = {};
        let xpAdded = 0;
        const today = getLocalDateString();

        // Copy existing progress parameters or set defaults
        const currentXp = user.xp || 0;
        const currentLevel = user.level || 1;

        let searchCountToday = user.searchCountToday || 0;
        let lastSearchDate = user.lastSearchDate || '';
        let detailsViewCountToday = user.detailsViewCountToday || 0;
        let lastDetailsViewDate = user.lastDetailsViewDate || '';
        let lastLoginDate = user.lastLoginDate || '';

        let currentStreak = user.currentStreak || 0;
        let longestStreak = user.longestStreak || 0;
        let lastWatchDate = user.lastWatchDate || '';

        switch (event) {
            case 'DAILY_LOGIN':
                if (lastLoginDate !== today) {
                    xpAdded = XP_VALUES.DAILY_LOGIN;
                    updatedProfile.lastLoginDate = today;
                }
                break;

            case 'ADD_TO_WATCHLIST':
                xpAdded = XP_VALUES.ADD_TO_WATCHLIST;
                break;

            case 'START_TRACKING':
                xpAdded = XP_VALUES.START_TRACKING;
                break;

            case 'EPISODE_WATCHED':
                // Base episode XP
                xpAdded = XP_VALUES.EPISODE_WATCHED;

                // Handle streak logic
                const yesterday = getYesterdayDateString();
                if (!lastWatchDate) {
                    currentStreak = 1;
                    lastWatchDate = today;
                } else if (lastWatchDate === yesterday) {
                    currentStreak += 1;
                    lastWatchDate = today;
                    // Apply streak bonuses
                    if (currentStreak === 7) {
                        xpAdded += XP_VALUES.STREAK_7_DAY;
                    } else if (currentStreak === 30) {
                        xpAdded += XP_VALUES.STREAK_30_DAY;
                    }
                } else if (lastWatchDate === today) {
                    // Already watched something today, streak is maintained but no change
                } else {
                    // Streak broken
                    currentStreak = 1;
                    lastWatchDate = today;
                }

                longestStreak = Math.max(longestStreak, currentStreak);
                updatedProfile.currentStreak = currentStreak;
                updatedProfile.longestStreak = longestStreak;
                updatedProfile.lastWatchDate = today;

                // Check night owl behavior or weekend warrior in AchievementService, but we record activity here too if needed
                break;

            case 'COMPLETE_ANIME':
                xpAdded = XP_VALUES.COMPLETE_ANIME;
                if (context?.firstCompleted) {
                    xpAdded += XP_VALUES.COMPLETE_FIRST_ANIME;
                }
                break;

            case 'RATE_ANIME':
                xpAdded = XP_VALUES.RATE_ANIME;
                break;

            case 'FINISH_SEASON':
                xpAdded = XP_VALUES.FINISH_SEASON;
                break;

            case 'DISCOVER_GENRE':
                if (context?.newGenre) {
                    xpAdded = XP_VALUES.DISCOVER_GENRE;
                }
                break;

            case 'USE_SEARCH':
                if (lastSearchDate !== today) {
                    searchCountToday = 0;
                }
                if (searchCountToday < XP_CAPS.USE_SEARCH_DAILY_MAX) {
                    xpAdded = XP_VALUES.USE_SEARCH;
                    searchCountToday += 1;
                    updatedProfile.searchCountToday = searchCountToday;
                    updatedProfile.lastSearchDate = today;
                }
                break;

            case 'OPEN_DETAILS':
                if (lastDetailsViewDate !== today) {
                    detailsViewCountToday = 0;
                }
                if (detailsViewCountToday < XP_CAPS.OPEN_DETAILS_DAILY_MAX) {
                    xpAdded = XP_VALUES.OPEN_DETAILS;
                    detailsViewCountToday += 1;
                    updatedProfile.detailsViewCountToday = detailsViewCountToday;
                    updatedProfile.lastDetailsViewDate = today;
                }
                break;

            default:
                break;
        }

        if (xpAdded > 0) {
            const newXp = currentXp + xpAdded;
            updatedProfile.xp = newXp;

            // Calculate level details
            const levelInfo = LevelService.getLevelInfo(newXp);
            updatedProfile.level = levelInfo.level;

            const levelUp = levelInfo.level > currentLevel;

            return {
                updatedProfile,
                xpAdded,
                levelUp,
                oldLevel: currentLevel,
                newLevel: levelInfo.level
            };
        }

        return {
            updatedProfile,
            xpAdded: 0,
            levelUp: false,
            oldLevel: currentLevel,
            newLevel: currentLevel
        };
    }
};
