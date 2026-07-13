import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const STORAGE_KEYS = {
    ONBOARDING_SHOWN: 'animorg_notif_onboarding_shown',
    LAST_PROMPT_TIME: 'animorg_notif_last_prompt_time',
    PERMISSION_DENIED_PERMANENTLY: 'animorg_notif_perm_denied',
};

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type PermissionStatus = 'unknown' | 'granted' | 'denied' | 'blocked';

let NotificationsModule: any = null;
const getNotificationsModule = () => {
    if (!NotificationsModule) {
        try {
            NotificationsModule = require('expo-notifications');
        } catch {
            // Module unavailable
        }
    }
    return NotificationsModule;
};

export const notificationPermission = {
    /**
     * Get current OS notification permission status.
     */
    getPermissionStatus: async (): Promise<PermissionStatus> => {
        if (Platform.OS === 'web') return 'blocked';

        const isExpoGo =
            Constants.appOwnership === 'expo' ||
            Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
        if (isExpoGo) return 'unknown';

        const Notifications = getNotificationsModule();
        if (!Notifications) return 'unknown';

        try {
            const { status, canAskAgain } = await Notifications.getPermissionsAsync();
            if (status === 'granted') return 'granted';
            if (status === 'denied' && !canAskAgain) return 'blocked';
            if (status === 'denied') return 'denied';
            return 'unknown';
        } catch {
            return 'unknown';
        }
    },

    /**
     * Request OS notification permission. Returns the resulting status.
     */
    requestPermission: async (): Promise<PermissionStatus> => {
        if (Platform.OS === 'web') return 'blocked';

        const isExpoGo =
            Constants.appOwnership === 'expo' ||
            Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
        if (isExpoGo) return 'unknown';

        const Notifications = getNotificationsModule();
        if (!Notifications) return 'unknown';

        try {
            const { status, canAskAgain } = await Notifications.requestPermissionsAsync();

            if (status === 'granted') {
                // Register Android notification channels
                if (Platform.OS === 'android') {
                    await Notifications.setNotificationChannelAsync('episodes', {
                        name: 'Episode Releases',
                        importance: Notifications.AndroidImportance.HIGH,
                        vibrationPattern: [0, 250, 250, 250],
                        lightColor: '#FF2353',
                    });
                    await Notifications.setNotificationChannelAsync('recommendations', {
                        name: 'Recommendations',
                        importance: Notifications.AndroidImportance.DEFAULT,
                    });
                    await Notifications.setNotificationChannelAsync('announcements', {
                        name: 'News & Announcements',
                        importance: Notifications.AndroidImportance.LOW,
                    });
                }
                return 'granted';
            }

            if (!canAskAgain) {
                await AsyncStorage.setItem(STORAGE_KEYS.PERMISSION_DENIED_PERMANENTLY, 'true');
                return 'blocked';
            }

            return 'denied';
        } catch {
            return 'unknown';
        }
    },

    /**
     * Open device notification settings for this app.
     */
    openSettings: async (): Promise<void> => {
        try {
            await Linking.openSettings();
        } catch {
            // Silently fail
        }
    },

    /**
     * Check if first-launch onboarding dialog has been shown.
     */
    hasOnboardingBeenShown: async (): Promise<boolean> => {
        try {
            const val = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_SHOWN);
            return val === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Mark onboarding as shown so it never appears again.
     */
    markOnboardingShown: async (): Promise<void> => {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_SHOWN, 'true');
        } catch {
            // Silent
        }
    },

    /**
     * Check if tracking prompt should be shown (respects 7-day cooldown).
     */
    shouldShowTrackingPrompt: async (): Promise<boolean> => {
        try {
            const status = await notificationPermission.getPermissionStatus();
            if (status === 'granted') return false;

            const lastTime = await AsyncStorage.getItem(STORAGE_KEYS.LAST_PROMPT_TIME);
            if (lastTime) {
                const elapsed = Date.now() - parseInt(lastTime, 10);
                if (elapsed < COOLDOWN_MS) return false;
            }
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Mark tracking prompt as shown, starting the 7-day cooldown.
     */
    markTrackingPromptShown: async (): Promise<void> => {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.LAST_PROMPT_TIME, Date.now().toString());
        } catch {
            // Silent
        }
    },
};
