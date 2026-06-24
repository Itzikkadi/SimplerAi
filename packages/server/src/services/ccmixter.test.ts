import { describe, it, expect } from 'vitest'
import { buildCcMixterUrl, searchCcMixter } from './ccmixter'
import type { StructuredQuery } from '@simpler/shared'

const q: StructuredQuery = {
  keywords: 'vocal', tags: ['soul', 'warm'], filters: {},
  sort: 'relevant', reasoning: 'x',
}

const fakeItems = [
  {
    upload_id: 99,
    upload_name: 'Soul Vocal Loop',
    user_name: 'SoulMaker',
    license_name: 'Attribution',
    file_page_url: 'https://ccmixter.org/files/SoulMaker/99',
    files: [
      {
        file_nicname: 'mp3',
        file_name: 'soul_vocal.mp3',
        download_url: 'https://ccmixter.org/content/SoulMaker/soul_vocal.mp3',
      },
    ],
  },
]

describe('ccmixter', () => {
  it('builds URL with keywords but no tags (ccMixter uses keyword search only)', () => {
    const url = buildCcMixterUrl(q)
    expect(url).toContain('search=vocal')
    expect(url).not.toContain('tags=')
    expect(url).toContain('type=sample')
    expect(url).toContain('f=json')
  })

  it('returns samples from a valid response using real field names', async () => {
    const results = await searchCcMixter(q, async () => fakeItems)
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('ccmixter:99')
    expect(results[0].source).toBe('ccmixter')
    expect(results[0].username).toBe('SoulMaker')
    expect(results[0].previewUrl).toContain('/api/proxy?url=')
    expect(results[0].previewUrl).toContain('soul_vocal.mp3')
    expect(results[0].sourceUrl).toBe('https://ccmixter.org/files/SoulMaker/99')
  })

  it('skips items with no MP3 file', async () => {
    const noMp3 = [{ upload_id: 1, upload_name: 'Empty', user_name: 'A', license_name: 'CC', files: [] }]
    const results = await searchCcMixter(q, async () => noMp3)
    expect(results).toHaveLength(0)
  })

  it('returns empty array on fetch failure', async () => {
    const results = await searchCcMixter(q, async () => { throw new Error('network') })
    expect(results).toEqual([])
  })

  it('never includes tags= param regardless of input tags', () => {
    const url = buildCcMixterUrl(q)
    expect(url).not.toContain('tags=')
  })
})
