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
    // query stays concise (keywords only); tags broaden via an OR filter
    expect(p.get('query')).toBe('vocal shout')
    expect(p.get('filter')).toContain('(tag:"aggressive")')
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

  it('broadens to a tag-free query when the precise one is empty', async () => {
    const calls: string[] = []
    const fakeFetch = async (url: string | URL) => {
      const u = String(url)
      calls.push(u)
      // First attempt carries the tag filter and returns nothing.
      const hasTagFilter = u.includes('tag%3A') || u.includes('tag:')
      const results = hasTagFilter
        ? []
        : [{ id: 7, name: 'b', username: 'u', duration: 1, license: 'CC0', previews: {}, tags: [] }]
      return new Response(JSON.stringify({ results }), { status: 200 })
    }
    const out = await searchFreesound(q, 'key', fakeFetch as unknown as typeof fetch)
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('7')
    expect(calls.length).toBeGreaterThanOrEqual(2)
  })

  it('adds a bpm-tag OR group for a bpm range', () => {
    const p = buildFreesoundParams({
      keywords: 'vocal', tags: [], filters: { bpmMin: 120, bpmMax: 122 },
      sort: 'relevant', reasoning: 'x',
    })
    const f = p.get('filter') ?? ''
    expect(f).toContain('tag:"120bpm"')
    expect(f).toContain('tag:"122"')
    expect(f).toContain(' OR ')
  })
})
