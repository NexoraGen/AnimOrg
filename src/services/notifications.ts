import type * as NotificationsType from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

let Notifications: typeof NotificationsType | null = null;
const getNotifications = (): typeof NotificationsType | null => {
    if (!Notifications) {
        try {
            Notifications = require('expo-notifications');
        } catch (e) {
            console.warn('[Notifications] Failed to load expo-notifications module:', e);
        }
    }
    return Notifications;
};

// Configure how notifications should be handled when the app is in the foreground
if (Platform.OS !== 'web') {
    try {
        const normNotifications = getNotifications();
        if (normNotifications) {
            normNotifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                    shouldShowBanner: true,
                    shouldShowList: true,
                }),
            });
        }
    } catch (e) {
        console.warn('[Notifications] Failed to initialize notification handler:', e);
    }
}

export const notificationService = {
    registerForPushNotificationsAsync: async (): Promise<string | undefined> => {
        let token;

        if (Platform.OS === 'web') {
            return undefined;
        }

        const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
        if (isExpoGo) {
            // Expo SDK 53+ does not support push token registration in Expo Go.
            // Safely bypass to prevent startup crashes. Local notifications will still function.
            console.log('[NotificationService] Running in Expo Go. Skipping remote push registration.');
            return undefined;
        }

        const normNotifications = getNotifications();
        if (!normNotifications) {
            return undefined;
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await normNotifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await normNotifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification!');
                return undefined;
            }

            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ??
                Constants?.easConfig?.projectId;

            try {
                token = (await normNotifications.getExpoPushTokenAsync({
                    projectId,
                })).data;
            } catch (e) {
                console.error("Error getting Expo Push Token:", e);
            }
        } else {
            console.log('Must use physical device for Push Notifications');
        }

        if (Platform.OS === 'android') {
            normNotifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: normNotifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF2353',
            });
        }

        return token;
    },

    scheduleLocalNotification: async (title: string, body: string, data?: any) => {
        const normNotifications = getNotifications();
        if (!normNotifications) return;

        await normNotifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data: data || {},
            },
            trigger: null, // show immediately
        });
    },

    scheduleAiringNotification: async (animeId: string, title: string, episode: number, date: Date) => {
        const normNotifications = getNotifications();
        if (!normNotifications) return;

        // Schedule for exactly the air time
        await normNotifications.scheduleNotificationAsync({
            content: {
                title: `New episode: ${title}`,
                body: `Episode ${episode} is now airing!`,
                data: { animeId, episode },
            },
            trigger: {
                type: normNotifications.SchedulableTriggerInputTypes.DATE,
                date,
            } as any,
        });
    },

    checkAndScheduleAiringAlerts: async (watchingAnime: any[], schedule: any[]) => {
        if (watchingAnime.length === 0 || schedule.length === 0) return;

        for (const item of watchingAnime) {
            const airingToday = schedule.find(s => s.id === item.animeId);
            if (airingToday) {
                await notificationService.scheduleLocalNotification(
                    `Airing Today: ${airingToday.title}`,
                    `A new episode airs today! Stay tuned.`
                );
            }
        }
    },

    cancelAllNotifications: async () => {
        const normNotifications = getNotifications();
        if (!normNotifications) return;

        await normNotifications.cancelAllScheduledNotificationsAsync();
    },

    sendPushNotification: async (expoPushToken: string, title: string, body: string, data?: any) => {
        try {
            const message = {
                to: expoPushToken,
                sound: 'default',
                title: title,
                body: body,
                data: data || {},
            };

            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message),
            });
            const resData = await response.json();
            console.log('[NotificationService] Expo push success response:', resData);
            return resData;
        } catch (error) {
            console.error('[NotificationService] Error sending Expo push notification:', error);
            return null;
        }
    },

    dispatchSocialPush: async (recipientId: string, title: string, body: string, data?: any) => {
        try {
            const { firestoreService } = require('./firebase/firestore');
            const settings = await firestoreService.getUserPushSettings(recipientId);
            if (!settings) {
                console.log(`[NotificationService] No push settings found for recipient: ${recipientId}`);
                return;
            }

            const { pushToken, notificationsEnabled, notificationSettings } = settings;
            if (!pushToken) {
                console.log(`[NotificationService] Recipient ${recipientId} has no registered push token`);
                return;
            }

            if (!notificationsEnabled) {
                console.log(`[NotificationService] Recipient ${recipientId} has disabled notifications globally`);
                return;
            }

            // Check specific settings toggle if category is specified
            const category = data?.type;
            if (category === 'like' || category === 'comment' || category === 'reply' || category === 'follow') {
                if (notificationSettings && notificationSettings.socialNotifications === false) {
                    console.log(`[NotificationService] Social notifications are disabled for recipient: ${recipientId}`);
                    return;
                }
            }

            console.log(`[NotificationService] Dispatching Expo push to ${recipientId}: "${title}"`);
            await notificationService.sendPushNotification(pushToken, title, body, data);
        } catch (error) {
            console.error('[NotificationService] Error in dispatchSocialPush:', error);
        }
    }
};
