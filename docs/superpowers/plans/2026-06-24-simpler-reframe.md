# Simpler Reframe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the flat React MVP into a professional pnpm monorepo with a lean React 19 + Mantine frontend and a minimal Hono + SQLite server that uses DeepSeek to turn natural language into structured Freesound queries.

**Architecture:** Three workspace packages — `@simpler/shared` (TS types), `@simpler/server` (Hono + better-sqlite3; proxies Freesound, calls DeepSeek, persists library/cache), `@simpler/web` (React 19 + Vite + Mantine). The browser analyzes uploaded tracks (BPM) and seeds the smart search; the server is the only thing that touches API keys and the DB.

**Tech Stack:** pnpm workspaces, TypeScript, Hono, @hono/node-server, better-sqlite3, zod, vitest, React 19, Vite, @mantine/core, @tanstack/react-query, Zustand, motion, web-audio-beat-detector.

## Global Constraints

- Node ≥ 20, pnpm ≥ 9. TypeScript everywhere; no `.jsx`/`.js` source in the reframed tree.
- Brand: name "Simpler", tagline "Sampling, simplified.", accent teal `#1D9E75`, font Outfit, dark theme.
- Secrets only via env: `DEEPSEEK_API_KEY`, `FREESOUND_API_KEY`. Never commit `.env` or `*.sqlite`. No hardcoded keys in source.
- DeepSeek: base URL `https://api.deepseek.com`, model `deepseek-chat`, OpenAI-compatible JSON output.
- All cross-package types come from `@simpler/shared` — never redefine them locally.
- Search must never hard-fail: DeepSeek errors fall back to literal keyword search.
- Sort values map to Freesound: relevant→`score`, popular→`downloads` desc, newest→`created` desc, obscure→`downloads` asc.

---

### Task 1: Monorepo scaffolding & legacy cleanup

**Files:**
- Create: `pnpm-workspace.yaml`, `package.json` (root), `tsconfig.base.json`, `.gitignore`, `.env.example`, `.prettierrc`, `eslint.config.js`
- Delete: legacy root `App.jsx`, `App.module.css`, `Player.jsx`, `Player.module.css`, `QuickTags.jsx`, `QuickTags.module.css`, `ResultRow.jsx`, `ResultRow.module.css`, `ResultsList.jsx`, `ResultsList.module.css`, `SearchBar.jsx`, `SearchBar.module.css`, `SortToolbar.jsx`, `SortToolbar.module.css`, `freesound.js`, `useSearch.js`, `usePlayer.js`, `useSavedSamples.js`, `main.jsx`, `index.css`, `index.html`, `vite.config.js`, `DOCS.md`, `package-lock.json`, `public/` (legacy), and the entire legacy `src/` (will be rebuilt under `packages/web`).

**Interfaces:**
- Produces: workspace root with `packages/*` globbing; root scripts `dev`, `build`, `lint`, `test`.

- [ ] **Step 1: Remove legacy files**

```bash
cd /Users/yoavgaulan/Development/SimplerAi
git rm -r App.jsx App.module.css Player.jsx Player.module.css QuickTags.jsx \
  QuickTags.module.css ResultRow.jsx ResultRow.module.css ResultsList.jsx \
  ResultsList.module.css SearchBar.jsx SearchBar.module.css SortToolbar.jsx \
  SortToolbar.module.css freesound.js useSearch.js usePlayer.js useSavedSamples.js \
  main.jsx index.css index.html vite.config.js DOCS.md package.json package-lock.json \
  public src
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 3: Create root `package.json`**

```json
{
  "name": "simpler",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20", "pnpm": ">=9" },
  "scripts": {
    "dev": "pnpm --parallel --filter @simpler/server --filter @simpler/web dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.20.0",
    "@typescript-eslint/parser": "^8.20.0",
    "eslint": "^9.18.0",
    "prettier": "^3.4.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  }
}
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules
dist
.env
.env.local
*.sqlite
*.sqlite-*
packages/server/data
.DS_Store
```

- [ ] **Step 6: Create `.env.example`**

```
# --- server ---
DEEPSEEK_API_KEY=
FREESOUND_API_KEY=
PORT=8787
SQLITE_PATH=./packages/server/data/simpler.sqlite
# --- web ---
VITE_API_URL=/api
```

- [ ] **Step 7: Create `.prettierrc`**

```json
{ "semi": false, "singleQuote": true, "printWidth": 100, "trailingComma": "all" }
```

- [ ] **Step 8: Create `eslint.config.js`**

```js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ['**/dist/**', '**/node_modules/**'] },
]
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm monorepo, remove legacy flat files"
```

---

### Task 2: `@simpler/shared` — shared types

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`

**Interfaces:**
- Produces: types `Sample`, `Seed`, `SortKey`, `StructuredQuery`, `SearchRequest`, `SearchResponse`, `SavedSample`; const `SORT_KEYS`.

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@simpler/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": { ".": "./src/index.ts" }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

- [ ] **Step 3: Create `packages/shared/src/index.ts`**

```ts
export const SORT_KEYS = ['relevant', 'popular', 'newest', 'obscure'] as const
export type SortKey = (typeof SORT_KEYS)[number]

export interface Sample {
  id: string
  name: string
  username: string
  duration: number
  license: string
  previewUrl: string | null
  tags: string[]
}

export interface Seed {
  bpm?: number
  key?: string
  mood?: string
}

export interface StructuredQuery {
  keywords: string
  tags: string[]
  filters: { license?: string; minDuration?: number; maxDuration?: number }
  sort: SortKey
  reasoning: string
}

export interface SearchRequest {
  prompt: string
  seed?: Seed
  sort?: SortKey
}

export interface SearchResponse {
  structuredQuery: StructuredQuery
  reasoning: string
  results: Sample[]
}

export interface SavedSample extends Sample {
  savedId: number
  sourcePrompt: string | null
  createdAt: string
}
```

