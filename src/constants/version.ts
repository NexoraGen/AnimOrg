import Constants from 'expo-constants';

/**
 * Single source of truth for the app version.
 * Reads from app.json via expo-constants at runtime.
 * Every screen must use this utility instead of hardcoding a version string.
 */

/** Raw semantic version string, e.g. "1.0.13" */
export const APP_VERSION = Constants.expoConfig?.version ?? Constants.manifest?.version ?? '0.0.0';

/** Branded display string, e.g. "AnimOrg v1.0.13" */
export const APP_VERSION_DISPLAY = `AnimOrg v${APP_VERSION}`;
