import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Group, Title, Text, Stack, Button, Paper, SegmentedControl, Box } from '@mantine/core'
import { IconHeart } from '@tabler/icons-react'
import { SORT_KEYS, type Sample, type SortKey } from '@simpler/shared'
import { api } from './lib/api'
import { useStore } from './store'
import { seedToPrompt } from './audio/analyze'
import { SearchPrompt } from './components/SearchPrompt'
import { SeedBar } from './components/SeedBar'
import { ResultsList } from './components/ResultsList'
import { Player } from './components/Player'
import { LibraryDrawer } from './components/LibraryDrawer'
import styles from './App.module.css'

const SORT_LABELS: Record<SortKey, string> = {
  relevant: 'Relevant', popular: 'Popular', newest: 'Newest', obscure: 'Most obscure',
}

export function App() {
  const qc = useQueryClient()
  const {
    seed,
    setPlaying,
    playingId,
    prompt,
    setPrompt,
    sort,
    setSort,
    lastSearch,
    setLastSearch,
  } = useStore()
  const [libraryOpen, setLibraryOpen] = useState(false)

  const library = useQuery({ queryKey: ['library'], queryFn: api.listLibrary })

  const searchMut = useMutation({
    // Read seed + sort fresh from the store so an auto-search fired right after
    // a track drop picks up the just-detected values (not a stale render value).
    mutationFn: (p: string) =>
      api.search({
        prompt: p,
        seed: useStore.getState().seed ?? undefined,
        sort: useStore.getState().sort,
      }),
    onSuccess: setLastSearch,
  })

  const runSearch = (p: string = prompt) => searchMut.mutate(p.trim() || 'vocal')
  const saveMut = useMutation({
    mutationFn: (s: Sample) => api.saveSample(s, searchMut.variables ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['library'] }),
  })
  const removeMut = useMutation({
    mutationFn: (id: number) => api.deleteSaved(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['library'] }),
  })

  const results = lastSearch?.results ?? []

  return (
    <Box className={styles.shell}>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={1} className={styles.logo}>simpl<span className={styles.accent}>er</span></Title>
          <Text c="dimmed" size="sm">Sampling, simplified.</Text>
        </div>
        <Button variant="light" leftSection={<IconHeart size={16} />} onClick={() => setLibraryOpen(true)}>
          Library ({library.data?.length ?? 0})
        </Button>
      </Group>

      <Stack gap="md">
        <SearchPrompt
          value={prompt}
          onChange={setPrompt}
          loading={searchMut.isPending}
          onSearch={runSearch}
        />
        <Group justify="space-between">
          <SeedBar onSeeded={() => runSearch()} />
          <SegmentedControl
            size="xs" value={sort}
            onChange={(v) => setSort(v as SortKey)}
            data={SORT_KEYS.map((k) => ({ value: k, label: SORT_LABELS[k] }))}
          />
        </Group>

        {seed && <Text size="xs" c="dimmed">Seed: {seedToPrompt(seed)}</Text>}
        {lastSearch?.reasoning && (
          <Paper p="sm" radius="md" withBorder className={styles.reasoning}>
            <Text size="sm">{lastSearch.reasoning}</Text>
          </Paper>
        )}

        <ResultsList
          results={results} loading={searchMut.isPending} playingId={playingId}
          saved={library.data ?? []}
          onPlay={(s) => setPlaying(playingId === s.id ? null : s.id)}
          onSave={(s) => saveMut.mutate(s)}
        />
      </Stack>

      <Player results={results} />
      <LibraryDrawer
        opened={libraryOpen} onClose={() => setLibraryOpen(false)}
        saved={library.data ?? []} onRemove={(id) => removeMut.mutate(id)}
      />
    </Box>
  )
}
