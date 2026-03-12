# IELTS Coach — Monorepo

## Structure

```
vocally/
├── apps/
│   ├── web/        Next.js 15 — flashcards + voice practice (web)
│   ├── mobile/     Expo (React Native) — flashcards + voice practice (iOS/Android)
│   ├── api/        Express — backend API, session proxy, word storage
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

# Run API server (localhost:4000)
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
Express backend. Planned routes:
- `POST /api/session` — OpenAI Realtime ephemeral token (move from web)
- `GET  /api/words`   — fetch captured vocabulary
- `POST /api/words`   — save a word

### `apps/admin`
Admin dashboard for reviewing sessions, words, and user analytics.

## Packages

### `packages/shared`
- `src/data/flashcards.ts` — IELTS vocabulary decks (24 cards, 4 categories)
- `src/types/index.ts` — shared TypeScript interfaces (`CapturedWord`, `UserSession`, etc.)
