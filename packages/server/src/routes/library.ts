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
