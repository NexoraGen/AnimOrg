# AnimOrg

A premium anime discovery and tracking mobile application built with React Native, Expo, and Firebase.

## 🚀 Features

- **Anime Discovery** — Browse trending, seasonal, top-rated, and upcoming anime via the Jikan API
- **Watchlist Management** — Add anime to your watchlist with status tracking (watching, completed, plan-to-watch, dropped)
- **User Ratings & Reviews** — Rate anime and read community reviews
- **Personalized Recommendations** — "Because You Watched", "Recommended For You", and genre-based suggestions
- **Trailer Playback** — Watch anime trailers directly from YouTube
- **Community** — Global discussions and contributor profiles
- **Dark/Light Theme** — Premium cinematic UI with dynamic theming
- **Cross-Platform** — Android, iOS, and Web support

## 🛠️ Tech Stack

- **Framework**: React Native + Expo (SDK 54)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Zustand with AsyncStorage persistence
- **API**: Jikan API (MyAnimeList data)
- **Backend**: Firebase (Auth + Firestore)
- **Styling**: React Native StyleSheet with custom design tokens

## 📦 Getting Started

```sh
# Install dependencies
npm install

# Start development server
npx expo start

# Run on specific platforms
npm run android
npm run ios
npm run web
```

## 🏗️ Build & Deploy

```sh
# EAS Build
npx eas-cli build --platform android

# Web deployment
npm run deploy
```

## 📝 Notes

- [Expo Router: Docs](https://docs.expo.dev/router/introduction/)
- [Jikan API: Docs](https://docs.api.jikan.moe/)
