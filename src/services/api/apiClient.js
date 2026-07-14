"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeBackendQuery = exports.BACKEND_BASE = void 0;
const expo_constants_1 = __importDefault(require("expo-constants"));
/**
 * Dynamically resolves the backend base URL.
 * In production: Uses the EXPO_PUBLIC_API_URL environment variable.
 * In development: Auto-detects the host IP of the machine running Expo to allow physical device debugging,
 *                 falling back to 127.0.0.1.
 */
const getBackendBaseUrl = () => {
    var _a;
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }
    // Auto-detect host IP during local development with Expo to enable physical device debugging
    const debuggerHost = (_a = expo_constants_1.default.expoConfig) === null || _a === void 0 ? void 0 : _a.hostUri;
    if (debuggerHost) {
        const ip = debuggerHost.split(':')[0];
        return `http://${ip}:5000`;
    }
    // Safe standard loopback mapping
    return 'http://127.0.0.1:5000';
};
exports.BACKEND_BASE = getBackendBaseUrl();
/**
 * Unified rest query execution layer.
 * Standardizes fetch calls, logs endpoints during development, and intercepts proxy errors.
 */
const executeBackendQuery = (relativeUrl, signal) => __awaiter(void 0, void 0, void 0, function* () {
    const cleanUrl = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
    const url = `${exports.BACKEND_BASE}${cleanUrl}`;
    console.log(`[apiClient] Initiating request to URL: ${url}`);
    let response;
    const fetchStart = Date.now();
    console.log(`[Search Metrics] [apiClient] Request start time for ${cleanUrl}: ${fetchStart}`);
    try {
        response = yield fetch(url, { signal });
        const fetchDuration = Date.now() - fetchStart;
        console.log(`[Search Metrics] [apiClient] Request duration for ${cleanUrl}: ${fetchDuration}ms`);
    }
    catch (networkError) {
        console.error(`[apiClient] Network connection failed for ${url}:`, networkError);
        throw new Error(`Connection to backend failed. Please ensure the backend is running.`);
    }
    if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
        try {
            const errJson = yield response.json();
            if (errJson && errJson.message) {
                errorMsg = errJson.message;
            }
        }
        catch (_a) {
            // Read as format failed, keep default statusText
        }
        console.error(`[apiClient] Response not OK (${response.status}):`, errorMsg);
        throw new Error(errorMsg);
    }
    const jsonParseStart = Date.now();
    const json = yield response.json();
    const jsonParseDuration = Date.now() - jsonParseStart;
    console.log(`[Search Metrics] [apiClient] JSON parse duration for ${cleanUrl}: ${jsonParseDuration}ms`);
    // Check if the response follows the error envelope structure
    if (json && json.success === false) {
        throw new Error(json.message || "An unexpected backend error occurred.");
    }
    return json;
});
exports.executeBackendQuery = executeBackendQuery;
