import type { Sample, SortKey, StructuredQuery } from '@simpler/shared'

const SORT_MAP: Record<SortKey, string> = {
  relevant: 'score',
  popular: 'downloads_desc',
  newest: 'created_desc',
  obscure: 'downloads_asc',
}

const FIELDS = 'id,name,username,duration,license,previews,tags'

export function buildFreesoundParams(q: StructuredQuery): URLSearchParams {
  // Keep the free-text query concise — Freesound ANDs every word, so piling the
  // LLM's tags into `query` collapses results to zero. Tags belong in an OR
  // filter, which broadens rather than narrows.
  const query = q.keywords
  const filters: string[] = []
  if (q.tags.length) {
    filters.push(`(${q.tags.map((t) => `tag:"${t}"`).join(' OR ')})`)
  }
  if (q.filters.minDuration != null) filters.push(`duration:[${q.filters.minDuration} TO *]`)
  if (q.filters.maxDuration != null) filters.push(`duration:[* TO ${q.filters.maxDuration}]`)
  if (q.filters.license) filters.push(`license:"${q.filters.license}"`)
  const params = new URLSearchParams({ query, sort: SORT_MAP[q.sort], fields: FIELDS, page_size: '20' })
  if (filters.length) params.set('filter', filters.join(' '))
  return params
}

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

async function runSearch(
  params: URLSearchParams,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<Sample[]> {
  const res = await fetchImpl(`https://freesound.org/apiv2/search/text/?${params}`, {
    headers: { Authorization: `Token ${apiKey}` },
  })
  if (!res.ok) throw new Error(`Freesound error: ${res.status}`)
  const data = (await res.json()) as { results?: unknown[] }
  return (data.results ?? []).map(normalizeHit)
}

export async function searchFreesound(
  q: StructuredQuery,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Sample[]> {
  // Freesound ANDs query words and tag filters, so a precise query can
  // legitimately return nothing. Broaden progressively until we get hits:
  // 1) keywords + tag-OR filter, 2) drop the tag filter, 3) shorten keywords.
  const attempts: StructuredQuery[] = [
    q,
    { ...q, tags: [] },
    { ...q, tags: [], filters: {}, keywords: q.keywords.split(/\s+/).slice(0, 2).join(' ') },
  ]
  for (const attempt of attempts) {
    const hits = await runSearch(buildFreesoundParams(attempt), apiKey, fetchImpl)
    if (hits.length) return hits
  }
  return []
}
