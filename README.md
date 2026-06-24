# Simpler

> Sampling, simplified. — AI-powered music sample discovery from multiple underground sources.

Describe the sound you need in plain English. DeepSeek builds a structured query and fans it out across **Freesound**, **Archive.org**, and **ccMixter** simultaneously. Preview results inline, sort by mood, drop a reference track to lock BPM + vibe, and save favorites to your library.

## Sources

| Source | What you find there |
|--------|-------------------|
| [Freesound](https://freesound.org) | CC-licensed recordings, field recordings, foley, vocals |
| [Internet Archive](https://archive.org) | Rare vinyl rips, netlabel dumps, 78rpm records, old radio, public domain audio |
| [ccMixter](https://ccmixter.org) | Producer-uploaded stems, loops, and raw samples under CC licenses |

## Structure

```
packages/
  shared/   — TypeScript types shared between server and web
  server/   — Hono API server: DeepSeek planner, source adapters, SQLite log
  web/      — React 19 + Vite + Mantine UI
```

## Local Setup

### 1. Prerequisites

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io) 9+ (`npm install -g pnpm`)

### 2. Clone and install

```bash
git clone <repo-url>
cd SimplerAi
pnpm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in your keys:

```env
# DeepSeek API key — query planner (https://platform.deepseek.com)
DEEPSEEK_API_KEY=sk-...

# Freesound API key — register at https://freesound.org/apiv2/apply/
FREESOUND_API_KEY=...

# Server port (default: 8787)
PORT=8787

# SQLite database path (default: local file, auto-created)
SQLITE_PATH=./packages/server/data/simpler.sqlite
```

> **Archive.org** and **ccMixter** are public APIs — no keys needed.

### 4. Run

```bash
pnpm dev
```

- Web UI: [http://localhost:5173](http://localhost:5173)
- API server: [http://localhost:8787](http://localhost:8787)

## Getting API Keys

### DeepSeek
1. Sign up at [platform.deepseek.com](https://platform.deepseek.com)
2. Go to API Keys → Create new key
3. Paste into `DEEPSEEK_API_KEY`

### Freesound
1. Create an account at [freesound.org](https://freesound.org)
2. Go to [freesound.org/apiv2/apply/](https://freesound.org/apiv2/apply/) → Apply for API access
3. After approval, copy your API key into `FREESOUND_API_KEY`

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start server (:8787) + web (:5173) with hot reload |
| `pnpm test` | Run unit tests across all packages |
| `pnpm build` | Build all packages for production |
| `pnpm lint` | Lint the workspace |

## How it works

1. You type a natural-language prompt ("dark female vocal, underground 70s vibe")
2. **DeepSeek** decomposes it into structured keywords, tags, and filters
3. **Three source adapters** fan out in parallel with `Promise.allSettled` — a failing source never kills the search
4. Results are merged and returned with source badges so you know where each sound came from
5. Drop a reference track to auto-detect BPM + mood and seed the next search
