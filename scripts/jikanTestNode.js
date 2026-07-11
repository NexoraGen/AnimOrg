const fetch = require('node-fetch');

async function testJikan() {
    const query = 'Oshi no Ko';
    const url = `https://api.jikan.moe/v4/anime?page=1&limit=20&q=${encodeURIComponent(query)}`;

    console.log(`[Test] Hitting: ${url}`);

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.log({
                url,
                status: res.status,
                statusText: res.statusText,
                body: await res.text()
            });
        } else {
            const json = await res.json();
            console.log(`[Test] Success! Found ${json.data.length} results. First result: ${json.data[0]?.title}`);
        }
    } catch (err) {
        console.error('[Test] Native Fetch Error:', err);
    }
}

testJikan();
