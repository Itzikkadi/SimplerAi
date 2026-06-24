# Pirate Sources (Archive.org + ccMixter) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Archive.org and ccMixter as parallel search sources alongside Freesound, with each result carrying a source badge that links back to its origin.

**Architecture:** A `source` + `sourceUrl` field is added to `Sample`. Two new service adapters (`archive.ts`, `ccmixter.ts`) follow the same injectable-fetch pattern as `freesound.ts`. The search route fans out to all three sources with `Promise.allSettled`, so no single source failure kills a search.

**Tech Stack:** TypeScript, Hono, Vitest, Mantine (UI), `@simpler/shared` for types.

## Global Constraints

- Test runner: `pnpm test` in `packages/server` runs `vitest run`
- All new adapters take `fetchImpl: typeof fetch = fetch` as last parameter (injectable for tests)
- IDs for new sources must be prefixed: `archive:{identifier}`, `ccmixter:{upload_id}`
- `AbortSignal.timeout(8_000)` for all outbound fetches
- No new environment variables (Archive.org and ccMixter require no API keys)
- Follow existing code style: no comments, no semicolons on standalone lines, short files

---

## File Map

| Action | Path |
|--------|------|
| Modify | `packages/shared/src/index.ts` |
| Modify | `packages/server/src/services/freesound.ts` |
| Modify | `packages/server/src/services/freesound.test.ts` |
| Create | `packages/server/src/services/archive.ts` |
| Create | `packages/server/src/services/archive.test.ts` |
| Create | `packages/server/src/services/ccmixter.ts` |
| Create | `packages/server/src/services/ccmixter.test.ts` |
| Modify | `packages/server/src/routes/search.ts` |
| Modify | `packages/web/src/components/ResultRow.tsx` |

---

### Task 1: Extend `Sample` type + backfill Freesound source

**Files:**
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/server/src/services/freesound.ts`
- Modify: `packages/server/src/services/freesound.test.ts`

**Interfaces:**
- Produces: `Sample.source: 'freesound' | 'archive' | 'ccmixter'` and `Sample.sourceUrl?: string` — used by Tasks 2, 3, 4, 5

- [ ] **Step 1: Update `Sample` in `packages/shared/src/index.ts`**

Replace the `Sample` interface with:

```typescript
export interface Sample {
  id: string
  name: string
  username: string
  duration: number
  license: string
  previewUrl: string | null
  tags: string[]
  source: 'freesound' | 'archive' | 'ccmixter'
  sourceUrl?: string
}
```

- [ ] **Step 2: Backfill `source` and `sourceUrl` in `normalizeHit` in `packages/server/src/services/freesound.ts`**

Replace the return value of `normalizeHit`:

```typescript
export function normalizeHit(hit: unknown): Sample {
  const h = hit as {
    id?: unknown
    name?: string
    username?: string
    duration?: number
    license?: string
    previews?: Record<string, string>
    tags?: string[]
  }
  const id = String(h.id)
  return {
    id,
    name: h.name ?? '',
    username: h.username ?? '',
    duration: h.duration ?? 0,
    license: h.license ?? '',
    previewUrl: h.previews?.['preview-hq-mp3'] ?? h.previews?.['preview-lq-mp3'] ?? null,
    tags: Array.isArray(h.tags) ? h.tags : [],
    source: 'freesound',
    sourceUrl: `https://freesound.org/people/${h.username ?? ''}/sounds/${id}/`,
  }
}
```

- [ ] **Step 3: Run the existing tests to see which ones fail**

```bash
cd packages/server && pnpm test
```

Expected: the `normalizeHit` test fails because the expected object is missing the new fields.

- [ ] **Step 4: Update `normalizeHit` test in `packages/server/src/services/freesound.test.ts`**

Replace the `normalizeHit` test case:

```typescript
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
      source: 'freesound',
      sourceUrl: 'https://freesound.org/people/bob/sounds/42/',
    })
  })
```

- [ ] **Step 5: Run tests to confirm all pass**

```bash
cd packages/server && pnpm test
```

Expected: all existing tests pass including the updated `normalizeHit` test.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/index.ts packages/server/src/services/freesound.ts packages/server/src/services/freesound.test.ts
git commit -m "feat: add source + sourceUrl fields to Sample, backfill freesound"
```

---

### Task 2: Archive.org adapter

**Files:**
- Create: `packages/server/src/services/archive.ts`
- Create: `packages/server/src/services/archive.test.ts`

