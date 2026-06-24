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
