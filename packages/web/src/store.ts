import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Seed, SearchResponse, SortKey } from '@simpler/shared'

interface State {
  // session-only (not persisted)
  playingId: string | null
  setPlaying: (id: string | null) => void

  // persisted to localStorage so a refresh keeps your place
  prompt: string
  sort: SortKey
  seed: Seed | null
  seedFileName: string | null
  lastSearch: SearchResponse | null
  setPrompt: (prompt: string) => void
  setSort: (sort: SortKey) => void
  setSeed: (seed: Seed | null) => void
  setSeedFileName: (name: string | null) => void
  setLastSearch: (result: SearchResponse | null) => void
  clearSeed: () => void
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      playingId: null,
      setPlaying: (playingId) => set({ playingId }),

      prompt: 'dark aggressive trap vocal around 140 bpm',
      sort: 'relevant',
      seed: null,
      seedFileName: null,
      lastSearch: null,
      setPrompt: (prompt) => set({ prompt }),
      setSort: (sort) => set({ sort }),
      setSeed: (seed) => set({ seed }),
      setSeedFileName: (seedFileName) => set({ seedFileName }),
      setLastSearch: (lastSearch) => set({ lastSearch }),
      clearSeed: () => set({ seed: null, seedFileName: null }),
    }),
    {
      name: 'simpler-state',
      // persist everything except the transient playback pointer
      partialize: (s) => ({
        prompt: s.prompt,
        sort: s.sort,
        seed: s.seed,
        seedFileName: s.seedFileName,
        lastSearch: s.lastSearch,
      }),
    },
  ),
)
