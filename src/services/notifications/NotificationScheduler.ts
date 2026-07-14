import { Platform } from 'react-native';
import { renderNotificationText, NOTIFICATION_TEMPLATES } from '../../config/notificationTemplates';

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

// Sleep hours range: 11:00 PM to 8:00 AM
const SLEEP_START_HOUR = 23;
const SLEEP_END_HOUR = 8;
const DEFER_TARGET_HOUR = 9;

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
        if (Platform.OS !== 'android') return;
        const Notifications = getNotificationsModule();
        if (!Notifications) return;

        try {
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
            console.log('[NotificationScheduler] Android channels setup completed.');
        } catch (e) {
            console.error('[NotificationScheduler] Setup channels error:', e);
        }
    },

    /**
     * Checks if a trigger time is in sleep hours and returns a deferred date if so
     */
    adjustForSleep: (targetDate: Date): Date => {
        const adjusted = new Date(targetDate.getTime());
        const hour = adjusted.getHours();

        // Check if falls in SLEEP_START_HOUR (23h) onwards OR before SLEEP_END_HOUR (8h)
        if (hour >= SLEEP_START_HOUR || hour < SLEEP_END_HOUR) {
            console.log(`[NotificationScheduler] Scheduling time ${targetDate.toISOString()} is inside sleep hours (${SLEEP_START_HOUR}:00-${SLEEP_END_HOUR}:00). Deferring...`);

            // Shift definition: If it is past 11PM, we defer to 9AM tomorrow.
            // If it is midnight/early morning before 8AM, we defer to 9AM today.
            if (hour >= SLEEP_START_HOUR) {
                adjusted.setDate(adjusted.getDate() + 1);
            }
            adjusted.setHours(DEFER_TARGET_HOUR, 0, 0, 0);
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

        const { title, body } = renderNotificationText(options.category, options.replacements);

        // Adjust for sleep hours
        const finalTime = options.triggerTime
            ? NotificationScheduler.adjustForSleep(options.triggerTime)
            : NotificationScheduler.adjustForSleep(new Date());

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

            const scheduledId = await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data: finalData,
                    sound: true,
                    vibrationPattern: [0, 250, 250, 250],
                    priority: channelId === 'episodes' ? 'high' : 'default',
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
