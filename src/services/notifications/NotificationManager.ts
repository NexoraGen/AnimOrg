import { NotificationScheduler } from './NotificationScheduler';
import { useAppStore } from '../../store/useAppStore';

// Map notification categories to settings keys
const CATEGORY_TO_SETTING_MAP = {
    newEpisode: 'episodeReleases',
    airingTomorrow: 'episodeReleases',
    airingToday: 'episodeReleases',
    continueWatching: 'continueWatching',
    finishedAnime: 'recommendations', // finished anime recommendations/rate rating prompt
    recommendations: 'recommendations',
    seasonPremiere: 'recommendations',
    watchStreak: 'achievements', // streaks belong to progression/achievements
    achievement: 'achievements',
    weeklySummary: 'weeklySummary',
};

export const NotificationManager = {
    /**
     * Checks if notification delivery is allowed based on global and category settings
     */
    canDeliver: (category: keyof typeof CATEGORY_TO_SETTING_MAP): boolean => {
        const store = useAppStore.getState();

        // 1. Check master configuration switch
        if (!store.notificationsEnabled) {
            console.log(`[NotificationManager] Global notifications disabled. Category "${category}" delivery blocked.`);
            return false;
        }

        // 2. Check granular switches
        const settingsKey = CATEGORY_TO_SETTING_MAP[category] as keyof typeof store.notificationSettings;
        if (store.notificationSettings && store.notificationSettings[settingsKey] === false) {
            console.log(`[NotificationManager] Granular switch "${settingsKey}" disabled. Category "${category}" delivery blocked.`);
            return false;
        }

        return true;
    },

    /**
     * Trigger a new episode release notification
     */
    triggerNewEpisode: async (animeTitle: string, episode: number, mediaId: string) => {
        if (!NotificationManager.canDeliver('newEpisode')) return;

        await NotificationScheduler.preventSpamAndSchedule({
            category: 'newEpisode',
            replacements: { title: animeTitle, episode },
            data: { deepLinkUrl: `animorg://media/${mediaId}`, animeId: mediaId, episode },
            channelId: 'episodes'
        });
    },

    /**
     * Trigger airing tomorrow alerts
     */
    triggerAiringTomorrow: async (animeTitle: string, time: string, mediaId: string) => {
        if (!NotificationManager.canDeliver('airingTomorrow')) return;

        // Schedule tomorrow at the specific time or immediately
        await NotificationScheduler.preventSpamAndSchedule({
            category: 'airingTomorrow',
            replacements: { title: animeTitle, time },
            data: { deepLinkUrl: `animorg://media/${mediaId}`, animeId: mediaId },
            channelId: 'episodes'
        });
    },

    /**
     * Trigger airing today alerts
     */
    triggerAiringToday: async (animeTitle: string, mediaId: string) => {
        if (!NotificationManager.canDeliver('airingToday')) return;

        await NotificationScheduler.preventSpamAndSchedule({
            category: 'airingToday',
            replacements: { title: animeTitle },
            data: { deepLinkUrl: `animorg://media/${mediaId}`, animeId: mediaId },
            channelId: 'episodes'
        });
    },

    /**
     * Trigger continue watching alerts
     */
    triggerContinueWatching: async (animeTitle: string, leftEpisodesCount?: number, mediaId?: string) => {
        if (!NotificationManager.canDeliver('continueWatching')) return;

        // Use appropriate template replacement
        const count = leftEpisodesCount || 3;
        await NotificationScheduler.preventSpamAndSchedule({
            category: 'continueWatching',
            replacements: { title: animeTitle, count },
            data: mediaId ? { deepLinkUrl: `animorg://media/${mediaId}`, animeId: mediaId } : {},
            channelId: 'recommendations'
        });
    },

    /**
     * Trigger completed anime rating alert
     */
    triggerFinishedAnime: async (animeTitle: string, mediaId: string) => {
        if (!NotificationManager.canDeliver('finishedAnime')) return;

        await NotificationScheduler.scheduleNotification({
            category: 'finishedAnime',
            replacements: { title: animeTitle },
            data: { deepLinkUrl: `animorg://media/${mediaId}`, animeId: mediaId },
            channelId: 'recommendations'
        });
    },

    /**
     * Trigger anime recommendations alert
     */
    triggerRecommendation: async (enjoyedTitle: string, recommendedTitle: string, mediaId: string) => {
        if (!NotificationManager.canDeliver('recommendations')) return;

        await NotificationScheduler.scheduleNotification({
            category: 'recommendations',
            replacements: { title: enjoyedTitle, recTitle: recommendedTitle },
            data: { deepLinkUrl: `animorg://media/${mediaId}`, animeId: mediaId },
            channelId: 'recommendations'
        });
    },

    /**
     * Trigger watch streak milestones
     */
    triggerWatchStreak: async (streak: number) => {
        if (!NotificationManager.canDeliver('watchStreak')) return;

        await NotificationScheduler.scheduleNotification({
            category: 'watchStreak',
            replacements: { streak },
            data: { deepLinkUrl: `animorg://profile` },
            channelId: 'recommendations'
        });
    },

    /**
     * Trigger achievements alerts
     */
    triggerAchievement: async (achievementName: string) => {
        if (!NotificationManager.canDeliver('achievement')) return;

        await NotificationScheduler.scheduleNotification({
            category: 'achievement',
            replacements: { achievementTitle: achievementName },
            data: { deepLinkUrl: `animorg://profile` },
            channelId: 'recommendations'
        });
    },

    /**
     * Trigger weekly summary notification
     */
    triggerWeeklySummary: async (episodes: number, completed: number, streak: number, levelGained: number) => {
        if (!NotificationManager.canDeliver('weeklySummary')) return;

        await NotificationScheduler.scheduleNotification({
            category: 'weeklySummary',
            replacements: {
                episodes,
                completed,
                streak,
                level: levelGained,
            },
            data: { deepLinkUrl: `animorg://profile` },
            channelId: 'announcements'
        });
    }
};
