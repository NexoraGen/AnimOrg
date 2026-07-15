import { NotificationScheduler } from './NotificationScheduler';
import { useAppStore } from '../../store/useAppStore';

// Map notification categories to settings keys
const CATEGORY_TO_SETTING_MAP = {
    newEpisode: 'episodeReleases',
    airingCountdown: 'airingCountdown',
    airingTomorrow: 'airingCountdown',
    airingToday: 'episodeReleases',
    continueWatching: 'continueWatching',
    bingeReminder: 'continueWatching',
    finishedAnime: 'recommendations',
    recommendations: 'recommendations',
    seasonPremiere: 'episodeReleases',
    seasonFinale: 'episodeReleases',
    watchStreak: 'milestones',
    milestones: 'milestones',
    levelUps: 'levelUps',
    achievement: 'achievements',
    dailyReminder: 'dailyReminder',
    weeklySummary: 'weeklySummary',
};

export const NotificationManager = {
    /**
     * Checks if notification delivery is allowed based on global and category settings
     */
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

        // 2. Check frequency limits
        const frequency = store.notificationFrequency || 'balanced';
        if (frequency === 'minimal') {
            const allowed = ['newEpisode', 'airingToday', 'finishedAnime', 'levelUps', 'achievement'];
            if (!allowed.includes(category)) {
                console.log(`[NotificationManager] Frequency cap "minimal" blocked category "${category}"`);
                return false;
            }
        } else if (frequency === 'balanced') {
            const blocked = ['dailyReminder', 'news'];
            if (blocked.includes(category)) {
                console.log(`[NotificationManager] Frequency cap "balanced" blocked category "${category}"`);
                return false;
            }
        }

        // 3. Check granular switches
        const settingsKey = CATEGORY_TO_SETTING_MAP[category] as keyof typeof store.notificationSettings;
        if (store.notificationSettings && store.notificationSettings[settingsKey] === false) {
            console.log(`[NotificationManager] Granular switch "${settingsKey}" disabled. Category "${category}" delivery blocked.`);
            return false;
        }

        return true;
    },

    /**
     * Determines user watch pattern based on activity feed history
     */
    getUserWatchPattern: (): 'weekend' | 'binger' | 'inactive' | 'default' => {
        const store = useAppStore.getState();
        const feed = store.activityFeed || [];

        if (feed.length === 0) return 'default';

        // 1. Inactive: no activity in past 7 days
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentActivity = feed.filter(item => {
            const t = typeof item.timestamp === 'number' ? item.timestamp : new Date(item.timestamp).getTime();
            return t > oneWeekAgo;
        });
        if (recentActivity.length === 0) {
            return 'inactive';
        }

        // 2. Weekend: > 60% of activities log on Fri, Sat, Sun
        let weekendCount = 0;
        let weekdayCount = 0;
        feed.forEach(item => {
            const t = typeof item.timestamp === 'number' ? item.timestamp : new Date(item.timestamp).getTime();
            const day = new Date(t).getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
            if (day === 0 || day === 5 || day === 6) {
                weekendCount++;
            } else {
                weekdayCount++;
            }
        });
        if (weekendCount > weekdayCount * 1.5) {
            return 'weekend';
        }

        // 3. Binger: logged 4 or more episodes in a single day
        const dayBuckets: Record<string, number> = {};
        let maxCountPerDay = 0;
        feed.forEach(item => {
            const t = typeof item.timestamp === 'number' ? item.timestamp : new Date(item.timestamp).getTime();
            const dateStr = new Date(t).toDateString();
            dayBuckets[dateStr] = (dayBuckets[dateStr] || 0) + 1;
            if (dayBuckets[dateStr] > maxCountPerDay) {
                maxCountPerDay = dayBuckets[dateStr];
            }
        });
        if (maxCountPerDay >= 4) {
            return 'binger';
        }

        return 'default';
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
     * Trigger airing countdown alerts (3d, 2d, 1d, 12h, 1h)
     */
    triggerAiringCountdown: async (animeTitle: string, episode: number, airingAtMs: number, mediaId: string) => {
        if (!NotificationManager.canDeliver('airingCountdown')) return;

        const now = Date.now();
        const intervals = [
            { subtractMs: 3 * 24 * 60 * 60 * 1000, days: 3 },
            { subtractMs: 2 * 24 * 60 * 60 * 1000, days: 2 },
            { subtractMs: 1 * 24 * 60 * 60 * 1000, days: 1 },
            { subtractMs: 12 * 60 * 60 * 1000, hours: 12 },
            { subtractMs: 1 * 60 * 60 * 1000, hours: 1 }
        ];

        for (const item of intervals) {
            const triggerTimeMs = airingAtMs - item.subtractMs;
            if (triggerTimeMs > now) {
                const triggerDate = new Date(triggerTimeMs);
                const replacements: Record<string, string | number> = 'days' in item
                    ? { title: animeTitle, episode, days: (item as any).days }
                    : { title: animeTitle, episode, hours: (item as any).hours };

                await NotificationScheduler.scheduleNotification({
                    category: 'airingCountdown',
                    replacements,
                    triggerTime: triggerDate,
                    data: { deepLinkUrl: `animorg://media/${mediaId}`, animeId: mediaId, episode },
                    channelId: 'episodes'
                });
            }
        }
    },

    /**
     * Trigger continue watching alerts
     */
    triggerContinueWatching: async (animeTitle: string, leftEpisodesCount?: number, mediaId?: string) => {
        if (!NotificationManager.canDeliver('continueWatching')) return;

        const pattern = NotificationManager.getUserWatchPattern();
        let replacements: Record<string, string | number> = { title: animeTitle, count: leftEpisodesCount || 3 };

        if (pattern === 'weekend') {
            replacements.weekendPrompt = 'true';
        } else if (pattern === 'binger') {
            replacements.bingePrompt = 'true';
        } else if (pattern === 'inactive') {
            replacements.inactivePrompt = 'true';
        }

        await NotificationScheduler.preventSpamAndSchedule({
            category: 'continueWatching',
            replacements,
            data: mediaId ? { deepLinkUrl: `animorg://media/${mediaId}`, animeId: mediaId } : {},
            channelId: 'recommendations'
        });
    },

    /**
     * Trigger binge catch up reminders
     */
    triggerBingeReminder: async (animeTitle: string, episode: number, characterName: string, mediaId: string) => {
        if (!NotificationManager.canDeliver('continueWatching')) return;

        const pattern = NotificationManager.getUserWatchPattern();
        let replacements: Record<string, string | number> = { title: animeTitle, episode, character: characterName };

        if (pattern === 'binger') {
            replacements.bingePrompt = 'true';
        } else if (pattern === 'inactive') {
            replacements.inactivePrompt = 'true';
        }

        await NotificationScheduler.preventSpamAndSchedule({
            category: 'bingeReminder',
            replacements,
            data: { deepLinkUrl: `animorg://media/${mediaId}`, animeId: mediaId },
            channelId: 'recommendations'
        });
    },

    /**
     * Trigger completed anime rating alert & suggestions
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
     * Trigger watch milestones (+100 watches, +500 hrs)
     */
    triggerMilestone: async (type: 'episodes' | 'hours', count: number) => {
        if (!NotificationManager.canDeliver('milestones')) return;

        await NotificationScheduler.scheduleNotification({
            category: 'milestones',
            replacements: { count },
            data: { deepLinkUrl: `animorg://profile` },
            channelId: 'recommendations'
        });
    },

    /**
     * Trigger level up events
     */
    triggerLevelUp: async (level: number) => {
        if (!NotificationManager.canDeliver('levelUps')) return;

        await NotificationScheduler.scheduleNotification({
            category: 'levelUps',
            replacements: { level },
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
     * Trigger daily check-in call to action notifications
     */
    triggerDailyReminder: async () => {
        if (!NotificationManager.canDeliver('dailyReminder')) return;

        await NotificationScheduler.preventSpamAndSchedule({
            category: 'dailyReminder',
            replacements: {},
            data: { deepLinkUrl: `animorg://home` },
            channelId: 'announcements'
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
