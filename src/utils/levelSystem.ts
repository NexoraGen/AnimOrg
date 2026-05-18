import { WatchlistItem, UserRating } from '../types';

export interface UserLevelDetails {
  xp: number;
  level: number;
  title: string;
  nextLevelXp: number;
  progressPercentage: number;
}

export const calculateUserLevel = (
  watchlist: WatchlistItem[],
  userRatings: Record<string, UserRating> | UserRating[]
): UserLevelDetails => {
  // XP Calculation Logic
  const completedCount = watchlist.filter(item => item.status === 'completed').length;
  const watchingCount = watchlist.filter(item => item.status === 'watching').length;
  const favoriteCount = watchlist.filter(item => item.isFavorite).length;
  const ratingCount = Array.isArray(userRatings) ? userRatings.length : Object.keys(userRatings || {}).length;

  const totalXp = 
    (completedCount * 100) + 
    (watchingCount * 50) + 
    (favoriteCount * 20) + 
    (ratingCount * 10);

  // Level Calculation (simple progression curve)
  // Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 300 XP, etc.
  // Formula: Level = floor(sqrt(XP / 100)) + 1
  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;

  // Title Determination
  let title = 'Beginner Otaku';
  if (level >= 31) title = 'Anime Master';
  else if (level >= 16) title = 'Elite Watcher';
  else if (level >= 6) title = 'Anime Explorer';

  // Progress Calculation
  const currentLevelBaseXp = Math.pow(level - 1, 2) * 100;
  const nextLevelBaseXp = Math.pow(level, 2) * 100;
  const xpIntoCurrentLevel = totalXp - currentLevelBaseXp;
  const xpRequiredForNextLevel = nextLevelBaseXp - currentLevelBaseXp;
  const progressPercentage = (xpIntoCurrentLevel / xpRequiredForNextLevel) * 100;

  return {
    xp: totalXp,
    level,
    title,
    nextLevelXp: nextLevelBaseXp,
    progressPercentage: Math.min(Math.max(progressPercentage, 0), 100),
  };
};
