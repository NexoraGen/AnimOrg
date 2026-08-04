const https = require('https');

const executeGraphQLQuery = (query, variables) => new Promise((resolve, reject) => {
    const req = https.request('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(JSON.parse(body).data));
    });
    req.write(JSON.stringify({ query, variables }));
    req.end();
});

const BASE_MEDIA_FIELDS = `
  id
  idMal
  title { english romaji }
  status
  nextAiringEpisode { airingAt timeUntilAiring episode }
`;

const getAiringSchedule = async () => {
    const now = Math.floor(Date.now() / 1000);
    const nextWeek = now + 7 * 24 * 60 * 60;
    const query = `
      query ($now: Int, $nextWeek: Int, $page: Int) {
        Page (page: $page, perPage: 2) {
          airingSchedules (airingAt_greater: $now, airingAt_lesser: $nextWeek, sort: TIME) {
            media {
              ${BASE_MEDIA_FIELDS}
            }
          }
        }
      }
    `;
    const data = await executeGraphQLQuery(query, { now, nextWeek, page: 1 });
    const schedules = data.Page.airingSchedules;

    schedules.forEach(s => {
        let media = s.media;

        let nextEp = media.nextAiringEpisode ? {
            airingAt: media.nextAiringEpisode.airingAt,
            episode: media.nextAiringEpisode.episode
        } : undefined;

        // Simulating getLocalAiringInfo
        let localDay = 'Unknown Schedule';
        if (nextEp && nextEp.airingAt) {
            const absoluteBroadcastTime = new Date(nextEp.airingAt * 1000);
            localDay = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(absoluteBroadcastTime);
        }
        console.log({ id: media.id, title: media.title.english || media.title.romaji, localDay });
    });
};

getAiringSchedule();
