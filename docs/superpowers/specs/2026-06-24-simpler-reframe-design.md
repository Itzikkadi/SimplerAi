# Simpler — Production-Grade Reframe (Design Spec)

**Date:** 2026-06-24
**Branch:** `feat/reframe-monorepo`
**Status:** Implemented

> "Sampling, simplified." — AI-powered vocal sample discovery for music producers.

---

## 1. Goal & Scope

Reframe the current MVP (a flat React 18 + Vite Freesound search app with duplicated
legacy files) into a professional, moderate **monorepo**: a lean React frontend in the
team's "house style" (pianos), backed by a **minimal smart server** that uses the
**DeepSeek** LLM to turn natural language into structured Freesound queries, with
**SQLite** persistence. Production-grade quality bar, but deliberately a focused POC.

### In scope (this slice)
- **Core smart search** — DeepSeek query builder → Freesound → normalized results, in-browser player, rights badges, sort.
- **Saved library (SQLite)** — save/organize samples + search history persisted server-side.
- **Track upload + BPM/key** — browser-side audio analysis seeds the search.

### Deferred (explicitly out — roadmap only)
Auth, Stripe/payments, server-side audio analysis, Archive.org / Tracklib clearance,
social feed, Ableton/Max-for-Live plugin.

---

## 2. Architecture — pnpm monorepo

```
simpler/
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── package.json                  # workspace scripts (dev/build/test/lint)
├── .env.example
├── .gitignore                    # .env, *.sqlite, node_modules, dist
├── README.md
├── docs/superpowers/specs/…
└── packages/
    ├── shared/                   # @simpler/shared — TS types shared by web + server
    │   └── src/index.ts          # Sample, StructuredQuery, SearchRequest/Response, SavedSample
    ├── server/                   # @simpler/server — Hono + better-sqlite3
    │   ├── src/
    │   │   ├── index.ts          # Hono app + @hono/node-server bootstrap
    │   │   ├── env.ts            # zod-validated env (fail-fast)
    │   │   ├── routes/
    │   │   │   ├── search.ts     # POST /api/search
    │   │   │   └── library.ts    # GET/POST/DELETE /api/library
    │   │   ├── services/
    │   │   │   ├── deepseek.ts   # NL prompt → StructuredQuery (+ literal fallback)
    │   │   │   └── freesound.ts  # query Freesound + normalize → Sample[]
    │   │   └── db/
    │   │       ├── index.ts      # better-sqlite3 init + migrations runner
    │   │       └── schema.sql    # tables below
    │   └── package.json
    └── web/                      # @simpler/web — React 19 + TS + Vite + Mantine
        ├── index.html            # lang="en" (fix current rtl/he bug), Outfit font
        ├── vite.config.ts        # /api proxy → server
        ├── src/
        │   ├── main.tsx, App.tsx
        │   ├── theme.ts          # Mantine dark theme, teal #1D9E75 accent
        │   ├── lib/api.ts        # typed fetch client (uses @simpler/shared)
        │   ├── store.ts          # Zustand: player + saved library state
        │   ├── audio/analyze.ts  # Web Audio decode + BPM detect
        │   ├── hooks/            # useSmartSearch (react-query), usePlayer
        │   └── components/       # SearchPrompt, ResultsList, ResultRow, Player,
        │                         #   ReasoningChip, RightsBadge, SeedBar, LibraryDrawer
        └── package.json
```

`pnpm dev` runs server + web concurrently. The **duplicate legacy root files**
(`App.jsx`, `Player.jsx`, `freesound.js`, etc.) are **deleted**; `src/` is rebuilt as
`packages/web`.

---

## 3. Smart search flow (DeepSeek as query builder)

`web → POST /api/search { prompt, seed?, sort } → server`

1. **`deepseek.ts`** calls DeepSeek (`https://api.deepseek.com`, model `deepseek-chat`,
   OpenAI-compatible, JSON output) with the natural-language `prompt` and optional
   `seed` (`{ bpm, key, mood }`). Returns a **`StructuredQuery`**:
   `{ keywords: string, tags: string[], filters: { license?, minDuration?, maxDuration? }, sort, reasoning: string }`.
2. **`freesound.ts`** maps `StructuredQuery` to Freesound API params, fetches, and
   normalizes each hit to `Sample` `{ id, name, username, duration, license, previewUrl, tags[] }`.
3. Server responds `{ structuredQuery, reasoning, results: Sample[] }`. Cached in SQLite
   (`search_cache`, hashed key, short TTL); the search is logged to `searches`.

