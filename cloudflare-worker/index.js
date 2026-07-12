/**
 * AnimOrg production-ready Jikan API proxy Cloudflare Worker.
 * Handles CORS preflight requests, whitelist request header forwarding,
 * preserves upstream status/headers/types, and caches successful GET queries for 5 minutes.
 */

export default {
    async fetch(request, env, ctx) {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        };

        // 1. Respond immediately to OPTIONS preflight requests
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders,
            });
        }

        const url = new URL(request.url);

        // Construct the target upstream URL on https://api.jikan.moe
        // Preserves pathname and query string
        const targetUrl = new URL(url.pathname + url.search, "https://api.jikan.moe");

        const cacheKey = new Request(targetUrl.toString(), request);
        const cache = caches.default;

        // 2. Only check cache for GET requests
        if (request.method === "GET") {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) {
                // Return cached response with proper CORS headers
                const newHeaders = new Headers(cachedResponse.headers);
                for (const [key, value] of Object.entries(corsHeaders)) {
                    newHeaders.set(key, value);
                }
                return new Response(cachedResponse.body, {
                    status: cachedResponse.status,
                    statusText: cachedResponse.statusText,
                    headers: newHeaders,
                });
            }
        }

        // 3. Prepare outgoing headers (only copy specified whitelist request headers if present)
        const headers = new Headers();
        const headersToCopy = ["Accept", "Accept-Language", "User-Agent"];
        for (const headerName of headersToCopy) {
            const headerVal = request.headers.get(headerName);
            if (headerVal) {
                headers.set(headerName, headerVal);
            }
        }

        try {
            // 4. Forward the request to the upstream target api.jikan.moe
            // Preserves original HTTP method and body (if present and not GET/HEAD)
            const response = await fetch(targetUrl.toString(), {
                method: request.method,
                headers: headers,
                redirect: "manual",
                body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
            });

            // Prepare response headers preserving Content-Type and CORS headers
            const resHeaders = new Headers();
            const contentType = response.headers.get("Content-Type");
            if (contentType) {
                resHeaders.set("Content-Type", contentType);
            }

            // Inject CORS headers
            for (const [key, value] of Object.entries(corsHeaders)) {
                resHeaders.set(key, value);
            }

            // 5. Cache successful GET responses for 5 minutes (300 seconds)
            const isSuccess = response.status >= 200 && response.status < 300;
            if (request.method === "GET" && isSuccess) {
                resHeaders.set("Cache-Control", "public, max-age=300");

                const cachedRes = new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: resHeaders,
                });

                // Store clone in Cloudflare cache asynchronously
                ctx.waitUntil(cache.put(cacheKey, cachedRes.clone()));

                return cachedRes;
            }

            // 6. Return response immediately for non-GET or error responses without caching
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: resHeaders,
            });
        } catch (error) {
            // Return server error Response on network/fetch failures
            return new Response(JSON.stringify({ error: error.message || "Upstream Proxy Connection Failure" }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders,
                },
            });
        }
    },
};
