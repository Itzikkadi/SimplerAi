import { describe, it, expect } from 'vitest'
import { buildFreesoundParams, normalizeHit, searchFreesound } from './freesound'
import type { StructuredQuery } from '@simpler/shared'

const q: StructuredQuery = {
  keywords: 'vocal shout', tags: ['aggressive'], filters: { maxDuration: 5 },
  sort: 'obscure', reasoning: 'x',
}

describe('freesound', () => {
  it('maps sort=obscure to ascending downloads and builds filter', () => {
    const p = buildFreesoundParams(q)
    expect(p.get('sort')).toBe('downloads_asc')
    expect(p.get('query')).toBe('vocal shout')
    expect(p.get('filter')).toContain('duration:[* TO 5]')
  })

  it('normalizes a Freesound hit into a Sample', () => {
    const s = normalizeHit({
      id: 42, name: 'shout', username: 'bob', duration: 2.1,
      license: 'http://creativecommons.org/publicdomain/zero/1.0/',
      previews: { 'preview-hq-mp3': 'http://x/p.mp3' }, tags: ['vocal'],
    })
    expect(s).toEqual({
      id: '42', name: 'shout', username: 'bob', duration: 2.1,
      license: 'http://creativecommons.org/publicdomain/zero/1.0/',
      previewUrl: 'http://x/p.mp3', tags: ['vocal'],
    })
  })

  it('searches via injected fetch and returns normalized samples', async () => {
    const fakeFetch = async () =>
      new Response(JSON.stringify({ results: [{ id: 1, name: 'a', username: 'u', duration: 1, license: 'CC0', previews: {}, tags: [] }] }), { status: 200 })
    const out = await searchFreesound(q, 'key', fakeFetch as unknown as typeof fetch)
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('1')
  })
})