**Resilience:** any DeepSeek error → fall back to a literal keyword search built from the
raw prompt, with `reasoning` noting the fallback. Search never hard-fails.

**Sort options** (preserved from MVP): relevant (`score`), popular (`downloads` desc),
newest (`created` desc), **most obscure** (`downloads` asc — the signature feature).

---

## 4. Track upload + BPM/key — browser-side

The uploaded file **never leaves the device**. `audio/analyze.ts` uses Web Audio to
decode the file and `web-audio-beat-detector` to estimate BPM. The user **confirms/edits
BPM and picks the key** (honoring the MVP insight "let user confirm BPM"). The resulting
`seed = { bpm, key, mood? }` is passed into the next `/api/search` call.

**Trade-off (decided):** client-side keeps the server tiny and uploads private.
Server-side analysis (Python + librosa/essentia + file storage) is heavier and deferred.

---

## 5. Data — SQLite (better-sqlite3)

`schema.sql`, run by a tiny idempotent migration runner at boot:

- **`saved_samples`** — `id (pk), freesound_id, name, username, duration, license, preview_url, tags (json), source_prompt, created_at`
- **`searches`** — `id (pk), prompt, structured_query (json), result_count, created_at`
- **`search_cache`** — `query_hash (pk), response (json), created_at` (TTL-checked on read)

DB file path from env; gitignored.

---

## 6. API contract

| Method | Path | Body / Query | Response |
|---|---|---|---|
| `POST` | `/api/search` | `{ prompt, seed?, sort? }` | `{ structuredQuery, reasoning, results: Sample[] }` |
| `GET`  | `/api/library` | — | `SavedSample[]` |
| `POST` | `/api/library` | `Sample` (+ `sourcePrompt?`) | `SavedSample` |
| `DELETE` | `/api/library/:id` | — | `{ ok: true }` |
| `GET`  | `/api/health` | — | `{ ok: true }` |

All shapes live in `@simpler/shared` and are imported by both web and server.

---

## 7. UI — lean, minimal, pianos-inspired

Dark Mantine theme, **Outfit** font, teal `#1D9E75` accent, `motion` micro-animations.
One calm screen — no tab-switching:

- **SearchPrompt** — hero natural-language input; submit triggers smart search.
- **SeedBar** — optional "drop a track" affordance; shows detected/confirmed BPM + key chips that seed the prompt.
- **ResultsList / ResultRow** — inline play button, name, duration, **RightsBadge** (CC0/CC/PD), tags, save toggle.
- **ReasoningChip** — compact "why these results" line from DeepSeek.
- **Player** — single persistent mini-player (progress + seek), driven by Zustand.
- **LibraryDrawer** — saved samples, server-persisted.

Spectrum-analyzer restraint: generous spacing, monochrome dark surface, single accent, motion only on state changes.

---

## 8. Quality bar

- **TypeScript** throughout; `@simpler/shared` as the single source of types.
- **`zod`-validated env** in server (`env.ts`) — fail-fast at boot with a clear message.
- **ESLint + Prettier** at the workspace root.
- **`@tanstack/react-query`** for data fetching/caching; **Zustand** for player + library state (matches pianos).
- **vitest** unit tests: DeepSeek query-builder (mocked LLM — prompt→StructuredQuery shape + fallback path) and Freesound normalizer (mocked HTTP).
- **Secrets:** `DEEPSEEK_API_KEY` copied from `ants-lab/.env` into a **gitignored local `.env`** — never committed. `FREESOUND_API_KEY` likewise from env (no longer hardcoded as in the old DOCS).
- **README** with setup + `pnpm dev`; old `DOCS.md` folded/replaced.

### Env (`.env.example`)
```
# server
DEEPSEEK_API_KEY=
FREESOUND_API_KEY=
PORT=8787
SQLITE_PATH=./packages/server/data/simpler.sqlite
# web
VITE_API_URL=/api
```

---

## 9. Error handling

- Env missing → server refuses to start with an explicit message.
- DeepSeek failure → literal-keyword fallback (above); logged, surfaced in `reasoning`.
- Freesound non-200 → typed error returned; web shows an inline retry state.
- Client requests use `AbortController` to cancel superseded searches.

---

## 10. Execution plan (high level)

New branch `feat/reframe-monorepo`. Implementation fans out **subagents** — one per
package (`shared` → `server` → `web`) plus a final docs/tidy + verification pass —
coordinated through the implementation plan. Each package builds, lints, and (where
applicable) tests green before integration. Detailed steps in the implementation plan
that follows this spec.
