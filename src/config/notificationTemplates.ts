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
            title: "🎉 Series Completed!",
            body: "Congratulations! You completed {title}. Ready for your next adventure?"
        },
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
            body: "Your tracked anime {title} has started airing. Watch Episode 1 now."
        },
        {
            title: "✨ Season Premiere Alert",
            body: "The journey begins! {title} starts broadcasting today."
        }
    ],
    seasonFinale: [
        {
            title: "🎬 Season Finale!",
            body: "The finale of {title} (Episode {episode}) is now live. Don't miss it!"
        },
        {
            title: "🏆 The Grand Finale",
            body: "See how the story ends—{title} Episode {episode} is now live."
        }
    ],
    bingeReminder: [
        {
            title: "🍿 Binge Alert!",
            body: "Looks like it's been a while. Continue watching {title}?"
        },
        {
            title: "📺 Time to catch up",
            body: "Still with {character}? Episode {episode} is waiting for you in {title}."
        }
    ],
    airingCountdown: [
        {
            title: "⏰ Airing in {days} Days",
            body: "{title} Episode {episode} is airing in {days} days!"
        },
        {
            title: "⏰ {days} Days to Airing",
            body: "Prepare yourself! {title} Episode {episode} lands in {days} days."
        },
        {
            title: "🔔 Tomorrow: {title}",
            body: "Episode {episode} of {title} premieres tomorrow. Set your reminders!"
        },
        {
            title: "⏰ {hours} Hours Left",
            body: "Only {hours} hours until {title} Episode {episode} drops!"
        },
        {
            title: "⚡ {hours} Hour Countdown!",
            body: "Get ready! {title} Episode {episode} is airing in just {hours} hour."
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
    milestones: [
        {
            title: "🎉 WATCH MILESTONE!",
            body: "You've watched {count} episodes on AnimOrg! Tap to see your stats."
        },
        {
            title: "🏆 HOUR MILESTONE!",
            body: "Incredible! You've logged {count} watch hours. Tap to view your dashboard."
        }
    ],
    levelUps: [
        {
            title: "⭐ Level Up!",
            body: "Level Up! You've achieved Level {level}. See your new profile badges!"
        },
        {
            title: "⚡ Level {level} Reached!",
            body: "You've leveled up! Check out your updated rank and rewards."
        }
    ],
    dailyReminder: [
        {
            title: "✨ Daily Anime check-in",
            body: "Don't forget to track your watch progress today. What are we watching?"
        },
        {
            title: "📺 Your Daily Feed",
            body: "Quick check-in! Update your watchlist today to keep your stats accurate."
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

    if (replacements.weekendPrompt === 'true') {
        title = "See you this weekend?";
        body = `Your next episode of ${replacements.title || 'anime'} is ready.`;
    } else if (replacements.bingePrompt === 'true') {
        title = "Ready for another episode?";
        body = `Your next adventure in ${replacements.title || 'anime'} is waiting.`;
    } else if (replacements.inactivePrompt === 'true') {
        title = "Whenever you're ready";
        body = `${replacements.title || 'Your anime'} is waiting.`;
    }

    Object.entries(replacements).forEach(([key, value]) => {
        const replacePattern = new RegExp(`{${key}}`, 'g');
        title = title.replace(replacePattern, String(value));
        body = body.replace(replacePattern, String(value));
    });

    return { title, body };
}
