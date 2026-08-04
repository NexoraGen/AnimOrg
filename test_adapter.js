const https = require('https');

const query = `
  query ($now: Int, $nextWeek: Int, $page: Int) {
    Page (page: $page, perPage: 1) {
      airingSchedules (airingAt_greater: $now, airingAt_lesser: $nextWeek, sort: TIME) {
        airingAt
        episode
        media {
          id
          title { english romaji }
          status
          nextAiringEpisode {
            airingAt
            timeUntilAiring
            episode
          }
        }
      }
    }
  }
`;

const now = Math.floor(Date.now() / 1000);
const nextWeek = now + 7 * 24 * 60 * 60;
const variables = { now, nextWeek, page: 1 };

const req = https.request('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(body);
            console.log(JSON.stringify(json.data.Page.airingSchedules[0], null, 2));
        } catch (e) {
            console.error(e);
        }
    });
});

req.write(JSON.stringify({ query, variables }));
req.end();
