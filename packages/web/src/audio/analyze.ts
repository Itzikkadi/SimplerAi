import { analyze } from 'web-audio-beat-detector'
import type { Seed } from '@simpler/shared'

export interface Atmosphere {
  bpm: number
  mood: string[]
}

export async function detectBpm(file: File, ctx: AudioContext = new AudioContext()): Promise<number> {
  const buffer = await ctx.decodeAudioData(await file.arrayBuffer())
  const bpm = await analyze(buffer)
  return Math.round(bpm)
}

/** Map energy (RMS) and brightness (zero-crossing rate) to 2 mood words. */
export function moodFrom(rms: number, zcr: number): string[] {
  const brightness = zcr < 0.04 ? 'dark' : zcr > 0.09 ? 'bright' : 'warm'
  const energy = rms < 0.06 ? 'ambient' : rms > 0.16 ? 'energetic' : 'groovy'
  return [brightness, energy]
}

/** Decode once; return BPM + a coarse mood read (good enough for electronic input). */
export async function analyzeTrack(
  file: File,
  ctx: AudioContext = new AudioContext(),
): Promise<Atmosphere> {
  const buffer = await ctx.decodeAudioData(await file.arrayBuffer())
  const bpm = Math.round(await analyze(buffer))
  const data = buffer.getChannelData(0)
  let sumSq = 0
  let crossings = 0
  for (let i = 0; i < data.length; i++) {
    const s = data[i]
    sumSq += s * s
    if (i > 0 && s >= 0 !== data[i - 1] >= 0) crossings++
  }
  const rms = Math.sqrt(sumSq / Math.max(1, data.length))
  const zcr = crossings / Math.max(1, data.length)
  return { bpm, mood: moodFrom(rms, zcr) }
}

export function seedToPrompt(seed: Seed): string {
  const bpmText =
    seed.bpmMin != null && seed.bpmMax != null
      ? `${seed.bpmMin}-${seed.bpmMax} bpm`
      : seed.bpm != null
        ? `around ${seed.bpm} bpm`
        : null
  return [seed.mood, bpmText, seed.key && `key ${seed.key}`].filter(Boolean).join(', ')
}
