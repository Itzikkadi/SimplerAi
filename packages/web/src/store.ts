import { create } from 'zustand'
import type { Seed } from '@simpler/shared'

interface State {
  playingId: string | null
  seed: Seed | null
  setPlaying: (id: string | null) => void
  setSeed: (seed: Seed | null) => void
}

export const useStore = create<State>((set) => ({
  playingId: null,
  seed: null,
  setPlaying: (playingId) => set({ playingId }),
  setSeed: (seed) => set({ seed }),
}))
