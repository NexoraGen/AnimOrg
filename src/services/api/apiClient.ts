import Constants from 'expo-constants';

/**
 * Dynamically resolves the backend base URL.
 * In production: Uses the EXPO_PUBLIC_API_URL environment variable.
 * In development: Auto-detects the host IP of the machine running Expo to allow physical device debugging,
 *                 falling back to 127.0.0.1.
 */
const getBackendBaseUrl = (): string => {
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // Auto-detect host IP during local development with Expo to enable physical device debugging
    const debuggerHost = Constants.expoConfig?.hostUri;
    if (debuggerHost) {
        const ip = debuggerHost.split(':')[0];
        return `http://${ip}:5000`;
    }

    // Safe standard loopback mapping
    return 'http://127.0.0.1:5000';
};

export const BACKEND_BASE = getBackendBaseUrl();

/**
 * Unified rest query execution layer.
 * Standardizes fetch calls, logs endpoints during development, and intercepts proxy errors.
 */
export const executeBackendQuery = async <T>(relativeUrl: string, signal?: AbortSignal): Promise<T> => {
    const cleanUrl = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
    const url = `${BACKEND_BASE}${cleanUrl}`;

    console.log(`[apiClient] Initiating request to URL: ${url}`);

    let response: Response;
    const fetchStart = Date.now();
    console.log(`[Search Metrics] [apiClient] Request start time for ${cleanUrl}: ${fetchStart}`);
    try {
        response = await fetch(url, { signal });
        const fetchDuration = Date.now() - fetchStart;
        console.log(`[Search Metrics] [apiClient] Request duration for ${cleanUrl}: ${fetchDuration}ms`);
    } catch (networkError: any) {
        console.error(`[apiClient] Network connection failed for ${url}:`, networkError);
        throw new Error(`Connection to backend failed. Please ensure the backend is running.`);
    }

    if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
        try {
            const errJson = await response.json();
            if (errJson && errJson.message) {
                errorMsg = errJson.message;
            }
        } catch {
            // Read as format failed, keep default statusText
        }
        console.error(`[apiClient] Response not OK (${response.status}):`, errorMsg);
        throw new Error(errorMsg);
    }

    const jsonParseStart = Date.now();
    const json = await response.json();
    const jsonParseDuration = Date.now() - jsonParseStart;
    console.log(`[Search Metrics] [apiClient] JSON parse duration for ${cleanUrl}: ${jsonParseDuration}ms`);

    // Check if the response follows the error envelope structure
    if (json && json.success === false) {
        throw new Error(json.message || "An unexpected backend error occurred.");
    }

    return json;
};