- [ ] **Step 4: Typecheck**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared && git commit -m "feat(shared): add cross-package types"
```

---

### Task 3: `@simpler/server` — env validation & SQLite layer

**Files:**
- Create: `packages/server/package.json`, `packages/server/tsconfig.json`, `packages/server/src/env.ts`, `packages/server/src/db/schema.sql`, `packages/server/src/db/index.ts`
- Test: `packages/server/src/db/index.test.ts`

**Interfaces:**
- Produces: `env` (validated object: `DEEPSEEK_API_KEY`, `FREESOUND_API_KEY`, `PORT`, `SQLITE_PATH`); `getDb()` returning a `better-sqlite3` Database with migrations applied; helpers `saveSample`, `listSaved`, `deleteSaved`, `logSearch`, `readCache`, `writeCache`.

- [ ] **Step 1: Create `packages/server/package.json`**

```json
{
  "name": "@simpler/server",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.0",
    "@simpler/shared": "workspace:*",
    "better-sqlite3": "^11.8.0",
    "hono": "^4.6.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `packages/server/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "types": ["node"] },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/server/src/env.ts`**

```ts
import { z } from 'zod'

const schema = z.object({
  DEEPSEEK_API_KEY: z.string().min(1, 'DEEPSEEK_API_KEY is required'),
  FREESOUND_API_KEY: z.string().min(1, 'FREESOUND_API_KEY is required'),
  PORT: z.coerce.number().default(8787),
  SQLITE_PATH: z.string().default('./packages/server/data/simpler.sqlite'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('[simpler] Invalid environment:\n' + parsed.error.issues.map((i) => ` - ${i.message}`).join('\n'))
  process.exit(1)
}

export const env = parsed.data
```

- [ ] **Step 4: Create `packages/server/src/db/schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS saved_samples (
  saved_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  freesound_id TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  username     TEXT NOT NULL,
  duration     REAL NOT NULL,
  license      TEXT NOT NULL,
  preview_url  TEXT,
  tags         TEXT NOT NULL DEFAULT '[]',
  source_prompt TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS searches (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt          TEXT NOT NULL,
  structured_query TEXT NOT NULL,
  result_count    INTEGER NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS search_cache (
  query_hash TEXT PRIMARY KEY,
  response   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- [ ] **Step 5: Write the failing test `packages/server/src/db/index.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createDb, saveSample, listSaved, deleteSaved, readCache, writeCache } from './index'
import type Database from 'better-sqlite3'

let db: Database.Database
const sample = {
  id: 'fs-1', name: 'shout', username: 'u', duration: 2.5,
  license: 'CC0', previewUrl: 'http://x/p.mp3', tags: ['vocal', 'shout'],
}

beforeEach(() => { db = createDb(':memory:') })

