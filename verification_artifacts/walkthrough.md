# Retry Configuration Fix — Walkthrough

## Problem
The search endpoint was taking **34 seconds (backend)** / **51 seconds (app)** due to the backend retrying failed upstream 504 responses **3 times** with exponential backoff.

## Root Cause
`axiosClient.ts` was configured with `retries: 3` and included HTTP 504 in `retryCondition`. When Jikan's `/characters` endpoint returned a 504, the backend would:
1. Wait 10s for the first attempt to timeout/fail
2. Wait ~2.5s exponential delay
3. Retry (fail again in ~5s)
4. Wait ~4.1s exponential delay
5. Retry (fail again in ~0.3s)
**Total: ~34 seconds** of wasted time for a single request.

## Changes Made

### [axiosClient.ts](file:///m:/NEXORA%20GEN/AnimOrg2/backend/src/utils/axiosClient.ts)
render_diffs(file:///m:/NEXORA%20GEN/AnimOrg2/backend/src/utils/axiosClient.ts)

### [JikanProvider.ts](file:///m:/NEXORA%20GEN/AnimOrg2/backend/src/providers/JikanProvider.ts)
render_diffs(file:///m:/NEXORA%20GEN/AnimOrg2/backend/src/providers/JikanProvider.ts)

## Verification Results

### Retry Audit (No Duplicate Retries)
| Layer | Has Retries? |
|---|---|
| `axios-retry` (axiosClient.ts) | Yes — but 504 excluded, search disabled via `noRetryConfig()` |
| `RequestManager` | No — dedup only, deletes failed promises immediately |
| `executeWithCache` (AnimeService.ts) | No — stale cache fallback only, no retry |
| Express middleware (errorHandler.ts) | No — pass-through error handler |
| Cloudflare Worker | No — single fetch, no retry |

### Before vs After
| Metric | Before | After |
|---|---|---|
| Retry count (search) | 3 | **0** |
| Retry count (other) | 3 | **2** (504 excluded) |
| Avg failed search (backend) | ~34,000ms | **~1,020ms** |
| Avg failed search (app) | ~51,000ms | **~1,332ms** |

### Test Results
- Character search (504 failure): **1,020ms** ✅
- Anime search (success): **1,602ms** ✅
- Parallel Promise.all (both): **1,332ms** ✅
- `npm run build`: Clean ✅
- `git push origin main`: Success ✅