**Interfaces:**
- Consumes: `Sample`, `StructuredQuery` from `@simpler/shared` (Task 1)
- Produces: `searchArchive(q: StructuredQuery, fetchImpl?: typeof fetch): Promise<Sample[]>` — used by Task 4

- [ ] **Step 1: Write the failing tests in `packages/server/src/services/archive.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { buildArchiveQuery, searchArchive } from './archive'
import type { StructuredQuery } from '@simpler/shared'

const q: StructuredQuery = {
  keywords: 'vocal', tags: ['dark', 'ethereal'], filters: {},
  sort: 'relevant', reasoning: 'x',
}

describe('archive', () => {
  it('builds a query containing keywords, tags, and mediatype:audio', () => {
    const query = buildArchiveQuery(q)
    expect(query).toContain('vocal')
    expect(query).toContain('dark')
    expect(query).toContain('mediatype:audio')
  })

  it('returns samples by combining search + per-item metadata fetches', async () => {
    const searchPayload = {
      response: { docs: [{ identifier: 'my-sound', title: 'Deep Vocal', creator: 'SoundArtist' }] },
    }
    const metaPayload = {
      files: [{ name: 'deep_vocal.mp3', format: 'VBR MP3', length: '4.2' }],
    }
    const fakeFetch = async (url: string | URL) => {
      const u = String(url)
      if (u.includes('advancedsearch')) return new Response(JSON.stringify(searchPayload), { status: 200 })
      if (u.includes('metadata')) return new Response(JSON.stringify(metaPayload), { status: 200 })
      return new Response('not found', { status: 404 })
    }
    const results = await searchArchive(q, fakeFetch as unknown as typeof fetch)
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('archive:my-sound')
    expect(results[0].source).toBe('archive')
    expect(results[0].sourceUrl).toBe('https://archive.org/details/my-sound')
    expect(results[0].previewUrl).toContain('my-sound')
    expect(results[0].previewUrl).toContain('deep_vocal.mp3')
    expect(results[0].duration).toBeCloseTo(4.2)
  })

  it('skips items that have no MP3 or Ogg file', async () => {
    const searchPayload = {
      response: { docs: [{ identifier: 'text-only', title: 'Notes', creator: 'Author' }] },
    }
    const metaPayload = { files: [{ name: 'readme.txt', format: 'Text' }] }
    const fakeFetch = async (url: string | URL) => {
      const u = String(url)
      if (u.includes('advancedsearch')) return new Response(JSON.stringify(searchPayload), { status: 200 })
      return new Response(JSON.stringify(metaPayload), { status: 200 })
    }
    const results = await searchArchive(q, fakeFetch as unknown as typeof fetch)
    expect(results).toHaveLength(0)
  })

  it('returns empty array when search request fails', async () => {
    const fakeFetch = async () => new Response('server error', { status: 500 })
    const results = await searchArchive(q, fakeFetch as unknown as typeof fetch)
    expect(results).toEqual([])
  })

  it('falls back to Ogg when no MP3 exists', async () => {
    const searchPayload = {
      response: { docs: [{ identifier: 'ogg-only', title: 'Ogg Sound', creator: 'Artist' }] },
    }
    const metaPayload = {
      files: [{ name: 'sound.ogg', format: 'Ogg Vorbis', length: '2.0' }],
    }
    const fakeFetch = async (url: string | URL) => {
      const u = String(url)
      if (u.includes('advancedsearch')) return new Response(JSON.stringify(searchPayload), { status: 200 })
      return new Response(JSON.stringify(metaPayload), { status: 200 })
    }
    const results = await searchArchive(q, fakeFetch as unknown as typeof fetch)
    expect(results).toHaveLength(1)
    expect(results[0].previewUrl).toContain('sound.ogg')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail (module not found)**

```bash
cd packages/server && pnpm test archive
```

Expected: FAIL — `Cannot find module './archive'`

- [ ] **Step 3: Create `packages/server/src/services/archive.ts`**

```typescript
import type { Sample, StructuredQuery } from '@simpler/shared'

const TIMEOUT_MS = 8_000

interface ArchiveDoc {
  identifier: string
  title?: string
  creator?: string
}

interface ArchiveFile {
  name: string
  format: string
  length?: string
}

export function buildArchiveQuery(q: StructuredQuery): string {
  const terms = [q.keywords, ...q.tags].filter(Boolean).join(' ')
  return `(${terms}) AND mediatype:audio`
}

