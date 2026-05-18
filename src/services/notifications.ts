import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure how notifications should be handled when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const notificationService = {
    registerForPushNotificationsAsync: async (): Promise<string | undefined> => {
        let token;

        if (Platform.OS === 'web') {
            return undefined;
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
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
                token = (await Notifications.getExpoPushTokenAsync({
                    projectId,
                })).data;
            } catch (e) {
                console.error("Error getting Expo Push Token:", e);
            }
        } else {
            console.log('Must use physical device for Push Notifications');
        }

        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF2353',
            });
        }

        return token;
    },

    scheduleLocalNotification: async (title: string, body: string, data?: any) => {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data: data || {},
            },
            trigger: null, // show immediately
        });
    },

    scheduleAiringNotification: async (animeId: string, title: string, episode: number, date: Date) => {
        // Schedule for exactly the air time
        await Notifications.scheduleNotificationAsync({
            content: {
                title: `New episode: ${title}`,
                body: `Episode ${episode} is now airing!`,
                data: { animeId, episode },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date,
            },
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
        await Notifications.cancelAllScheduledNotificationsAsync();
    }
};
