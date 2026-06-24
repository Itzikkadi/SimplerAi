import { describe, it, expect } from 'vitest'
import { fallbackQuery, buildQuery } from './deepseek'

describe('deepseek', () => {
  it('fallback turns prompt + seed into a literal query', () => {
    const q = fallbackQuery({ prompt: 'dark vocal', seed: { bpm: 140, key: 'Am' }, sort: 'obscure' })
    expect(q.keywords).toContain('dark vocal')
    expect(q.sort).toBe('obscure')
    expect(q.reasoning).toMatch(/fallback/i)
  })

  it('parses a valid DeepSeek JSON response into StructuredQuery', async () => {
    const payload = {
      choices: [{ message: { content: JSON.stringify({
        keywords: 'vocal shout', tags: ['aggressive'], filters: { maxDuration: 5 },
        sort: 'obscure', reasoning: 'matched aggressive trap vibe',
      }) } }],
    }
    const fakeFetch = async () => new Response(JSON.stringify(payload), { status: 200 })
    const q = await buildQuery({ prompt: 'aggressive trap vocal' }, 'key', fakeFetch as unknown as typeof fetch)
    expect(q.tags).toEqual(['aggressive'])
    expect(q.reasoning).toBe('matched aggressive trap vibe')
  })

  it('falls back when DeepSeek errors', async () => {
    const fakeFetch = async () => new Response('boom', { status: 500 })
    const q = await buildQuery({ prompt: 'soft pad' }, 'key', fakeFetch as unknown as typeof fetch)
    expect(q.keywords).toContain('soft pad')
    expect(q.reasoning).toMatch(/fallback/i)
  })
})
