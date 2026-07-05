# Hop London 🐇

A real-time **London transport** app (Tube, bus, DLR, Overground, Elizabeth line,
tram & rail) in the spirit of Citymapper — built with **React Native + Expo** and
powered by the live **TfL Unified API**.

## Features (v1)

- **🗺️ Live map + arrivals** — an OpenStreetMap map centred on your location with
  nearby stops/stations. Tap a stop to see live arrivals with counting-down
  minutes, the destination and the platform.
- **🧭 Journey planner** — enter from/to (with live stop suggestions or "use my
  location") and compare route options: duration, departure/arrival times, line
  badges and number of changes. Open a route for step-by-step legs (walk / line /
  platform / timings) and a route overview map.
- **📊 Line status** — live status for every Tube, Overground, Elizabeth line, DLR
  and tram line, colour-coded, with disruption reasons.

Real-time is driven by polling: arrivals refresh every 30s, line status every 60s.

## Tech stack

| Concern        | Choice                                                        |
| -------------- | ------------------------------------------------------------ |
| Framework      | Expo (React Native) + TypeScript                             |
| Navigation     | `expo-router` (file-based, bottom tabs)                      |
| Maps           | `react-native-maps` + free **OpenStreetMap** raster tiles    |
| Data fetching  | `@tanstack/react-query` with polling                         |
| Location       | `expo-location`                                              |
| Transport data | [TfL Unified API](https://api.tfl.gov.uk) — **no key needed**|

## Getting started

```bash
npm install
npx expo start
```

Then press `i` (iOS simulator), `a` (Android emulator), or scan the QR code with
**Expo Go** on your phone. `w` opens a web preview (the interactive map runs on
device; web shows a nearby-stops list fallback).

### API key (optional)

The app works **without any API key** at low request volumes. For higher rate
limits, register a free key at <https://api-portal.tfl.gov.uk/>, then:

```bash
cp .env.example .env
# set EXPO_PUBLIC_TFL_APP_KEY=your_key
```

### Maps note

The map uses free OpenStreetMap tiles over the platform's default base map (Apple
Maps on iOS). This is keyless for iOS and Expo Go. A standalone **Android**
production build additionally needs either a free Google Maps API key
(`react-native-maps` requirement) or a switch to MapLibre — not required for
development or demos.

## Project structure

```
app/                     # expo-router routes
  (tabs)/                #   bottom-tab screens
    index.tsx            #     Map + live arrivals
    plan.tsx             #     Journey planner
    status.tsx           #     Line status
  journey/[id].tsx       #   Journey detail (legs + route map)
  _layout.tsx            #   Root: React Query provider + navigation
src/
  services/tfl.ts        # Typed TfL Unified API client
  hooks/useTfl.ts        # React Query hooks (polling)
  components/            # LineBadge, ArrivalRow, StatusChip, MapPanel, …
  constants/lines.ts     # Official TfL line colours + mode icons
  utils/format.ts        # Countdown / time / path helpers
  types/tfl.ts           # Raw API + normalised view-model types
```

`MapPanel` and `RouteMiniMap` have `.web.tsx` fallbacks so the app also bundles
for web (where `react-native-maps` has no renderer).

## Scripts

```bash
npm test         # Jest unit tests (TfL response normalisation)
npm run typecheck
```

## Roadmap (deferred)

Favourites + "time to leave" push notifications, live bus vehicle positions on the
map, fares, and offline caching.
