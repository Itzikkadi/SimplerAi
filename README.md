# Simpler

> Sampling, simplified. — AI-powered vocal sample discovery.

Natural-language search → DeepSeek builds a structured Freesound query → preview, sort,
and save samples. Monorepo: lean Hono + SQLite server, React 19 + Mantine web.

## Structure
- `packages/shared` — shared TypeScript types
- `packages/server` — Hono API: DeepSeek query builder, Freesound proxy, SQLite
- `packages/web` — React 19 + Vite + Mantine UI

## Setup
```bash
pnpm install
cp .env.example .env   # fill DEEPSEEK_API_KEY and FREESOUND_API_KEY
pnpm dev               # server :8787 + web :5173
```

## Scripts
- `pnpm dev` — run server + web
- `pnpm build` — build all packages
- `pnpm test` — run all unit tests
- `pnpm lint` — lint the workspace

## Roadmap
Deferred: auth, Stripe, server-side audio analysis, Archive.org/Tracklib, social, Ableton plugin.
