# Hop London 🐇

A real-time **London transport** app (Tube, bus, DLR, Overground, Elizabeth line,
tram & rail) in the spirit of Citymapper — built with **React Native + Expo** and
powered by the live **TfL Unified API**. Runs natively on iOS/Android (Expo Go) and
as a full web app in any browser.

## ✨ Features (v2)

- **🗺️ Map + live arrivals** — interactive OpenStreetMap map with nearby
  stops/stations (search included). Tap a stop for live arrivals: line badge,
  destination, platform, and countdowns that tick down in real time. Big
  interchanges (Canary Wharf, King's Cross…) aggregate arrivals from every
  station inside them.
- **🚆 Live trains** — pick any Tube/Elizabeth/DLR/Overground line and watch its
  trains move on the map in (near) real time. TfL publishes no GPS feed, so
  positions are derived the way Citymapper does it: each train's arrival
  predictions are interpolated along the line's route geometry. Refreshes every
  20 seconds; tap a train for where it is and what it's heading towards.
- **🧭 Journey planner** — from/to with live stop suggestions and "use my
  location"; compares route options (duration, times, line badges, changes) with
  step-by-step legs (walk / line / platform / timings) and a route overview map.
  Ambiguous endpoints are auto-resolved via TfL's disambiguation.
- **📊 Line status** — colour-coded live status for every line with disruption
  reasons, and a shortcut from any line straight to its live train map.

## 🚀 Run it

### Web (zero setup)

Every push to the main working branch auto-deploys the web app to **GitHub
Pages** via `.github/workflows/deploy-web.yml`:

> **https://hugogonzmoreno-ui.github.io/ldn-map/**

> Note: on a Free GitHub plan, Pages requires the repository to be **public**.
> If the deploy workflow fails with a Pages-enablement error, either make the
> repo public (Settings → General → Danger Zone) or upgrade the plan, then
> re-run the workflow.

### On your phone (native, via Expo Go)

```bash
npm install
npx expo start          # add --tunnel if phone and computer are on different networks
```

Scan the QR with the Expo Go app (iOS/Android). Location permission enables
"nearby stops"; without it the app defaults to central London.

### Tests & checks

```bash
npm test                # Jest — TfL normalisation + train-position engine
npm run typecheck
```

## 📱 Publishing to the App Store & Play Store

The repo is ready for a standalone build (bundle id `com.hoplondon.app`, icon,
splash, `eas.json`) but shipping to the stores needs accounts and credentials
only the account owner can create — here's the full runbook.

### 1. One-time accounts (needs your own identity/payment)

- **Apple Developer Program** — <https://developer.apple.com/programs/> ($99/yr).
  Enrollment can take up to 48h to approve.
- **Google Play Console** — <https://play.google.com/console/> ($25 one-time).
  New personal accounts must run a 14-day closed test with 20+ opted-in
  testers before Google allows a production release — plan for that lead time.
- **Expo (EAS)** — free account at <https://expo.dev/signup>, used to build the
  native binaries in the cloud.

### 2. Log in and build

```bash
npm install -g eas-cli
eas login                      # your Expo account
eas build:configure            # links this project to your EAS account
eas build --platform ios --profile production
eas build --platform android --profile production
```

### 3. Submit

```bash
eas submit --platform ios       # needs an App Store Connect API key
eas submit --platform android   # needs a Google Play service-account JSON key
```

Generate those credentials in App Store Connect (Users and Access → Keys) and
the Play Console (Setup → API access) respectively — `eas submit` will prompt
for them interactively the first time and remember them after.

### 4. Store listing

Both stores require a privacy policy since the app requests location — this
repo publishes one automatically alongside the web app:
**https://hugogonzmoreno-ui.github.io/ldn-map/privacy.html**

You'll still need to supply, per store: screenshots (from a real device or
simulator), a short/long description, category, and an age-rating
questionnaire, then submit for review.

## 🔑 API key (optional)

Works **without any key** at low request volumes. For higher limits, get a free
key at <https://api-portal.tfl.gov.uk/> and:

```bash
cp .env.example .env    # set EXPO_PUBLIC_TFL_APP_KEY=your_key
```

## 🏗️ How it works

| Concern        | Choice                                                          |
| -------------- | --------------------------------------------------------------- |
| Framework      | Expo SDK 52 (React Native) + TypeScript, expo-router tabs       |
| Maps           | Native: `react-native-maps` + OSM tiles · Web: **Leaflet** + OSM |
| Data           | TfL Unified API (keyless), `@tanstack/react-query` polling      |
| Live arrivals  | 30s refetch + 10s local tick so countdowns keep moving          |
| Live trains    | `/Line/{id}/Arrivals` grouped by `vehicleId`, interpolated along `/Line/{id}/Route/Sequence/all` geometry, 20s refetch |
| Hosting (web)  | GitHub Actions → GitHub Pages (`EXPO_BASE_URL=/ldn-map`)        |

```
app/                     # expo-router routes
  (tabs)/index.tsx       #   Map + live arrivals
  (tabs)/trains.tsx      #   Live trains map
  (tabs)/plan.tsx        #   Journey planner
  (tabs)/status.tsx      #   Line status
  journey/[id].tsx       #   Journey detail (legs + route map)
src/
  services/tfl.ts        # Typed TfL client (timeouts, hub fallback, 300-retry)
  utils/trains.ts        # Train-position engine (pure, unit-tested)
  hooks/useTfl.ts        # React Query hooks (polling intervals)
  components/            # MapPanel / TrainMap / RouteMiniMap (+ .web.tsx twins),
                         # LineBadge, ArrivalRow, StatusChip, …
  constants/lines.ts     # Official TfL line colours, tracked lines
```

Components with a `.web.tsx` twin use Leaflet on the web and
`react-native-maps` natively — Metro picks the right file per platform, so
Leaflet never enters the native bundle.

Maps note: iOS/Expo Go and web are fully keyless. A standalone **Android**
production build would need a free Google Maps key (react-native-maps
requirement) or a switch to MapLibre.

## 🗺️ Roadmap

Favourites + "time to leave" notifications, fares, dark theme, offline caching.
