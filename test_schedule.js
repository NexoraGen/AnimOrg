const https = require('https');

const query = `
  query ($now: Int, $nextWeek: Int, $page: Int) {
    Page (page: $page, perPage: 50) {
      pageInfo {
        hasNextPage
      }
      airingSchedules (airingAt_greater: $now, airingAt_lesser: $nextWeek, sort: TIME) {
        media {
          id
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
            console.log('Status:', res.statusCode);
            if (json.data && json.data.Page && json.data.Page.airingSchedules) {
                console.log('Schedules count:', json.data.Page.airingSchedules.length);
            } else {
                console.log(body);
            }
        } catch (e) {
            console.error(e, body);
        }
    });
});

req.write(JSON.stringify({ query, variables }));
req.end();
