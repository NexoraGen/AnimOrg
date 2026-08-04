/**
 * AnimOrg production-ready Jikan API proxy Cloudflare Worker.
 * Handles CORS preflight requests, whitelist request header forwarding,
 * preserves upstream status/headers/types, and caches successful GET queries for 5 minutes.
 */

const generateHtmlResponse = (title, description, image, author, intentLink, playStoreLink) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} - AnimOrg</title>
    <!-- Open Graph tags for rich previews -->
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    ${image ? `<meta property="og:image" content="${image}" />` : ''}
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="AnimOrg" />
    
    <!-- Twitter tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    ${image ? `<meta name="twitter:image" content="${image}" />` : ''}
    
    <style>
        body {
            background: #0B0B0B;
            color: #FFFFFF;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
        }
        .card {
            background: #151515;
            border: 1px solid #333;
            border-radius: 12px;
            padding: 24px;
            max-width: 480px;
            width: 100%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .cover { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 20px; background: #222; }
        h1 { font-size: 20px; margin-bottom: 8px; line-height: 1.4; }
        .author { color: #888; font-size: 14px; margin-bottom: 20px; font-weight: 500; }
        .preview { font-size: 15px; line-height: 1.6; color: #CCC; margin-bottom: 28px; text-align: left; padding: 16px; background: #1A1A1A; border-radius: 8px; }
        .btn {
            display: inline-block;
            background: #E50914;
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 24px;
            font-weight: 600;
            font-size: 16px;
            transition: opacity 0.2s;
            cursor: pointer;
            border: none;
            width: 100%;
            box-sizing: border-box;
        }
        .btn-outline {
            background: transparent;
            border: 1px solid rgba(255,255,255,0.2);
            margin-top: 12px;
        }
        .btn:hover { opacity: 0.9; }
    </style>
    <!-- JS auto-redirect logic -->
    <script>
       const isAndroid = /Android/i.test(navigator.userAgent);
       
       function handleOpenApp() {
           if (isAndroid) {
               window.location.href = "${intentLink}";
           } else {
               window.location.href = "${playStoreLink}";
           }
       }

       // Auto redirect only for mobile Android users
       if (isAndroid) {
           window.location.href = "${intentLink}";
       }
    </script>
</head>
<body>
    <!-- Desktop Web Fallback Preview -->
    <div class="card">
        ${image ? `<img src="${image}" class="cover" alt="Anime preview" />` : ''}
        <h1>${title}</h1>
        ${author ? `<div class="author">By ${author}</div>` : ''}
        <div class="preview">"${description}"</div>
        
        <button onclick="handleOpenApp()" class="btn">Open in AnimOrg App</button>
        <button onclick="window.location.href='${playStoreLink}'" class="btn btn-outline">Install AnimOrg</button>
    </div>
</body>
</html>
`;

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

        // -- ASSETLINKS FOR ANDROID APP LINKS --
        if (request.method === "GET" && url.pathname === '/.well-known/assetlinks.json') {
            const assetLinks = [{
                "relation": ["delegate_permission/common.handle_all_urls"],
                "target": {
                    "namespace": "android_app",
                    "package_name": "com.nexora.animorg",
                    "sha256_cert_fingerprints": [
                        "11:22:33:44:55:66:77:88:99:00:AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00:AA:BB:CC:DD:EE:FF"
                    ]
                }
            }];
            return new Response(JSON.stringify(assetLinks), {
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders
                }
            });
        }

        const appPackage = "com.nexora.animorg";
        const intentScheme = "animorg";
        const playStoreLink = `https://play.google.com/store/apps/details?id=${appPackage}`;

        // -- ANIMORG SHARE DEEP-LINK REDIRECTOR --
        if (request.method === "GET" && url.pathname.startsWith('/share/post/')) {
            const parts = url.pathname.split('/');
            const postId = parts[parts.length - 1] || "";

            let postTitle = "Anime Discussion";
            let postContent = "This discussion is currently unavailable or has been deleted.";
            let authorName = "AnimOrg";
            let animeImage = "";

            if (postId) {
                try {
                    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/animorg-nexora/databases/(default)/documents/community_posts/${postId}?key=AIzaSyCTgVGBV60FJpkk8CebCA5CppPFKvrV5YY`;
                    const postRes = await fetch(firestoreUrl);
                    if (postRes.ok) {
                        const postData = await postRes.json();
                        if (postData.fields) {
                            postTitle = postData.fields.animeTitle?.stringValue || postTitle;
                            const fullContent = postData.fields.content?.stringValue || "";
                            postContent = fullContent.length > 150 ? fullContent.substring(0, 150) + "..." : (fullContent || "Check out this post on AnimOrg!");
                            authorName = postData.fields.authorName?.stringValue || authorName;
                            animeImage = postData.fields.animeImage?.stringValue || "";
                        }
                    }
                } catch (e) {
                    console.error("Worker fetch error:", e);
                }
            }

            const intentLink = `intent://post/${postId}#Intent;scheme=${intentScheme};package=${appPackage};S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3D${appPackage};end`;
            const html = generateHtmlResponse(`${authorName} on AnimOrg: ${postTitle}`, postContent, animeImage, authorName, intentLink, playStoreLink);
            return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
        }

        if (request.method === "GET" && url.pathname.startsWith('/share/anime/')) {
            const parts = url.pathname.split('/');
            const animeId = parts[parts.length - 1] || "";

            let animeTitle = "Explore on AnimOrg";
            let animeDesc = "This anime could not be found or is no longer available.";
            let animeImage = "";

            if (animeId) {
                try {
                    const jikanUrl = `https://api.jikan.moe/v4/anime/${animeId}`;
                    const res = await fetch(jikanUrl);
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.data) {
                            animeTitle = data.data.title_english || data.data.title || animeTitle;
                            animeImage = data.data.images?.jpg?.large_image_url || "";
                            animeDesc = data.data.synopsis ? (data.data.synopsis.length > 150 ? data.data.synopsis.substring(0, 150) + "..." : data.data.synopsis) : "Check out this anime on AnimOrg!";
                        }
                    }
                } catch (e) {
                    console.error("Jikan API error", e)
                }
            }

            const intentLink = `intent://anime/${animeId}#Intent;scheme=${intentScheme};package=${appPackage};S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3D${appPackage};end`;
            const html = generateHtmlResponse(`${animeTitle}`, animeDesc, animeImage, null, intentLink, playStoreLink);
            return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
        }

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
