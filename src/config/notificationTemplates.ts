export interface NotificationText {
    title: string;
    body: string;
}

export const NOTIFICATION_TEMPLATES = {
    newEpisode: [
        {
            title: "🎉 New Episode!",
            body: "{title} Episode {episode} is now available. Continue Watching →"
        },
        {
            title: "✨ Your next episode is here!",
            body: "{title} Episode {episode} is ready to watch."
        },
        {
            title: "⚡ Time for another adventure!",
            body: "{title} just released Episode {episode}."
        },
        {
            title: "📺 Episode {episode} just dropped!",
            body: "Find out what happens next in {title}."
        }
    ],
    airingTomorrow: [
        {
            title: "⏰ Airing Tomorrow",
            body: "{title} returns tomorrow at {time}. Don't miss it!"
        },
        {
            title: "🔔 Almost time!",
            body: "{title} is scheduled to air tomorrow at {time}."
        }
    ],
    airingToday: [
        {
            title: "🔥 Airing Today",
            body: "{title} airs today! Get ready."
        },
        {
            title: "✨ Premium Watch Alert",
            body: "{title} is broadcasting today. Ready for the premiere?"
        }
    ],
    continueWatching: [
        {
            title: "👀 Still watching?",
            body: "{title} is waiting for you. Continue where you left off."
        },
        {
            title: "✨ Ready for the next episode?",
            body: "Only {count} episodes left in this season of {title}."
        },
        {
            title: "📺 Resume your story",
            body: "Great day to check in on {title} where you last were."
        }
    ],
    finishedAnime: [
        {
            title: "🎊 Congratulations!",
            body: "You completed {title}. How about rating it?"
        },
        {
            title: "⭐️ Masterpiece or Skip?",
            body: "You've finished {title}! Tap to rate this series."
        }
    ],
    recommendations: [
        {
            title: "✨ We think you'll love this.",
            body: "Since you enjoyed {title}, try checking out {recTitle}."
        },
        {
            title: "🍿 Handpicked for you",
            body: "Looking for similar vibes to {title}? Try {recTitle}."
        }
    ],
    seasonPremiere: [
        {
            title: "🚀 New Season Begins Today",
            body: "{title} has officially started!"
        },
        {
            title: "✨ Season Premiere Alert",
            body: "The journey begins! {title} starts broadcasting today."
        }
    ],
    watchStreak: [
        {
            title: "🔥 {streak}-Day Streak!",
            body: "Keep it going! Your dedication is unmatched."
        },
        {
            title: "🏆 One week of anime!",
            body: "Amazing dedication. Keep the daily streak alive!"
        },
        {
            title: "⚡ Streak Milestone",
            body: "You watched anime for {streak} days straight. Keep it burning!"
        }
    ],
    achievement: [
        {
            title: "🏅 Achievement Unlocked",
            body: "{achievementTitle}! Keep active to secure more badges."
        },
        {
            title: "🌟 New Badge Earned",
            body: "You unlocked the '{achievementTitle}' badge!"
        }
    ],
    weeklySummary: [
        {
            title: "📈 Your Anime Week",
            body: "Episodes watched: {episodes} • Anime completed: {completed} • Current streak: {streak} days • Level gained: +{level}"
        }
    ]
};

/**
 * Utility helper to compile template text string replacements.
 */
export function renderNotificationText(
    category: keyof typeof NOTIFICATION_TEMPLATES,
    replacements: Record<string, string | number>,
    index?: number
): NotificationText {
    const templates = NOTIFICATION_TEMPLATES[category];
    const templateIndex = index !== undefined && index >= 0 && index < templates.length
        ? index
        : Math.floor(Math.random() * templates.length);

    const chosen = templates[templateIndex];

    let title = chosen.title;
    let body = chosen.body;

    Object.entries(replacements).forEach(([key, value]) => {
        const replacePattern = new RegExp(`{${key}}`, 'g');
        title = title.replace(replacePattern, String(value));
        body = body.replace(replacePattern, String(value));
    });

    return { title, body };
}
