import { analyze } from 'web-audio-beat-detector'
import type { Seed } from '@simpler/shared'

export async function detectBpm(file: File, ctx: AudioContext = new AudioContext()): Promise<number> {
  const buffer = await ctx.decodeAudioData(await file.arrayBuffer())
  const result = await analyze(buffer)
  const bpm = (result as unknown as { bpm: number }).bpm
  return Math.round(bpm)
}

export function seedToPrompt(seed: Seed): string {
  return [seed.mood, seed.bpm && `around ${seed.bpm} bpm`, seed.key && `key ${seed.key}`]
    .filter(Boolean)
    .join(', ')
}