describe('db', () => {
  it('saves, lists, and deletes a sample', () => {
    const saved = saveSample(db, sample, 'dark vocal')
    expect(saved.savedId).toBeGreaterThan(0)
    expect(listSaved(db)).toHaveLength(1)
    expect(listSaved(db)[0].tags).toEqual(['vocal', 'shout'])
    deleteSaved(db, saved.savedId)
    expect(listSaved(db)).toHaveLength(0)
  })

  it('caches and reads back a response', () => {
    writeCache(db, 'hash1', { ok: true })
    expect(readCache(db, 'hash1')).toEqual({ ok: true })
    expect(readCache(db, 'missing')).toBeNull()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd packages/server && npx vitest run src/db/index.test.ts`
Expected: FAIL — `createDb` not exported.

- [ ] **Step 7: Create `packages/server/src/db/index.ts`**

```ts
import Database from 'better-sqlite3'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Sample, SavedSample, StructuredQuery } from '@simpler/shared'

const here = dirname(fileURLToPath(import.meta.url))
const schema = readFileSync(join(here, 'schema.sql'), 'utf8')

export function createDb(path: string): Database.Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.exec(schema)
  return db
}

export function saveSample(db: Database.Database, s: Sample, sourcePrompt: string | null): SavedSample {
  const stmt = db.prepare(
    `INSERT INTO saved_samples (freesound_id, name, username, duration, license, preview_url, tags, source_prompt)
     VALUES (@id, @name, @username, @duration, @license, @previewUrl, @tags, @sourcePrompt)
     ON CONFLICT(freesound_id) DO UPDATE SET source_prompt=excluded.source_prompt
     RETURNING saved_id as savedId, created_at as createdAt`,
  )
  const row = stmt.get({ ...s, tags: JSON.stringify(s.tags), sourcePrompt }) as { savedId: number; createdAt: string }
  return { ...s, savedId: row.savedId, sourcePrompt, createdAt: row.createdAt }
}

export function listSaved(db: Database.Database): SavedSample[] {
  const rows = db.prepare(`SELECT * FROM saved_samples ORDER BY created_at DESC`).all() as Record<string, unknown>[]
  return rows.map((r) => ({
    savedId: r.saved_id as number,
    id: r.freesound_id as string,
    name: r.name as string,
    username: r.username as string,
    duration: r.duration as number,
    license: r.license as string,
    previewUrl: (r.preview_url as string) ?? null,
    tags: JSON.parse(r.tags as string),
    sourcePrompt: (r.source_prompt as string) ?? null,
    createdAt: r.created_at as string,
  }))
}

export function deleteSaved(db: Database.Database, savedId: number): void {
  db.prepare(`DELETE FROM saved_samples WHERE saved_id = ?`).run(savedId)
}

export function logSearch(db: Database.Database, prompt: string, q: StructuredQuery, count: number): void {
  db.prepare(`INSERT INTO searches (prompt, structured_query, result_count) VALUES (?, ?, ?)`).run(
    prompt, JSON.stringify(q), count,
  )
}

const CACHE_TTL_MS = 1000 * 60 * 30
export function readCache(db: Database.Database, hash: string): unknown | null {
  const row = db.prepare(`SELECT response, created_at FROM search_cache WHERE query_hash = ?`).get(hash) as
    | { response: string; created_at: string }
    | undefined
  if (!row) return null
  if (Date.now() - new Date(row.created_at + 'Z').getTime() > CACHE_TTL_MS) return null
  return JSON.parse(row.response)
}

export function writeCache(db: Database.Database, hash: string, response: unknown): void {
  db.prepare(
    `INSERT INTO search_cache (query_hash, response) VALUES (?, ?)
     ON CONFLICT(query_hash) DO UPDATE SET response=excluded.response, created_at=datetime('now')`,
  ).run(hash, JSON.stringify(response))
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd packages/server && npx vitest run src/db/index.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add packages/server && git commit -m "feat(server): env validation + SQLite layer with tests"
```

---

### Task 4: `@simpler/server` — Freesound service

**Files:**
- Create: `packages/server/src/services/freesound.ts`
- Test: `packages/server/src/services/freesound.test.ts`

**Interfaces:**
- Consumes: `StructuredQuery`, `Sample`, `SortKey` from `@simpler/shared`.
- Produces: `buildFreesoundParams(q: StructuredQuery): URLSearchParams`; `normalizeHit(hit: unknown): Sample`; `searchFreesound(q: StructuredQuery, apiKey: string, fetchImpl?): Promise<Sample[]>`.

- [ ] **Step 1: Write the failing test `packages/server/src/services/freesound.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { buildFreesoundParams, normalizeHit, searchFreesound } from './freesound'
import type { StructuredQuery } from '@simpler/shared'

const q: StructuredQuery = {
  keywords: 'vocal shout', tags: ['aggressive'], filters: { maxDuration: 5 },
  sort: 'obscure', reasoning: 'x',
}

describe('freesound', () => {
  it('maps sort=obscure to ascending downloads and builds filter', () => {
    const p = buildFreesoundParams(q)
    expect(p.get('sort')).toBe('downloads_asc')
    expect(p.get('query')).toBe('vocal shout')
    expect(p.get('filter')).toContain('duration:[* TO 5]')
  })

  it('normalizes a Freesound hit into a Sample', () => {
    const s = normalizeHit({
      id: 42, name: 'shout', username: 'bob', duration: 2.1,
      license: 'http://creativecommons.org/publicdomain/zero/1.0/',
      previews: { 'preview-hq-mp3': 'http://x/p.mp3' }, tags: ['vocal'],
    })
    expect(s).toEqual({
      id: '42', name: 'shout', username: 'bob', duration: 2.1,
      license: 'http://creativecommons.org/publicdomain/zero/1.0/',
      previewUrl: 'http://x/p.mp3', tags: ['vocal'],
    })
  })

  it('searches via injected fetch and returns normalized samples', async () => {
    const fakeFetch = async () =>
      new Response(JSON.stringify({ results: [{ id: 1, name: 'a', username: 'u', duration: 1, license: 'CC0', previews: {}, tags: [] }] }), { status: 200 })
    const out = await searchFreesound(q, 'key', fakeFetch as unknown as typeof fetch)
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/server && npx vitest run src/services/freesound.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `packages/server/src/services/freesound.ts`**

```ts
import type { Sample, SortKey, StructuredQuery } from '@simpler/shared'

const SORT_MAP: Record<SortKey, string> = {
  relevant: 'score',
  popular: 'downloads_desc',
  newest: 'created_desc',
  obscure: 'downloads_asc',
}

const FIELDS = 'id,name,username,duration,license,previews,tags'

export function buildFreesoundParams(q: StructuredQuery): URLSearchParams {
  const query = [q.keywords, ...q.tags].filter(Boolean).join(' ')
  const filters: string[] = []
  if (q.filters.minDuration != null) filters.push(`duration:[${q.filters.minDuration} TO *]`)
  if (q.filters.maxDuration != null) filters.push(`duration:[* TO ${q.filters.maxDuration}]`)
  if (q.filters.license) filters.push(`license:"${q.filters.license}"`)
  const params = new URLSearchParams({ query, sort: SORT_MAP[q.sort], fields: FIELDS, page_size: '20' })
  if (filters.length) params.set('filter', filters.join(' '))
  return params
}

export function normalizeHit(hit: unknown): Sample {
  const h = hit as Record<string, any>
  return {
    id: String(h.id),
    name: h.name ?? '',
    username: h.username ?? '',
    duration: h.duration ?? 0,
    license: h.license ?? '',
    previewUrl: h.previews?.['preview-hq-mp3'] ?? h.previews?.['preview-lq-mp3'] ?? null,
    tags: Array.isArray(h.tags) ? h.tags : [],
  }
}

export async function searchFreesound(
  q: StructuredQuery,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Sample[]> {
  const params = buildFreesoundParams(q)
  const res = await fetchImpl(`https://freesound.org/apiv2/search/text/?${params}`, {
    headers: { Authorization: `Token ${apiKey}` },
  })
  if (!res.ok) throw new Error(`Freesound error: ${res.status}`)
  const data = (await res.json()) as { results?: unknown[] }
  return (data.results ?? []).map(normalizeHit)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/server && npx vitest run src/services/freesound.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/server && git commit -m "feat(server): Freesound query builder + normalizer with tests"
```

---

### Task 5: `@simpler/server` — DeepSeek query builder

**Files:**
- Create: `packages/server/src/services/deepseek.ts`
- Test: `packages/server/src/services/deepseek.test.ts`

**Interfaces:**
- Consumes: `SearchRequest`, `StructuredQuery`, `SortKey` from `@simpler/shared`.
- Produces: `fallbackQuery(req: SearchRequest): StructuredQuery`; `buildQuery(req: SearchRequest, apiKey: string, fetchImpl?): Promise<StructuredQuery>` (returns `fallbackQuery` on any DeepSeek error).

- [ ] **Step 1: Write the failing test `packages/server/src/services/deepseek.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { fallbackQuery, buildQuery } from './deepseek'

describe('deepseek', () => {
  it('fallback turns prompt + seed into a literal query', () => {
    const q = fallbackQuery({ prompt: 'dark vocal', seed: { bpm: 140, key: 'Am' }, sort: 'obscure' })
    expect(q.keywords).toContain('dark vocal')
    expect(q.sort).toBe('obscure')
    expect(q.reasoning).toMatch(/fallback/i)
  })

  it('parses a valid DeepSeek JSON response into StructuredQuery', async () => {
    const payload = {
      choices: [{ message: { content: JSON.stringify({
        keywords: 'vocal shout', tags: ['aggressive'], filters: { maxDuration: 5 },
        sort: 'obscure', reasoning: 'matched aggressive trap vibe',
      }) } }],
    }
    const fakeFetch = async () => new Response(JSON.stringify(payload), { status: 200 })
    const q = await buildQuery({ prompt: 'aggressive trap vocal' }, 'key', fakeFetch as unknown as typeof fetch)
    expect(q.tags).toEqual(['aggressive'])
    expect(q.reasoning).toBe('matched aggressive trap vibe')
  })

  it('falls back when DeepSeek errors', async () => {
    const fakeFetch = async () => new Response('boom', { status: 500 })
    const q = await buildQuery({ prompt: 'soft pad' }, 'key', fakeFetch as unknown as typeof fetch)
    expect(q.keywords).toContain('soft pad')
    expect(q.reasoning).toMatch(/fallback/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/server && npx vitest run src/services/deepseek.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `packages/server/src/services/deepseek.ts`**

```ts
import { SORT_KEYS, type SearchRequest, type SortKey, type StructuredQuery } from '@simpler/shared'

const SYSTEM = `You are a search-query planner for a vocal-sample discovery app backed by the Freesound API.
Given a producer's natural-language request (and optional detected BPM/key/mood seed), respond with ONLY a JSON object:
{"keywords": string, "tags": string[], "filters": {"license"?: string, "minDuration"?: number, "maxDuration"?: number}, "sort": "relevant"|"popular"|"newest"|"obscure", "reasoning": string}
Keep keywords short and concrete. Prefer vocal-related tags. reasoning is one short sentence.`

export function fallbackQuery(req: SearchRequest): StructuredQuery {
  const seedBits = [req.seed?.mood, req.seed?.key && `key ${req.seed.key}`].filter(Boolean).join(' ')
  return {
    keywords: [req.prompt, seedBits].filter(Boolean).join(' ').trim(),
    tags: [],
    filters: {},
    sort: req.sort ?? 'relevant',
    reasoning: 'Literal keyword search (DeepSeek fallback).',
  }
}

function coerce(parsed: Record<string, any>, req: SearchRequest): StructuredQuery {
  const sort: SortKey = SORT_KEYS.includes(parsed.sort) ? parsed.sort : req.sort ?? 'relevant'
  return {
    keywords: String(parsed.keywords ?? req.prompt),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
    filters: typeof parsed.filters === 'object' && parsed.filters ? parsed.filters : {},
    sort,
    reasoning: String(parsed.reasoning ?? 'Planned query.'),
  }
}

export async function buildQuery(
  req: SearchRequest,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<StructuredQuery> {
  try {
    const seedLine = req.seed ? `\nDetected seed: ${JSON.stringify(req.seed)}` : ''
    const res = await fetchImpl('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Request: ${req.prompt}${seedLine}\nPreferred sort: ${req.sort ?? 'relevant'}` },
        ],
      }),
    })
    if (!res.ok) throw new Error(`DeepSeek error: ${res.status}`)
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('DeepSeek empty response')
    return coerce(JSON.parse(content), req)
  } catch (err) {
    console.warn('[simpler] DeepSeek fallback:', (err as Error).message)
    return fallbackQuery(req)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/server && npx vitest run src/services/deepseek.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/server && git commit -m "feat(server): DeepSeek query builder with literal fallback + tests"
```

---

### Task 6: `@simpler/server` — routes & app bootstrap

**Files:**
- Create: `packages/server/src/routes/search.ts`, `packages/server/src/routes/library.ts`, `packages/server/src/index.ts`

**Interfaces:**
- Consumes: `env`, db helpers (Task 3), `buildQuery` (Task 5), `searchFreesound` (Task 4), shared types.
- Produces: HTTP API per the spec contract; listening on `env.PORT`.

- [ ] **Step 1: Create `packages/server/src/routes/search.ts`**

```ts
import { Hono } from 'hono'
import type Database from 'better-sqlite3'
import type { SearchRequest, SearchResponse } from '@simpler/shared'
import { env } from '../env'
import { buildQuery } from '../services/deepseek'
import { searchFreesound } from '../services/freesound'
import { logSearch, readCache, writeCache } from '../db/index'

export function searchRoute(db: Database.Database) {
  const app = new Hono()
  app.post('/', async (c) => {
    const req = (await c.req.json()) as SearchRequest
    if (!req.prompt?.trim()) return c.json({ error: 'prompt is required' }, 400)

    const hash = JSON.stringify({ p: req.prompt, s: req.seed, o: req.sort })
    const cached = readCache(db, hash) as SearchResponse | null
    if (cached) return c.json(cached)

    const structuredQuery = await buildQuery(req, env.DEEPSEEK_API_KEY)
    const results = await searchFreesound(structuredQuery, env.FREESOUND_API_KEY)
    const payload: SearchResponse = { structuredQuery, reasoning: structuredQuery.reasoning, results }

    logSearch(db, req.prompt, structuredQuery, results.length)
    writeCache(db, hash, payload)
    return c.json(payload)
  })
  return app
}
```

- [ ] **Step 2: Create `packages/server/src/routes/library.ts`**

```ts
import { Hono } from 'hono'
import type Database from 'better-sqlite3'
import type { Sample } from '@simpler/shared'
import { saveSample, listSaved, deleteSaved } from '../db/index'

export function libraryRoute(db: Database.Database) {
  const app = new Hono()
  app.get('/', (c) => c.json(listSaved(db)))
  app.post('/', async (c) => {
    const body = (await c.req.json()) as Sample & { sourcePrompt?: string }
    const { sourcePrompt, ...sample } = body
    return c.json(saveSample(db, sample, sourcePrompt ?? null))
  })
  app.delete('/:id', (c) => {
    deleteSaved(db, Number(c.req.param('id')))
    return c.json({ ok: true })
  })
  return app
}
```

- [ ] **Step 3: Create `packages/server/src/index.ts`**

```ts
import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { env } from './env'
import { createDb } from './db/index'
import { searchRoute } from './routes/search'
import { libraryRoute } from './routes/library'

const db = createDb(env.SQLITE_PATH)
const app = new Hono()
app.use('/api/*', cors())
app.get('/api/health', (c) => c.json({ ok: true }))
app.route('/api/search', searchRoute(db))
app.route('/api/library', libraryRoute(db))

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[simpler] server on http://localhost:${info.port}`)
})
```

- [ ] **Step 4: Add `dotenv` dependency**

Run: `cd packages/server && pnpm add dotenv`
Expected: `dotenv` added to dependencies.

- [ ] **Step 5: Build to verify the server compiles**

Run: `cd packages/server && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Smoke-test health endpoint**

Create a throwaway `.env` at repo root with the real keys, then:
Run: `pnpm --filter @simpler/server dev` (in one shell) and `curl -s localhost:8787/api/health`
Expected: `{"ok":true}`. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add packages/server && git commit -m "feat(server): search + library routes and Hono bootstrap"
```

---

### Task 7: `@simpler/web` — scaffold, theme, API client, store

**Files:**
- Create: `packages/web/package.json`, `packages/web/tsconfig.json`, `packages/web/vite.config.ts`, `packages/web/index.html`, `packages/web/src/main.tsx`, `packages/web/src/theme.ts`, `packages/web/src/lib/api.ts`, `packages/web/src/store.ts`

**Interfaces:**
- Consumes: shared types; server API.
- Produces: Vite app booting Mantine + react-query; `api` client (`search`, `listLibrary`, `saveSample`, `deleteSaved`); Zustand `useStore` (player + library state).

- [ ] **Step 1: Create `packages/web/package.json`**

```json
{
  "name": "@simpler/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@mantine/core": "^8.0.0",
    "@mantine/hooks": "^8.0.0",
    "@simpler/shared": "workspace:*",
    "@tabler/icons-react": "^3.37.0",
    "@tanstack/react-query": "^5.62.0",
    "motion": "^12.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "web-audio-beat-detector": "^8.2.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "postcss": "^8.5.0",
    "postcss-preset-mantine": "^1.17.0",
    "postcss-simple-vars": "^7.0.1",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `packages/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "jsx": "react-jsx", "types": ["vite/client"], "noEmit": true },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/web/postcss.config.cjs`**

```js
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': { variables: { 'mantine-breakpoint-sm': '48em' } },
  },
}
```

- [ ] **Step 4: Create `packages/web/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8787' } },
})
```

- [ ] **Step 5: Create `packages/web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <title>Simpler — Sampling, simplified.</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `packages/web/src/theme.ts`**

```ts
import { createTheme, type MantineColorsTuple } from '@mantine/core'

const teal: MantineColorsTuple = [
  '#e3fbf1', '#c2f0dd', '#9ee6c8', '#78dcb2', '#57d3a0',
  '#1D9E75', '#198a67', '#147157', '#0e5944', '#074031',
]

export const theme = createTheme({
  primaryColor: 'teal',
  primaryShade: 5,
  fontFamily: 'Outfit, system-ui, sans-serif',
  defaultRadius: 'md',
  colors: { teal },
})
```

- [ ] **Step 7: Create `packages/web/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@mantine/core/styles.css'
import { theme } from './theme'
import { App } from './App'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
)
```

- [ ] **Step 8: Create `packages/web/src/lib/api.ts`**

```ts
import type { SearchRequest, SearchResponse, SavedSample, Sample } from '@simpler/shared'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}

export const api = {
  search: (req: SearchRequest, signal?: AbortSignal) =>
    fetch(`${BASE}/search`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req), signal,
    }).then(json<SearchResponse>),
  listLibrary: () => fetch(`${BASE}/library`).then(json<SavedSample[]>),
  saveSample: (s: Sample, sourcePrompt?: string) =>
    fetch(`${BASE}/library`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...s, sourcePrompt }),
    }).then(json<SavedSample>),
  deleteSaved: (savedId: number) =>
    fetch(`${BASE}/library/${savedId}`, { method: 'DELETE' }).then(json<{ ok: true }>),
}
```

- [ ] **Step 9: Create `packages/web/src/store.ts`**

```ts
import { create } from 'zustand'
import type { Seed } from '@simpler/shared'

