import { describe, it, expect } from 'vitest'
import { buildCcMixterUrl, searchCcMixter } from './ccmixter'
import type { StructuredQuery } from '@simpler/shared'

const q: StructuredQuery = {
  keywords: 'vocal', tags: ['soul', 'warm'], filters: {},
  sort: 'relevant', reasoning: 'x',
}

describe('ccmixter', () => {
  it('builds URL with keywords and tags', () => {
    const url = buildCcMixterUrl(q)
    expect(url).toContain('search=vocal')
    expect(url).toContain('tags=soul%2Cwarm')
    expect(url).toContain('type=sample')
    expect(url).toContain('f=json')
  })

  it('returns samples from a valid API response', async () => {
    const apiResponse = [
      {
        upload_id: 99,
        upload_name: 'Soul Vocal Loop',
        artist_name: 'SoulMaker',
        license_name: 'Attribution',
        files: [
          {
            file_name: 'soul_vocal.mp3',
            download_url: 'https://ccmixter.org/content/SoulMaker/soul_vocal.mp3',
            file_type: 'mp3',
          },
        ],
      },
    ]
    const fakeFetch = async () => new Response(JSON.stringify(apiResponse), { status: 200 })
    const results = await searchCcMixter(q, fakeFetch as unknown as typeof fetch)
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('ccmixter:99')
    expect(results[0].source).toBe('ccmixter')
    expect(results[0].previewUrl).toBe('https://ccmixter.org/content/SoulMaker/soul_vocal.mp3')
    expect(results[0].sourceUrl).toContain('SoulMaker')
  })

  it('skips items with no MP3 file', async () => {
    const apiResponse = [
      { upload_id: 1, upload_name: 'Empty', artist_name: 'A', license_name: 'CC', files: [] },
    ]
    const fakeFetch = async () => new Response(JSON.stringify(apiResponse), { status: 200 })
    const results = await searchCcMixter(q, fakeFetch as unknown as typeof fetch)
    expect(results).toHaveLength(0)
  })

  it('returns empty array on API failure', async () => {
    const fakeFetch = async () => new Response('error', { status: 503 })
    const results = await searchCcMixter(q, fakeFetch as unknown as typeof fetch)
    expect(results).toEqual([])
  })

  it('omits tags param when tags array is empty', () => {
    const noTags: StructuredQuery = { ...q, tags: [] }
    const url = buildCcMixterUrl(noTags)
    expect(url).not.toContain('tags=')
  })
})
