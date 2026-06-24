import { describe, it, expect } from 'vitest'
import { seedToPrompt } from './analyze'

describe('seedToPrompt', () => {
  it('renders bpm/key/mood into a compact phrase', () => {
    expect(seedToPrompt({ bpm: 140, key: 'Am', mood: 'dark' })).toBe('dark, around 140 bpm, key Am')
  })
  it('omits missing fields', () => {
    expect(seedToPrompt({ bpm: 90 })).toBe('around 90 bpm')
  })
})
