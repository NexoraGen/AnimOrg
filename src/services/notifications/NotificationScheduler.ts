import { Platform } from 'react-native';
import { renderNotificationText, NOTIFICATION_TEMPLATES } from '../../config/notificationTemplates';
import { useAppStore } from '../../store/useAppStore';

// Dynamically load expo-notifications
let NotificationsModule: any = null;
const getNotificationsModule = () => {
    if (!NotificationsModule) {
        try {
            NotificationsModule = require('expo-notifications');
        } catch (e) {
            console.warn('[NotificationScheduler] Failed to require expo-notifications:', e);
        }
    }
    return NotificationsModule;
};

export interface ScheduleOptions {
    category: keyof typeof NOTIFICATION_TEMPLATES;
    replacements: Record<string, string | number>;
    triggerTime?: Date; // If missing, trigger immediately (respecting sleep hours)
    data?: Record<string, any>;
    channelId?: 'episodes' | 'recommendations' | 'announcements';
}

export const NotificationScheduler = {
    /**
     * Set up Android channels
     */
    setupChannels: async () => {
        const Notifications = getNotificationsModule();
        if (!Notifications) return;

        try {
            // Android Channels
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('episodes', {
                    name: 'Episode Releases',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF2353',
                });
                await Notifications.setNotificationChannelAsync('recommendations', {
                    name: 'Recommendations & Achievements',
                    importance: Notifications.AndroidImportance.DEFAULT,
                });
                await Notifications.setNotificationChannelAsync('announcements', {
                    name: 'News & Weekly Summaries',
                    importance: Notifications.AndroidImportance.LOW,
                });
            }

            // iOS & Android Categories Action buttons
            await Notifications.setNotificationCategoryAsync('episodeReleases', [
                {
                    identifier: 'open_anime',
                    buttonTitle: 'Open Anime',
                    options: { isDestructive: false, isAuthenticationRequired: false },
                },
                {
                    identifier: 'mark_as_watched',
                    buttonTitle: 'Mark as Watched',
                    options: { isDestructive: false, isAuthenticationRequired: false },
                },
                {
                    identifier: 'remind_later',
                    buttonTitle: 'Remind Me Later',
                    options: { isDestructive: false, isAuthenticationRequired: false },
                },
            ]);

            await Notifications.setNotificationCategoryAsync('continueWatching', [
                {
                    identifier: 'continue',
                    buttonTitle: 'Continue',
                    options: { isDestructive: false, isAuthenticationRequired: false },
                },
                {
                    identifier: 'open_details',
                    buttonTitle: 'Open Details',
                    options: { isDestructive: false, isAuthenticationRequired: false },
                },
            ]);

            await Notifications.setNotificationCategoryAsync('achievements', [
                {
                    identifier: 'view_achievement',
                    buttonTitle: 'View Achievement',
                    options: { isDestructive: false, isAuthenticationRequired: false },
                },
                {
                    identifier: 'share',
                    buttonTitle: 'Share',
                    options: { isDestructive: false, isAuthenticationRequired: false },
                },
            ]);

            await Notifications.setNotificationCategoryAsync('recommendations', [
                {
                    identifier: 'view_anime',
                    buttonTitle: 'View Anime',
                    options: { isDestructive: false, isAuthenticationRequired: false },
                },
                {
                    identifier: 'save_watchlist',
                    buttonTitle: 'Save to Watchlist',
                    options: { isDestructive: false, isAuthenticationRequired: false },
                },
            ]);

            console.log('[NotificationScheduler] Android channels and Action categories setup completed.');
        } catch (e) {
            console.error('[NotificationScheduler] Setup channels/categories error:', e);
        }
    },

    /**
     * Checks if a trigger time is in quiet/sleep hours and returns a deferred date if so
     */
    adjustForSleep: (targetDate: Date): Date => {
        const adjusted = new Date(targetDate.getTime());
        const settings = useAppStore.getState().notificationSettings;
        const quietEnabled = settings?.quietHoursEnabled ?? true;
        const quietStart = settings?.quietHoursStart || '22:00';
        const quietEnd = settings?.quietHoursEnd || '08:00';

        if (!quietEnabled) {
            return adjusted;
        }

        const [startHour, startMin] = quietStart.split(':').map(Number);
        const [endHour, endMin] = quietEnd.split(':').map(Number);

        const hour = adjusted.getHours();
        const min = adjusted.getMinutes();
        const minutesOfDay = hour * 60 + min;
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        let insideQuiet = false;
        if (startMinutes > endMinutes) {
            // Over midnight (e.g. 22:00 to 08:00)
            insideQuiet = minutesOfDay >= startMinutes || minutesOfDay < endMinutes;
        } else {
            // Same day range (e.g. 02:00 to 06:00)
            insideQuiet = minutesOfDay >= startMinutes && minutesOfDay < endMinutes;
        }

        if (insideQuiet) {
            console.log(`[NotificationScheduler] Target time ${targetDate.toISOString()} falls in quiet hours (${quietStart}-${quietEnd}). Deferring to exit...`);
            if (hour >= startHour) {
                adjusted.setDate(adjusted.getDate() + 1);
            }
            adjusted.setHours(endHour, endMin, 0, 0);
        }

        return adjusted;
    },

    /**
     * Schedule a notification
     */
    scheduleNotification: async (options: ScheduleOptions): Promise<string | undefined> => {
        const Notifications = getNotificationsModule();
        if (!Notifications) {
            console.warn('[NotificationScheduler] expo-notifications unavailable.');
            return undefined;
        }

        const finalTime = options.triggerTime
            ? NotificationScheduler.adjustForSleep(options.triggerTime)
            : NotificationScheduler.adjustForSleep(new Date());

        const isReleaseAlert = options.category === 'newEpisode' || options.category === 'airingToday';

        if (isReleaseAlert && !options.data?.isConsolidated) {
            try {
                const scheduled = await Notifications.getAllScheduledNotificationsAsync();
                const targetDateStr = finalTime.toDateString();

                const sameDayReleases = scheduled.filter((notif: any) => {
                    const triggerTimeVal = notif.trigger?.value;
                    if (!triggerTimeVal) return false;
                    const triggerDate = new Date(triggerTimeVal);
                    const isMatchingDate = triggerDate.toDateString() === targetDateStr;
                    const isRelease = notif.content?.data?.category === 'newEpisode' || notif.content?.data?.category === 'airingToday';
                    return isMatchingDate && isRelease;
                });

                if (sameDayReleases.length >= 1) {
                    const titles = new Set<string>();
                    const currentTitle = String(options.replacements.title || options.data?.animeTitle || 'an anime');
                    titles.add(currentTitle);

                    for (const notif of sameDayReleases) {
                        const prevTitles = notif.content?.data?.animeTitles || [notif.content?.data?.animeTitle || 'another anime'];
                        prevTitles.forEach((t: string) => titles.add(t));
                        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
                    }

                    const titlesList = Array.from(titles);
                    const count = titlesList.length;

                    return await NotificationScheduler.scheduleNotification({
                        category: 'newEpisode',
                        replacements: { title: `${count} shows`, episode: '' },
                        triggerTime: finalTime,
                        data: {
                            isConsolidated: true,
                            category: 'newEpisode',
                            animeTitles: titlesList,
                            consolidatedCount: count,
                        },
                        channelId: 'episodes'
                    });
                }
            } catch (e) {
                console.warn('[NotificationScheduler] Consolidation check failed:', e);
            }
        }

        let { title, body } = renderNotificationText(options.category, options.replacements);

        if (options.data?.isConsolidated) {
            title = "📺 New Releases Today";
            const count = options.data.consolidatedCount;
            const animeListStr = options.data.animeTitles.slice(0, 2).join(', ') + (options.data.animeTitles.length > 2 ? ' and others' : '');
            body = `${count} new episodes are available today including ${animeListStr}.`;
        }

        const isImmediate = finalTime.getTime() <= Date.now() + 1000;

        const triggerInput = isImmediate
            ? null
            : {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: finalTime,
            };

        try {
            const finalData = {
                category: options.category,
                deepLinkUrl: options.data?.deepLinkUrl || `animorg://profile`,
                ...(options.data || {}),
            };

            const channelId = options.channelId || (
                options.category === 'newEpisode' || options.category === 'airingToday' || options.category === 'airingTomorrow'
                    ? 'episodes'
                    : options.category === 'recommendations' || options.category === 'achievement' || options.category === 'watchStreak'
                        ? 'recommendations'
                        : 'announcements'
            );

            const categoryIdentifier =
                options.category === 'newEpisode' || options.category === 'airingToday' || options.category === 'airingTomorrow' || options.category === 'airingCountdown'
                    ? 'episodeReleases'
                    : options.category === 'continueWatching' || options.category === 'bingeReminder'
                        ? 'continueWatching'
                        : options.category === 'achievement' || options.category === 'watchStreak' || options.category === 'milestones' || options.category === 'levelUps'
                            ? 'achievements'
                            : options.category === 'finishedAnime' || options.category === 'recommendations'
                                ? 'recommendations'
                                : undefined;

            const scheduledId = await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data: finalData,
                    sound: true,
                    vibrationPattern: [0, 250, 250, 250],
                    priority: channelId === 'episodes' ? 'high' : 'default',
                    categoryIdentifier,
                    ...Platform.select({
                        android: {
                            channelId,
                        }
                    })
                },
                trigger: triggerInput as any,
            });

            console.log(`[NotificationScheduler] Scheduled notification: "${title}" for ${isImmediate ? 'Immediate delivery' : finalTime.toString()} (ID: ${scheduledId})`);
            return scheduledId;
        } catch (e) {
            console.error('[NotificationScheduler] Scheduling failure:', e);
            return undefined;
        }
    },

    /**
     * Group similar notifications scheduled for the same period.
     * Prevents duplicate/repeating reminders or too many alerts in short intervals.
     */
    preventSpamAndSchedule: async (options: ScheduleOptions): Promise<string | undefined> => {
        const Notifications = getNotificationsModule();
        if (!Notifications) return undefined;

        try {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            const now = Date.now();
            const requestedTime = options.triggerTime?.getTime() || now;

            // Check if there is already a scheduled notification for the identical category
            // within a 1-hour window of the requested time.
            const hasDuplicate = scheduled.some((notif: any) => {
                const triggerTime = notif.trigger?.value;
                if (!triggerTime) return false;
                const matchesCategory = notif.content?.data?.category === options.category;
                const timeDiff = Math.abs(triggerTime - requestedTime);
                return matchesCategory && timeDiff < 60 * 60 * 1000; // 1 hour threshold
            });

            if (hasDuplicate) {
                console.log(`[NotificationScheduler] Cooldown restriction: duplicate category "${options.category}" request inside 1hr window ignored.`);
                return undefined;
            }

            return await NotificationScheduler.scheduleNotification(options);
        } catch (e) {
            console.error('[NotificationScheduler] preventSpamAndSchedule error:', e);
            return await NotificationScheduler.scheduleNotification(options);
        }
    },

    /**
     * Cancel all queued notifications
     */
    cancelAll: async () => {
        const Notifications = getNotificationsModule();
        if (!Notifications) return;
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
            console.log('[NotificationScheduler] Cancelled all scheduled notifications.');
        } catch (e) {
            console.error('[NotificationScheduler] Cancel error:', e);
        }
    }
};
