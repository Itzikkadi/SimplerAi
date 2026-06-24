# Pirate-Like Inspiration Sources

**Date:** 2026-06-24  
**Status:** Approved

## Goal

Add Internet Archive and ccMixter as parallel search sources alongside Freesound, giving musicians raw, underground, community-driven sounds for creative inspiration.

## Data Model

Add two fields to `Sample` in `packages/shared/src/index.ts`:

```typescript
source: 'freesound' | 'archive' | 'ccmixter'
sourceUrl?: string
```

- `source` — drives the UI badge on each result card
- `sourceUrl` — links out to the item's original page; opens in new tab on badge click
- All existing Freesound results get `source: 'freesound'` backfilled

## New Source Adapters

### `packages/server/src/services/archive.ts`

- **API:** `https://archive.org/advancedsearch.php` — no auth required
- **Query translation:** `q.keywords` + `q.tags` joined into free-text query, filtered to `mediatype:audio`
- **Two-step fetch:**
  1. Search returns up to 10 identifiers
  2. Fetch `https://archive.org/metadata/{id}/files` in parallel for each
  3. Pick first MP3 file (fallback: OGG) → `https://archive.org/download/{id}/{filename}`
- **Timeout:** 8 seconds
- **No broadening fallback** — Archive's full-text search is loose enough by default

### `packages/server/src/services/ccmixter.ts`

- **API:** `http://ccmixter.org/api/query?f=json&type=sample` — no auth required
- **Query translation:** `search={q.keywords}`, `tags={q.tags.join(',')}`, `limit=20`
- **Single request** — response includes `download_url` directly
- **Field mapping:** `artist_name` → `username`, `upload_name` → `name`, `license_name` → `license`
- **Timeout:** 8 seconds

### No new environment variables needed

Both sources are public, unauthenticated APIs.

## Parallel Fan-Out in `search.ts`

Replace the single `searchFreesound` call:

```typescript
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
```

- `allSettled` — a failing source never kills the whole search
- Result order: Freesound → Archive → ccMixter
- IDs are source-prefixed (`archive:{identifier}`, `ccmixter:{id}`) to avoid collisions

## Frontend Source Badge

- Each result card shows a small pill: "Freesound", "Archive.org", or "ccMixter"
- Clicking the pill opens `sourceUrl` in a new tab
- No other UI changes — player, save, and tag display work unchanged

## Out of Scope

- Source-routing via DeepSeek planner (phase 2)
- User-toggled source filters (phase 2)
- Soulseek / eMule / RetroShare / Tribler (no public HTTP API)
