# IELTS Coach — Monorepo

## Structure

```
vocally/
├── apps/
│   ├── web/        Next.js 15 — flashcards + voice practice (web)
│   ├── mobile/     Expo (React Native) — flashcards + voice practice (iOS/Android)
│   ├── api/        FastAPI (Python) — backend API, recommendations, spaced repetition
│   └── admin/      Next.js — admin dashboard (analytics, vocabulary management)
│
└── packages/
    └── shared/     Shared types, flashcard data, utilities
```

## Getting started

```bash
# Install all dependencies from root
npm install

# Run web app  (localhost:3000)
npm run dev

# Run mobile app (Expo Go)
npm run dev:mobile

# Run API server (localhost:5000)
npm run dev:api

# Run admin panel (localhost:3001)
npm run dev:admin
```

## Apps

### `apps/web`
Full-featured web app with swipeable flashcards and OpenAI Realtime API voice practice.
Add `OPENAI_API_KEY` to `apps/web/.env.local` to enable voice.

### `apps/mobile`
Expo Go compatible React Native app with swipe cards and voice practice UI.
Voice practice requires a custom Expo dev build (`npx expo run:ios`) with `react-native-webrtc`.
Scan the QR code from `npm run dev:mobile` with the **Expo Go** app.

### `apps/api`
FastAPI (Python) backend — AI-powered vocabulary recommendation engine.
- `POST /api/swipe`              — fire-and-forget swipe recording
- `GET  /api/cards/next/{userId}` — pre-loaded cards from queue (~20ms)
- `POST /api/queue/prefill`      — fill card queue on app open
- `POST /api/recommendations`    — on-demand AI recommendations
- `POST /api/level`              — CEFR level detection
- `GET  /api/interests/{userId}` — topic interest scores
- `GET  /api/due-cards/{userId}` — spaced repetition due cards

See [apps/api/README.md](apps/api/README.md) for setup & deploy guide.

### `apps/admin`
Admin dashboard for reviewing sessions, words, and user analytics.

## Packages

### `packages/shared`
- `src/data/flashcards.ts` — IELTS vocabulary decks (24 cards, 4 categories)
- `src/types/index.ts` — shared TypeScript interfaces (`CapturedWord`, `UserSession`, etc.)
