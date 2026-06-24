import { Hono } from 'hono'
import type Database from 'better-sqlite3'
import { z } from 'zod'
import { saveSample, listSaved, deleteSaved } from '../db/index'

const SampleBody = z.object({
  id: z.string().min(1),
  name: z.string(),
  username: z.string(),
  duration: z.number(),
  license: z.string(),
  previewUrl: z.string().nullable(),
  tags: z.array(z.string()),
  sourcePrompt: z.string().optional(),
})

export function libraryRoute(db: Database.Database) {
  const app = new Hono()
  app.get('/', (c) => c.json(listSaved(db)))
  app.post('/', async (c) => {
    const parsed = SampleBody.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'invalid sample' }, 400)
    const { sourcePrompt, ...sample } = parsed.data
    return c.json(saveSample(db, sample, sourcePrompt ?? null))
  })
  app.delete('/:id', (c) => {
    deleteSaved(db, Number(c.req.param('id')))
    return c.json({ ok: true })
  })
  return app
}