interface State {
  playingId: string | null
  seed: Seed | null
  setPlaying: (id: string | null) => void
  setSeed: (seed: Seed | null) => void
}

export const useStore = create<State>((set) => ({
  playingId: null,
  seed: null,
  setPlaying: (playingId) => set({ playingId }),
  setSeed: (seed) => set({ seed }),
}))
```

- [ ] **Step 10: Install deps and typecheck**

Run: `pnpm install && cd packages/web && npx tsc --noEmit` (App.tsx not yet present — expect the only error to be the missing `./App` import; that is resolved in Task 9)
Expected: install succeeds; the sole remaining type error references `./App`.

- [ ] **Step 11: Commit**

```bash
git add packages/web pnpm-lock.yaml && git commit -m "feat(web): Vite + Mantine scaffold, theme, api client, store"
```

---

### Task 8: `@simpler/web` — browser audio analysis

**Files:**
- Create: `packages/web/src/audio/analyze.ts`
- Test: `packages/web/src/audio/analyze.test.ts`

**Interfaces:**
- Produces: `detectBpm(file: File, ctx?: AudioContext): Promise<number>`; `seedToPrompt(seed: Seed): string`.

- [ ] **Step 1: Write the failing test `packages/web/src/audio/analyze.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { seedToPrompt } from './analyze'

