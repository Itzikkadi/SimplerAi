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
