import { Hono } from 'hono'

const ALLOWED = ['ccmixter.org', 'archive.org', 'freesound.org']

export function proxyRoute() {
  const app = new Hono()
  app.get('/', async (c) => {
    const url = c.req.query('url') ?? ''
    let parsed: URL
    try { parsed = new URL(url) } catch { return c.text('bad url', 400) }
    if (!ALLOWED.some(h => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
      return c.text('not allowed', 403)
    }
    const range = c.req.header('Range')
    const headers: Record<string, string> = {
      Referer: `https://${parsed.hostname}/`,
      'User-Agent': 'Mozilla/5.0',
    }
    if (range) headers['Range'] = range
    try {
      const up = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) })
      const contentType = up.headers.get('content-type') ?? 'audio/mpeg'
      const contentLength = up.headers.get('content-length')
      const contentRange = up.headers.get('content-range')
      c.status(up.status as 200 | 206 | 416)
      c.header('Content-Type', contentType)
      c.header('Accept-Ranges', 'bytes')
      c.header('Cache-Control', 'public, max-age=3600')
      if (contentLength) c.header('Content-Length', contentLength)
      if (contentRange) c.header('Content-Range', contentRange)
      return c.body(up.body as BodyInit)
    } catch {
      return c.text('upstream error', 502)
    }
  })
  return app
}
