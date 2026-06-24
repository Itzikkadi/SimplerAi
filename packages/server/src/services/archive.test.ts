import { describe, it, expect } from 'vitest'
import { buildArchiveQuery, searchArchive } from './archive'
import type { StructuredQuery } from '@simpler/shared'

const q: StructuredQuery = {
  keywords: 'vocal', tags: ['dark', 'ethereal'], filters: {},
  sort: 'relevant', reasoning: 'x',
}

describe('archive', () => {
  it('builds a query containing keywords, tags, and mediatype:audio', () => {
    const query = buildArchiveQuery(q)
    expect(query).toContain('vocal')
    expect(query).toContain('dark')
    expect(query).toContain('mediatype:audio')
  })

  it('returns samples by combining search + per-item metadata fetches', async () => {
    const searchPayload = {
      response: { docs: [{ identifier: 'my-sound', title: 'Deep Vocal', creator: 'SoundArtist' }] },
    }
    const metaPayload = {
      files: [{ name: 'deep_vocal.mp3', format: 'VBR MP3', length: '4.2' }],
    }
    const fakeFetch = async (url: string | URL) => {
      const u = String(url)
      if (u.includes('advancedsearch')) return new Response(JSON.stringify(searchPayload), { status: 200 })
      if (u.includes('metadata')) return new Response(JSON.stringify(metaPayload), { status: 200 })
      return new Response('not found', { status: 404 })
    }
    const results = await searchArchive(q, fakeFetch as unknown as typeof fetch)
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('archive:my-sound')
    expect(results[0].source).toBe('archive')
    expect(results[0].sourceUrl).toBe('https://archive.org/details/my-sound')
    expect(results[0].previewUrl).toContain('my-sound')
    expect(results[0].previewUrl).toContain('deep_vocal.mp3')
    expect(results[0].duration).toBeCloseTo(4.2)
  })

  it('skips items that have no MP3 or Ogg file', async () => {
    const searchPayload = {
      response: { docs: [{ identifier: 'text-only', title: 'Notes', creator: 'Author' }] },
    }
    const metaPayload = { files: [{ name: 'readme.txt', format: 'Text' }] }
    const fakeFetch = async (url: string | URL) => {
      const u = String(url)
      if (u.includes('advancedsearch')) return new Response(JSON.stringify(searchPayload), { status: 200 })
      return new Response(JSON.stringify(metaPayload), { status: 200 })
    }
    const results = await searchArchive(q, fakeFetch as unknown as typeof fetch)
    expect(results).toHaveLength(0)
  })

  it('returns empty array when search request fails', async () => {
    const fakeFetch = async () => new Response('server error', { status: 500 })
    const results = await searchArchive(q, fakeFetch as unknown as typeof fetch)
    expect(results).toEqual([])
  })

  it('falls back to Ogg when no MP3 exists', async () => {
    const searchPayload = {
      response: { docs: [{ identifier: 'ogg-only', title: 'Ogg Sound', creator: 'Artist' }] },
    }
    const metaPayload = {
      files: [{ name: 'sound.ogg', format: 'Ogg Vorbis', length: '2.0' }],
    }
    const fakeFetch = async (url: string | URL) => {
      const u = String(url)
      if (u.includes('advancedsearch')) return new Response(JSON.stringify(searchPayload), { status: 200 })
      return new Response(JSON.stringify(metaPayload), { status: 200 })
    }
    const results = await searchArchive(q, fakeFetch as unknown as typeof fetch)
    expect(results).toHaveLength(1)
    expect(results[0].previewUrl).toContain('sound.ogg')
  })
})
