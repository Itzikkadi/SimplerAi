import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Group, Title, Text, Stack, Button, Paper, SegmentedControl, Box } from '@mantine/core'
import { IconHeart } from '@tabler/icons-react'
import { SORT_KEYS, type Sample, type SortKey, type SearchResponse } from '@simpler/shared'
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
  const { seed, setPlaying, playingId } = useStore()
  const [sort, setSort] = useState<SortKey>('relevant')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [data, setData] = useState<SearchResponse | null>(null)

  const library = useQuery({ queryKey: ['library'], queryFn: api.listLibrary })

  const searchMut = useMutation({
    mutationFn: (prompt: string) => api.search({ prompt, seed: seed ?? undefined, sort }),
    onSuccess: setData,
  })
  const saveMut = useMutation({
    mutationFn: (s: Sample) => api.saveSample(s, searchMut.variables ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['library'] }),
  })
  const removeMut = useMutation({
    mutationFn: (id: number) => api.deleteSaved(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['library'] }),
  })

  const results = data?.results ?? []

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
        <SearchPrompt loading={searchMut.isPending} onSearch={(p) => searchMut.mutate(p)} />
        <Group justify="space-between">
          <SeedBar />
          <SegmentedControl
            size="xs" value={sort}
            onChange={(v) => setSort(v as SortKey)}
            data={SORT_KEYS.map((k) => ({ value: k, label: SORT_LABELS[k] }))}
          />
        </Group>

        {seed && <Text size="xs" c="dimmed">Seed: {seedToPrompt(seed)}</Text>}
        {data?.reasoning && (
          <Paper p="sm" radius="md" withBorder className={styles.reasoning}>
            <Text size="sm">{data.reasoning}</Text>
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