describe('seedToPrompt', () => {
  it('renders bpm/key/mood into a compact phrase', () => {
    expect(seedToPrompt({ bpm: 140, key: 'Am', mood: 'dark' })).toBe('dark, around 140 bpm, key Am')
  })
  it('omits missing fields', () => {
    expect(seedToPrompt({ bpm: 90 })).toBe('around 90 bpm')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && npx vitest run src/audio/analyze.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `packages/web/src/audio/analyze.ts`**

```ts
import { analyze } from 'web-audio-beat-detector'
import type { Seed } from '@simpler/shared'

export async function detectBpm(file: File, ctx: AudioContext = new AudioContext()): Promise<number> {
  const buffer = await ctx.decodeAudioData(await file.arrayBuffer())
  const { bpm } = await analyze(buffer)
  return Math.round(bpm)
}

export function seedToPrompt(seed: Seed): string {
  return [seed.mood, seed.bpm && `around ${seed.bpm} bpm`, seed.key && `key ${seed.key}`]
    .filter(Boolean)
    .join(', ')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && npx vitest run src/audio/analyze.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web && git commit -m "feat(web): browser BPM detection + seed phrasing with tests"
```

---

### Task 9: `@simpler/web` — components & App wiring

**Files:**
- Create: `packages/web/src/lib/license.ts`, `packages/web/src/components/RightsBadge.tsx`, `packages/web/src/components/SearchPrompt.tsx`, `packages/web/src/components/SeedBar.tsx`, `packages/web/src/components/ResultRow.tsx`, `packages/web/src/components/ResultsList.tsx`, `packages/web/src/components/Player.tsx`, `packages/web/src/components/LibraryDrawer.tsx`, `packages/web/src/App.tsx`, `packages/web/src/App.module.css`

**Interfaces:**
- Consumes: `api`, `useStore`, `detectBpm`/`seedToPrompt`, shared types, Mantine.
- Produces: `App` (default export `{ App }`) — full single-screen UI.

- [ ] **Step 1: Create `packages/web/src/lib/license.ts`**

```ts
export function licenseBadge(license = ''): { label: string; color: string } {
  const l = license.toLowerCase()
  if (l.includes('publicdomain') || l.includes('zero') || l.includes('cc0'))
    return { label: 'CC0', color: 'teal' }
  if (l.includes('by')) return { label: 'CC BY', color: 'cyan' }
  return { label: 'CC', color: 'gray' }
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
```

- [ ] **Step 2: Create `packages/web/src/components/RightsBadge.tsx`**

```tsx
import { Badge } from '@mantine/core'
import { licenseBadge } from '../lib/license'

export function RightsBadge({ license }: { license: string }) {
  const { label, color } = licenseBadge(license)
  return <Badge color={color} variant="light" size="sm">{label}</Badge>
}
```

- [ ] **Step 3: Create `packages/web/src/components/SearchPrompt.tsx`**

```tsx
import { useState } from 'react'
import { TextInput, ActionIcon, Group } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'

export function SearchPrompt({ onSearch, loading }: { onSearch: (prompt: string) => void; loading: boolean }) {
  const [value, setValue] = useState('dark aggressive trap vocal around 140 bpm')
  return (
    <Group gap="xs" wrap="nowrap">
      <TextInput
        size="lg" radius="md" flex={1} value={value}
        placeholder="Describe the sample you're hunting for…"
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch(value)}
      />
      <ActionIcon size={50} radius="md" loading={loading} onClick={() => onSearch(value)} aria-label="Search">
        <IconSearch size={22} />
      </ActionIcon>
    </Group>
  )
}
```

- [ ] **Step 4: Create `packages/web/src/components/SeedBar.tsx`**

```tsx
import { useRef, useState } from 'react'
import { Group, Button, Badge, NumberInput, TextInput, Loader } from '@mantine/core'
import { IconUpload } from '@tabler/icons-react'
import { detectBpm } from '../audio/analyze'
import { useStore } from '../store'

export function SeedBar() {
  const { seed, setSeed } = useStore()
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function onFile(file: File) {
    setBusy(true)
    try {
      const bpm = await detectBpm(file)
      setSeed({ ...seed, bpm })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Group gap="sm">
      <input
        ref={inputRef} type="file" accept="audio/*" hidden
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <Button
        variant="default" leftSection={busy ? <Loader size={14} /> : <IconUpload size={16} />}
        onClick={() => inputRef.current?.click()}
      >
        Seed from a track
      </Button>
      {seed?.bpm != null && (
        <>
          <NumberInput
            size="xs" w={110} label={undefined} value={seed.bpm} suffix=" bpm"
            onChange={(v) => setSeed({ ...seed, bpm: Number(v) })}
          />
          <TextInput
            size="xs" w={90} placeholder="key" value={seed.key ?? ''}
            onChange={(e) => setSeed({ ...seed, key: e.currentTarget.value })}
          />
          <Badge variant="dot" color="teal">seeded</Badge>
        </>
      )}
    </Group>
  )
}
```

- [ ] **Step 5: Create `packages/web/src/components/ResultRow.tsx`**

```tsx
import { Group, ActionIcon, Text, Stack } from '@mantine/core'
import { IconPlayerPlay, IconPlayerPause, IconHeart, IconHeartFilled } from '@tabler/icons-react'
import type { Sample } from '@simpler/shared'
import { RightsBadge } from './RightsBadge'
import { formatDuration } from '../lib/license'

interface Props {
  sample: Sample
  playing: boolean
  saved: boolean
  onPlay: () => void
  onSave: () => void
}

export function ResultRow({ sample, playing, saved, onPlay, onSave }: Props) {
  return (
    <Group justify="space-between" wrap="nowrap" py="xs">
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <ActionIcon variant="light" radius="xl" onClick={onPlay} aria-label="Play">
          {playing ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}
        </ActionIcon>
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text size="sm" fw={500} truncate>{sample.name}</Text>
          <Text size="xs" c="dimmed">{sample.username} · {formatDuration(sample.duration)}</Text>
        </Stack>
      </Group>
      <Group gap="xs" wrap="nowrap">
        <RightsBadge license={sample.license} />
        <ActionIcon variant="subtle" color={saved ? 'teal' : 'gray'} onClick={onSave} aria-label="Save">
          {saved ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
        </ActionIcon>
      </Group>
    </Group>
  )
}
```

- [ ] **Step 6: Create `packages/web/src/components/ResultsList.tsx`**

```tsx
import { Stack, Divider, Text, Center, Loader } from '@mantine/core'
import type { Sample, SavedSample } from '@simpler/shared'
import { ResultRow } from './ResultRow'

interface Props {
  results: Sample[]
  loading: boolean
  playingId: string | null
  saved: SavedSample[]
  onPlay: (s: Sample) => void
  onSave: (s: Sample) => void
}

export function ResultsList({ results, loading, playingId, saved, onPlay, onSave }: Props) {
  if (loading) return <Center py="xl"><Loader color="teal" /></Center>
  if (!results.length) return <Center py="xl"><Text c="dimmed">No samples yet — describe what you need.</Text></Center>
  const savedIds = new Set(saved.map((s) => s.id))
  return (
    <Stack gap={0}>
      {results.map((s, i) => (
        <div key={s.id}>
          {i > 0 && <Divider opacity={0.4} />}
          <ResultRow
            sample={s} playing={playingId === s.id} saved={savedIds.has(s.id)}
            onPlay={() => onPlay(s)} onSave={() => onSave(s)}
          />
        </div>
      ))}
    </Stack>
  )
}
```

- [ ] **Step 7: Create `packages/web/src/components/Player.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import type { Sample } from '@simpler/shared'

export function Player({ results }: { results: Sample[] }) {
  const { playingId, setPlaying } = useStore()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const sample = results.find((s) => s.id === playingId)
    if (!audioRef.current) return
    if (sample?.previewUrl) {
      audioRef.current.src = sample.previewUrl
      void audioRef.current.play()
    } else {
      audioRef.current.pause()
    }
  }, [playingId, results])

  return <audio ref={audioRef} onEnded={() => setPlaying(null)} />
}
```

- [ ] **Step 8: Create `packages/web/src/components/LibraryDrawer.tsx`**

```tsx
import { Drawer, Stack, Text, Group, ActionIcon, ScrollArea } from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import type { SavedSample } from '@simpler/shared'
import { RightsBadge } from './RightsBadge'

interface Props {
  opened: boolean
  onClose: () => void
  saved: SavedSample[]
  onRemove: (savedId: number) => void
}

export function LibraryDrawer({ opened, onClose, saved, onRemove }: Props) {
  return (
    <Drawer opened={opened} onClose={onClose} title="Your library" position="right">
      <ScrollArea h="100%">
        <Stack gap="sm">
          {saved.length === 0 && <Text c="dimmed" size="sm">Nothing saved yet.</Text>}
          {saved.map((s) => (
            <Group key={s.savedId} justify="space-between" wrap="nowrap">
              <Text size="sm" truncate>{s.name}</Text>
              <Group gap="xs" wrap="nowrap">
                <RightsBadge license={s.license} />
                <ActionIcon variant="subtle" color="red" onClick={() => onRemove(s.savedId)} aria-label="Remove">
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Group>
          ))}
        </Stack>
      </ScrollArea>
    </Drawer>
  )
}
```

- [ ] **Step 9: Create `packages/web/src/App.module.css`**

```css
.shell {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 20px 120px;
}
.logo { font-weight: 700; letter-spacing: -0.02em; }
.accent { color: var(--mantine-color-teal-5); }
.reasoning {
  border-left: 2px solid var(--mantine-color-teal-7);
  padding-left: 12px;
}
```

- [ ] **Step 10: Create `packages/web/src/App.tsx`**

```tsx
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Group, Title, Text, Stack, Button, Paper, SegmentedControl, Box } from '@mantine/core'
import { IconHeart } from '@tabler/icons-react'
import { SORT_KEYS, type Sample, type SortKey, type SearchResponse } from '@simpler/shared'
import { api } from './lib/api'
import { useStore } from './store'
import { seedToPrompt } from './audio/analyze'
import { SearchPrompt } from './components/SearchPrompt'
import { SeedBar } from './components/SeedBar'
import { ResultsList } from './components/ResultsList'
import { Player } from './components/Player'
import { LibraryDrawer } from './components/LibraryDrawer'
import styles from './App.module.css'

const SORT_LABELS: Record<SortKey, string> = {
  relevant: 'Relevant', popular: 'Popular', newest: 'Newest', obscure: 'Most obscure',
}

export function App() {
  const qc = useQueryClient()
  const { seed, setPlaying, playingId } = useStore()
  const [sort, setSort] = useState<SortKey>('relevant')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [data, setData] = useState<SearchResponse | null>(null)

  const library = useQuery({ queryKey: ['library'], queryFn: api.listLibrary })

  const searchMut = useMutation({
    mutationFn: (prompt: string) => api.search({ prompt, seed: seed ?? undefined, sort }),
    onSuccess: setData,
  })
  const saveMut = useMutation({
    mutationFn: (s: Sample) => api.saveSample(s, searchMut.variables ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['library'] }),
  })
  const removeMut = useMutation({
    mutationFn: (id: number) => api.deleteSaved(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['library'] }),
  })

  const results = data?.results ?? []

  return (
    <Box className={styles.shell}>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={1} className={styles.logo}>simpl<span className={styles.accent}>er</span></Title>
          <Text c="dimmed" size="sm">Sampling, simplified.</Text>
        </div>
        <Button variant="light" leftSection={<IconHeart size={16} />} onClick={() => setLibraryOpen(true)}>
          Library ({library.data?.length ?? 0})
        </Button>
      </Group>

      <Stack gap="md">
        <SearchPrompt loading={searchMut.isPending} onSearch={(p) => searchMut.mutate(p)} />
        <Group justify="space-between">
          <SeedBar />
          <SegmentedControl
            size="xs" value={sort}
            onChange={(v) => setSort(v as SortKey)}
            data={SORT_KEYS.map((k) => ({ value: k, label: SORT_LABELS[k] }))}
          />
        </Group>

        {seed && <Text size="xs" c="dimmed">Seed: {seedToPrompt(seed)}</Text>}
        {data?.reasoning && (
          <Paper p="sm" radius="md" withBorder className={styles.reasoning}>
            <Text size="sm">{data.reasoning}</Text>
          </Paper>
        )}

        <ResultsList
          results={results} loading={searchMut.isPending} playingId={playingId}
          saved={library.data ?? []}
          onPlay={(s) => setPlaying(playingId === s.id ? null : s.id)}
          onSave={(s) => saveMut.mutate(s)}
        />
      </Stack>

      <Player results={results} />
      <LibraryDrawer
        opened={libraryOpen} onClose={() => setLibraryOpen(false)}
        saved={library.data ?? []} onRemove={(id) => removeMut.mutate(id)}
      />
    </Box>
  )
}
```

- [ ] **Step 11: Typecheck the whole web package**

Run: `cd packages/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 12: Build**

Run: `cd packages/web && pnpm build`
Expected: Vite build succeeds, emits `dist/`.

- [ ] **Step 13: Commit**

```bash
git add packages/web && git commit -m "feat(web): full single-screen UI — search, seed, results, player, library"
```

---

### Task 10: Docs, README, and full-stack verification

**Files:**
- Create: `README.md`
- Modify: `docs/superpowers/specs/2026-06-24-simpler-reframe-design.md` (mark Status: Implemented)

**Interfaces:**
- Produces: runnable project documentation; verified end-to-end run.

- [ ] **Step 1: Create root `README.md`**

````markdown
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
````

- [ ] **Step 2: Run the full test suite**

Run: `pnpm test`
Expected: all vitest suites pass (db, freesound, deepseek, analyze).

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 4: End-to-end smoke test**

With `.env` populated, run `pnpm dev`, open `http://localhost:5173`, run a search, play a result, save it, reopen the library drawer.
Expected: results render with a reasoning chip, audio plays, saved item persists (survives refresh — confirms SQLite write).

- [ ] **Step 5: Mark spec implemented & commit docs**

```bash
git add README.md docs/superpowers/specs/2026-06-24-simpler-reframe-design.md
git commit -m "docs: add README and mark reframe spec implemented"
```