function pickAudioFile(files: ArchiveFile[]): ArchiveFile | undefined {
  return (
    files.find(f => f.format === 'VBR MP3' || f.format === 'MP3') ??
    files.find(f => f.format === 'Ogg Vorbis')
  )
}

async function resolveItem(doc: ArchiveDoc, fetchImpl: typeof fetch): Promise<Sample | null> {
  try {
    const res = await fetchImpl(`https://archive.org/metadata/${doc.identifier}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { files?: ArchiveFile[] }
    const audio = pickAudioFile(data.files ?? [])
    if (!audio) return null
    return {
      id: `archive:${doc.identifier}`,
      name: doc.title ?? doc.identifier,
      username: doc.creator ?? 'archive.org',
      duration: audio.length ? parseFloat(audio.length) : 0,
      license: '',
      previewUrl: `https://archive.org/download/${doc.identifier}/${encodeURIComponent(audio.name)}`,
      tags: [],
      source: 'archive',
      sourceUrl: `https://archive.org/details/${doc.identifier}`,
    }
  } catch {
    return null
  }
}

export async function searchArchive(
  q: StructuredQuery,
  fetchImpl: typeof fetch = fetch,
): Promise<Sample[]> {
  const query = buildArchiveQuery(q)
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier,title,creator&output=json&rows=10`
  let docs: ArchiveDoc[]
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return []
    const data = (await res.json()) as { response?: { docs?: ArchiveDoc[] } }
    docs = data.response?.docs ?? []
  } catch {
    return []
  }
  const settled = await Promise.allSettled(docs.map(doc => resolveItem(doc, fetchImpl)))
  return settled
    .filter((r): r is PromiseFulfilledResult<Sample | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((s): s is Sample => s !== null)
}
```

- [ ] **Step 4: Run tests to verify they all pass**

```bash
cd packages/server && pnpm test archive
```

Expected: all 5 archive tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/services/archive.ts packages/server/src/services/archive.test.ts
git commit -m "feat: Archive.org search adapter"
```

---

### Task 3: ccMixter adapter

**Files:**
- Create: `packages/server/src/services/ccmixter.ts`
- Create: `packages/server/src/services/ccmixter.test.ts`

**Interfaces:**
- Consumes: `Sample`, `StructuredQuery` from `@simpler/shared` (Task 1)
- Produces: `searchCcMixter(q: StructuredQuery, fetchImpl?: typeof fetch): Promise<Sample[]>` — used by Task 4

- [ ] **Step 1: Write the failing tests in `packages/server/src/services/ccmixter.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { buildCcMixterUrl, searchCcMixter } from './ccmixter'
import type { StructuredQuery } from '@simpler/shared'

const q: StructuredQuery = {
  keywords: 'vocal', tags: ['soul', 'warm'], filters: {},
  sort: 'relevant', reasoning: 'x',
}

describe('ccmixter', () => {
  it('builds URL with keywords and tags', () => {
    const url = buildCcMixterUrl(q)
    expect(url).toContain('search=vocal')
    expect(url).toContain('tags=soul%2Cwarm')
    expect(url).toContain('type=sample')
    expect(url).toContain('f=json')
  })

  it('returns samples from a valid API response', async () => {
    const apiResponse = [
      {
        upload_id: 99,
        upload_name: 'Soul Vocal Loop',
        artist_name: 'SoulMaker',
        license_name: 'Attribution',
        files: [
          {
            file_name: 'soul_vocal.mp3',
            download_url: 'https://ccmixter.org/content/SoulMaker/soul_vocal.mp3',
            file_type: 'mp3',
          },
        ],
      },
    ]
    const fakeFetch = async () => new Response(JSON.stringify(apiResponse), { status: 200 })
    const results = await searchCcMixter(q, fakeFetch as unknown as typeof fetch)
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('ccmixter:99')
    expect(results[0].source).toBe('ccmixter')
    expect(results[0].previewUrl).toBe('https://ccmixter.org/content/SoulMaker/soul_vocal.mp3')
    expect(results[0].sourceUrl).toContain('SoulMaker')
  })

  it('skips items with no MP3 file', async () => {
    const apiResponse = [
      { upload_id: 1, upload_name: 'Empty', artist_name: 'A', license_name: 'CC', files: [] },
    ]
    const fakeFetch = async () => new Response(JSON.stringify(apiResponse), { status: 200 })
    const results = await searchCcMixter(q, fakeFetch as unknown as typeof fetch)
    expect(results).toHaveLength(0)
  })

  it('returns empty array on API failure', async () => {
    const fakeFetch = async () => new Response('error', { status: 503 })
    const results = await searchCcMixter(q, fakeFetch as unknown as typeof fetch)
    expect(results).toEqual([])
  })

  it('omits tags param when tags array is empty', () => {
    const noTags: StructuredQuery = { ...q, tags: [] }
    const url = buildCcMixterUrl(noTags)
    expect(url).not.toContain('tags=')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail (module not found)**

```bash
cd packages/server && pnpm test ccmixter
```

Expected: FAIL — `Cannot find module './ccmixter'`

- [ ] **Step 3: Create `packages/server/src/services/ccmixter.ts`**

```typescript
import type { Sample, StructuredQuery } from '@simpler/shared'

const TIMEOUT_MS = 8_000

interface CcMixterFile {
  file_name?: string
  download_url?: string
  file_type?: string
}

interface CcMixterItem {
  upload_id?: number
  upload_name?: string
  artist_name?: string
  license_name?: string
  files?: CcMixterFile[]
}

export function buildCcMixterUrl(q: StructuredQuery): string {
  const params = new URLSearchParams({ f: 'json', type: 'sample', search: q.keywords, limit: '20' })
  if (q.tags.length) params.set('tags', q.tags.join(','))
  return `https://ccmixter.org/api/query?${params}`
}

function normalizeItem(item: CcMixterItem): Sample | null {
  if (!item.upload_id) return null
  const mp3 = item.files?.find(f => f.file_type === 'mp3' || f.file_name?.endsWith('.mp3'))
  if (!mp3?.download_url) return null
  return {
    id: `ccmixter:${item.upload_id}`,
    name: item.upload_name ?? '',
    username: item.artist_name ?? '',
    duration: 0,
    license: item.license_name ?? '',
    previewUrl: mp3.download_url,
    tags: [],
    source: 'ccmixter',
    sourceUrl: `https://ccmixter.org/files/${item.artist_name}/${item.upload_id}`,
  }
}

export async function searchCcMixter(
  q: StructuredQuery,
  fetchImpl: typeof fetch = fetch,
): Promise<Sample[]> {
  try {
    const res = await fetchImpl(buildCcMixterUrl(q), { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return []
    const items = (await res.json()) as CcMixterItem[]
    return items.map(normalizeItem).filter((s): s is Sample => s !== null)
  } catch {
    return []
  }
}
```

- [ ] **Step 4: Run tests to verify they all pass**

```bash
cd packages/server && pnpm test ccmixter
```

Expected: all 5 ccmixter tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/services/ccmixter.ts packages/server/src/services/ccmixter.test.ts
git commit -m "feat: ccMixter search adapter"
```

---

### Task 4: Parallel fan-out in `search.ts`

**Files:**
- Modify: `packages/server/src/routes/search.ts`

**Interfaces:**
- Consumes: `searchArchive` from `./services/archive` (Task 2), `searchCcMixter` from `./services/ccmixter` (Task 3)

- [ ] **Step 1: Update `packages/server/src/routes/search.ts`**

Replace the full file content:

```typescript
import { Hono } from 'hono'
import type Database from 'better-sqlite3'
import { z } from 'zod'
import type { SearchResponse } from '@simpler/shared'
import { SORT_KEYS } from '@simpler/shared'
import { env } from '../env'
import { buildQuery } from '../services/deepseek'
import { searchFreesound } from '../services/freesound'
import { searchArchive } from '../services/archive'
import { searchCcMixter } from '../services/ccmixter'
import { logSearch, readCache, writeCache } from '../db/index'

const SearchBody = z.object({
  prompt: z.string().min(1, 'prompt is required'),
  seed: z
    .object({
      bpm: z.number().optional(),
      key: z.string().optional(),
      mood: z.string().optional(),
      bpmMin: z.number().optional(),
      bpmMax: z.number().optional(),
    })
    .optional(),
  sort: z.enum(SORT_KEYS).optional(),
})

export function searchRoute(db: Database.Database) {
  const app = new Hono()
  app.post('/', async (c) => {
    const parsed = SearchBody.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'invalid request' }, 400)
    const req = parsed.data

    const hash = JSON.stringify({ p: req.prompt, s: req.seed, o: req.sort })
    const cached = readCache(db, hash) as SearchResponse | null
    if (cached) return c.json(cached)

    const structuredQuery = await buildQuery(req, env.DEEPSEEK_API_KEY)
    if (req.seed?.bpmMin != null) structuredQuery.filters.bpmMin = req.seed.bpmMin
    if (req.seed?.bpmMax != null) structuredQuery.filters.bpmMax = req.seed.bpmMax

    const [fsRes, archRes, ccRes] = await Promise.allSettled([
      searchFreesound(structuredQuery, env.FREESOUND_API_KEY),
      searchArchive(structuredQuery),
      searchCcMixter(structuredQuery),
    ])

    const results = [
      ...(fsRes.status === 'fulfilled' ? fsRes.value : []),
      ...(archRes.status === 'fulfilled' ? archRes.value : []),
      ...(ccRes.status === 'fulfilled' ? ccRes.value : []),
    ]

    const payload: SearchResponse = { structuredQuery, reasoning: structuredQuery.reasoning, results }

    logSearch(db, req.prompt, structuredQuery, results.length)
    writeCache(db, hash, payload)
    return c.json(payload)
  })
  return app
}
```

- [ ] **Step 2: Run the full server test suite**

```bash
cd packages/server && pnpm test
```

Expected: all tests PASS (no tests cover search.ts directly, but this validates the imports compile).

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/routes/search.ts
git commit -m "feat: fan-out search across Freesound, Archive.org, ccMixter"
```

---

### Task 5: Source badge in `ResultRow`

**Files:**
- Modify: `packages/web/src/components/ResultRow.tsx`

**Interfaces:**
- Consumes: `Sample.source`, `Sample.sourceUrl` (Task 1)

- [ ] **Step 1: Update `packages/web/src/components/ResultRow.tsx`**

Replace the full file content:

```tsx
import { Group, ActionIcon, Text, Stack, Badge } from '@mantine/core'
import {
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconHeart,
  IconHeartFilled,
} from '@tabler/icons-react'
import type { Sample } from '@simpler/shared'
import { RightsBadge } from './RightsBadge'
import { formatDuration } from '../lib/license'

const SOURCE_LABELS: Record<string, string> = {
  freesound: 'Freesound',
  archive: 'Archive.org',
  ccmixter: 'ccMixter',
}

interface Props {
  sample: Sample
  playing: boolean
  saved: boolean
  onPlay: () => void
  onSave: () => void
}

export function ResultRow({ sample, playing, saved, onPlay, onSave }: Props) {
  const summary = sample.tags.slice(0, 4).join(' · ')
  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      px="sm"
      py="sm"
      style={{
        borderRadius: 10,
        background: playing ? 'var(--mantine-color-dark-6)' : 'transparent',
        transition: 'background 120ms ease',
      }}
    >
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <ActionIcon
          variant={playing ? 'filled' : 'light'}
          color="teal"
          radius="xl"
          size="lg"
          onClick={onPlay}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <IconPlayerPauseFilled size={16} /> : <IconPlayerPlayFilled size={16} />}
        </ActionIcon>
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text size="sm" fw={500} truncate>
            {sample.name}
          </Text>
          {summary && (
            <Text size="xs" c="dimmed" truncate>
              {summary}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            {sample.username} · {formatDuration(sample.duration)}
          </Text>
        </Stack>
      </Group>
      <Group gap="xs" wrap="nowrap">
        <RightsBadge license={sample.license} />
        {sample.sourceUrl ? (
          <Badge
            component="a"
            href={sample.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            size="xs"
            color="gray"
            style={{ cursor: 'pointer', textDecoration: 'none' }}
          >
            {SOURCE_LABELS[sample.source] ?? sample.source}
          </Badge>
        ) : (
          <Badge variant="outline" size="xs" color="gray">
            {SOURCE_LABELS[sample.source] ?? sample.source}
          </Badge>
        )}
        <ActionIcon
          variant="subtle"
          color={saved ? 'teal' : 'gray'}
          onClick={onSave}
          aria-label="Save"
        >
          {saved ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
        </ActionIcon>
      </Group>
    </Group>
  )
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start the dev server and verify the badge appears**

```bash
pnpm dev
```

Open the app, run a search, and confirm each result card shows a small grey outlined badge ("Freesound", "Archive.org", or "ccMixter") that opens the source page in a new tab when clicked.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/ResultRow.tsx
git commit -m "feat: source badge on result cards links back to origin"
```
