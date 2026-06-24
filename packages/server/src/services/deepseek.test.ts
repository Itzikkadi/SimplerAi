import { describe, it, expect } from 'vitest'
import { fallbackQuery, buildQuery, buildQueryPlan } from './deepseek'

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

  it('parses a multi-facet plan', async () => {
    const payload = {
      choices: [{ message: { content: JSON.stringify({
        facets: [
          { role: 'lead vocal', keywords: 'vocal', tags: ['female'], filters: {}, sort: 'relevant' },
          { role: 'texture', keywords: 'vocal texture', tags: ['airy'], filters: {}, sort: 'obscure' },
        ],
        reasoning: 'lead plus an airy texture',
      }) } }],
    }
    const fakeFetch = async () => new Response(JSON.stringify(payload), { status: 200 })
    const plan = await buildQueryPlan({ prompt: 'airy female vocal' }, 'key', fakeFetch as unknown as typeof fetch)
    expect(plan.facets).toHaveLength(2)
    expect(plan.facets[0].role).toBe('lead vocal')
    expect(plan.facets[1].keywords).toBe('vocal texture')
    expect(plan.reasoning).toMatch(/airy/)
  })

  it('falls back to a single-facet plan on error', async () => {
    const fakeFetch = async () => new Response('boom', { status: 500 })
    const plan = await buildQueryPlan({ prompt: 'soft pad' }, 'key', fakeFetch as unknown as typeof fetch)
    expect(plan.facets).toHaveLength(1)
    expect(plan.facets[0].keywords).toContain('soft pad')
  })
})
