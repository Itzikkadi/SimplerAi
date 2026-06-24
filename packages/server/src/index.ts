import './load-env'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from './env'
import { createDb } from './db/index'
import { searchRoute } from './routes/search'
import { libraryRoute } from './routes/library'
import { proxyRoute } from './routes/proxy'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '../../..')
const dbPath = resolve(repoRoot, env.SQLITE_PATH)

const db = createDb(dbPath)
const app = new Hono()
app.use('/api/*', cors())
app.get('/api/health', (c) => c.json({ ok: true }))
app.route('/api/search', searchRoute(db))
app.route('/api/library', libraryRoute(db))
app.route('/api/proxy', proxyRoute())

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[simpler] server on http://localhost:${info.port}`)
})
