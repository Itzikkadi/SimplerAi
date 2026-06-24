import { SORT_KEYS, type SearchRequest, type SortKey, type StructuredQuery } from '@simpler/shared'

const SYSTEM = `You are a search-query planner for a vocal-sample discovery app backed by the Freesound API.
Given a producer's natural-language request (and optional detected BPM/key/mood seed), respond with ONLY a JSON object:
{"keywords": string, "tags": string[], "filters": {"license"?: string, "minDuration"?: number, "maxDuration"?: number}, "sort": "relevant"|"popular"|"newest"|"obscure", "reasoning": string}
"keywords" MUST be 1-3 core words only (e.g. "vocal shout", "female vocal") — Freesound ANDs every word, so extra words return nothing. Put all descriptors (mood, genre, gender, character) in "tags" instead, where they broaden the search. reasoning is one short sentence.`

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

function coerce(parsed: Record<string, unknown>, req: SearchRequest): StructuredQuery {
  const sort: SortKey = SORT_KEYS.includes(parsed.sort as SortKey)
    ? (parsed.sort as SortKey)
    : req.sort ?? 'relevant'
  return {
    keywords: String(parsed.keywords ?? req.prompt),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
    filters:
      typeof parsed.filters === 'object' && parsed.filters
        ? (parsed.filters as StructuredQuery['filters'])
        : {},
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

const PLAN_SYSTEM = `You are a search planner for a vocal-sample discovery app backed by sample libraries (Freesound, Archive.org).
Decompose the producer's request into 1-4 COMPLEMENTARY sub-searches ("facets") that together cover the vibe — e.g. a lead vocal, a vocal texture/atmosphere, and an adlib/shout. For a simple request, return just 1 facet.
Respond with ONLY a JSON object:
{"facets":[{"role": string, "keywords": string, "tags": string[], "filters": {"license"?: string, "minDuration"?: number, "maxDuration"?: number}, "sort": "relevant"|"popular"|"newest"|"obscure"}], "reasoning": string}
Each "keywords" MUST be 1-3 core words (libraries AND every word, so extra words return nothing) — put descriptors in "tags". "role" is a 1-3 word label. reasoning is one short sentence covering the whole plan.`

export interface QueryPlan {
  facets: StructuredQuery[]
  reasoning: string
}

export function fallbackPlan(req: SearchRequest): QueryPlan {
  return { facets: [fallbackQuery(req)], reasoning: 'Literal keyword search (DeepSeek fallback).' }
}

export async function buildQueryPlan(
  req: SearchRequest,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<QueryPlan> {
  try {
    const seedLine = req.seed ? `\nDetected seed: ${JSON.stringify(req.seed)}` : ''
    const res = await fetchImpl('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PLAN_SYSTEM },
          { role: 'user', content: `Request: ${req.prompt}${seedLine}\nPreferred sort: ${req.sort ?? 'relevant'}` },
        ],
      }),
    })
    if (!res.ok) throw new Error(`DeepSeek error: ${res.status}`)
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('DeepSeek empty response')
    const parsed = JSON.parse(content) as Record<string, unknown>
    const rawFacets = Array.isArray(parsed.facets) ? parsed.facets : []
    const facets: StructuredQuery[] = rawFacets.slice(0, 4).map((f) => {
      const facet = f as Record<string, unknown>
      const q = coerce(facet, req)
      return typeof facet.role === 'string' ? { ...q, role: facet.role } : q
    })
    if (!facets.length) throw new Error('DeepSeek returned no facets')
    return { facets, reasoning: String(parsed.reasoning ?? facets[0].reasoning) }
  } catch (err) {
    console.warn('[simpler] DeepSeek plan fallback:', (err as Error).message)
    return fallbackPlan(req)
  }
}
