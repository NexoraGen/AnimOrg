# Search Flow Performance Optimization

We will optimize the end-to-end search pipeline on AnimOrg to deliver a highly responsive, low-latency search experience, preventing redundant backend hits.

## Proposed Changes

### Frontend Client Layer

#### [MODIFY] [apiClient.ts](file:///m:/NEXORA%20GEN/AnimOrg2/src/services/api/apiClient.ts)
- Support propagating an optional `AbortSignal` parameter in `executeBackendQuery` so that in-flight fetch requests can be cancelled directly by the React components.

#### [MODIFY] [JikanAdapter.ts](file:///m:/NEXORA%20GEN/AnimOrg2/src/services/api/JikanAdapter.ts)
- Pass the `AbortSignal` in `searchAnime` and `searchCharacters` to `executeBackendQuery`.
- Adjust `searchAnime` URL construction to append `&limit=10` (reducing default limit from 25 to 10).

#### [MODIFY] [AniListAdapter.ts](file:///m:/NEXORA%20GEN/AnimOrg2/src/services/api/AniListAdapter.ts)
- Update `executeGraphQLQuery` to accept and set the standard `AbortSignal` parameter to the native `fetch` config.
- Adjust `searchAnime` variables to set `perPage: 10` (down from 20).
- Support propagating the `AbortSignal` parameter in `searchAnime`.

#### [MODIFY] [animeApi.ts](file:///m:/NEXORA%20GEN/AnimOrg2/src/services/animeApi.ts)
- Support transferring an optional `AbortSignal` in `searchAnime` and `searchCharacters`.

---

### Frontend Component Layer (Search Screen)

#### [MODIFY] [search.tsx](file:///m:/NEXORA%20GEN/AnimOrg2/app/(tabs)/search.tsx)
- **Controlled Input Debounce**:
  - Keep a local `inputValue` state to bind immediately to the `<TextInput>` to prevent lag while typing.
  - Implement a 400-500ms debounce timer (using standard React refs or custom hooks) that updates the search query state only after the user stops typing.
- **Loading Skeleton & Lag Elimination**:
  - Instantly trigger loading skeletons the moment typing starts (when `inputValue` mismatches the debounced query value).
- **Abort Controller Cancellation**:
  - Keep an `AbortController` in a Ref. If a new query starts debouncing, cancel any active in-flight query immediately by calling `.abort()`.
  - Handle `AbortError` gracefully so aborted requests don't leak as UI errors.
- **In-Memory Session Caching**:
  - Implement a session Map cache (`SEARCH_SESSION_CACHE`) for Page 1 results keyed by query + selected filters.
  - If identical queries are repeated, return cached data instantly, but perform a background fetch to silently update the lists and the cache in the background (SWR pattern).
- **Performance Profiling & Logging**:
  - Log precisely the `debounce delay`, `API response time`, and `render time`.
- **Renders Minimization**:
  - Wrap internal static component blocks (e.g. `surprise me` banner, genre grids, history items) in `React.memo` or `useMemo` hooks.
- **Lazy Loading**:
  - Verify that `PosterCard` images are lazy-loaded (using `expo-image` default recycling keys/load features). Set image priority to `medium` or `low` to not block rendering.

---

### Backend Service Layer

#### [MODIFY] [JikanProvider.ts](file:///m:/NEXORA%20GEN/AnimOrg2/backend/src/providers/JikanProvider.ts)
- Update `cleanParams` to allow a custom `limit` parameter of `10` to bypass clean defaults, or adapt slicing rules to ensure limits of 10 flow cleanly.

---

## Verification Plan

### Automated/Manual Logs Verification
1. Run local environment and start/open search page.
2. Type "Naruto" fast. Verify that exactly ONE request goes to the backend.
3. Observe terminal / console outputs for timing metrics:
   - Debounce delay
   - API response time
   - Render time
4. Tap different genres or re-type "Naruto". Verify that cached results show immediately and background sync completes.

### Build Verification
- Execute `npm run build` on the backend to verify compiling completes.
- Verify Expo bundles successfully for web.
