import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { db } from './firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export interface VersionInfo {
    latestVersion: string;
    minVersion: string;
    playStoreUrl: string;
    forceUpdateMessage?: string;
    updateMessage?: string;
}

const CACHE_KEY = '@animorg_version_cache';
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

export const VersionCheckService = {
    /**
     * Compare two semantic versions.
     * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal.
     */
    compareVersions: (v1: string, v2: string): number => {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        const len = Math.max(parts1.length, parts2.length);
        for (let i = 0; i < len; i++) {
            const num1 = parts1[i] || 0;
            const num2 = parts2[i] || 0;
            if (num1 > num2) return 1;
            if (num1 < num2) return -1;
        }
        return 0;
    },

    /**
     * Checks if an update is required or available.
     * Handles 6-hour caching to minimize Firestore reads.
     */
    checkForUpdates: async (forceFetch = false): Promise<{
        isUpdateAvailable: boolean;
        isForceUpdate: boolean;
        versionInfo: VersionInfo | null;
        playStoreUrl: string;
    }> => {
        try {
            // Check cache
            if (!forceFetch) {
                const cachedString = await AsyncStorage.getItem(CACHE_KEY);
                if (cachedString) {
                    const cachedData = JSON.parse(cachedString);
                    if (Date.now() - cachedData.timestamp < CACHE_DURATION_MS) {
                        return VersionCheckService.evaluateVersion(cachedData.info);
                    }
                }
            }

            // Fetch from Firestore
            const versionDocRef = doc(db, 'app_config', 'versioning');
            const versionSnap = await getDoc(versionDocRef);

            if (versionSnap.exists()) {
                const info = versionSnap.data() as VersionInfo;
                // Cache the response
                await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                    info,
                    timestamp: Date.now()
                }));
                return VersionCheckService.evaluateVersion(info);
            }
        } catch (error) {
            console.error('[VersionCheckService] Failed to fetch version info:', error);
        }

        // Default safe fallback if network fails
        return { isUpdateAvailable: false, isForceUpdate: false, versionInfo: null, playStoreUrl: '' };
    },

    /**
     * Core logic evaluating the fetched version info against the runtime bundle.
     */
    evaluateVersion: (info: VersionInfo) => {
        const currentAppVersion = Constants.expoConfig?.version || '1.0.0';

        let isUpdateAvailable = false;
        let isForceUpdate = false;

        if (info.latestVersion && VersionCheckService.compareVersions(info.latestVersion, currentAppVersion) > 0) {
            isUpdateAvailable = true;
        }

        if (info.minVersion && VersionCheckService.compareVersions(info.minVersion, currentAppVersion) > 0) {
            isForceUpdate = true;
            isUpdateAvailable = true; // Forced inherently means available
        }

        return {
            isUpdateAvailable,
            isForceUpdate,
            versionInfo: info,
            playStoreUrl: info.playStoreUrl || 'market://details?id=com.nexora.animorg'
        };
    }
};
