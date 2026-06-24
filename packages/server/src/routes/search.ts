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
import { logSearch, writeCache } from '../db/index'

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
    writeCache(db, JSON.stringify({ p: req.prompt, s: req.seed, o: req.sort }), payload)
    return c.json(payload)
  })
  return app
}
