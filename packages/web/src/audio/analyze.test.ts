import { describe, it, expect } from 'vitest'
import { seedToPrompt, moodFrom } from './analyze'

describe('seedToPrompt', () => {
  it('renders bpm/key/mood into a compact phrase', () => {
    expect(seedToPrompt({ bpm: 140, key: 'Am', mood: 'dark' })).toBe('dark, around 140 bpm, key Am')
  })
  it('omits missing fields', () => {
    expect(seedToPrompt({ bpm: 90 })).toBe('around 90 bpm')
  })
})

describe('moodFrom', () => {
  it('maps loud, bright audio to bright + energetic', () => {
    expect(moodFrom(0.2, 0.12)).toEqual(['bright', 'energetic'])
  })
  it('maps quiet, dull audio to dark + ambient', () => {
    expect(moodFrom(0.02, 0.02)).toEqual(['dark', 'ambient'])
  })
})
