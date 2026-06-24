import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Group, Title, Text, Stack, Button, SegmentedControl, Box } from '@mantine/core'
import { IconHeart, IconSparkles } from '@tabler/icons-react'
import { SORT_KEYS, type Sample, type SortKey } from '@simpler/shared'
import { api } from './lib/api'
import { useStore } from './store'
import { SearchPrompt } from './components/SearchPrompt'
import { ReferenceTrack } from './components/ReferenceTrack'
import { ResultsList } from './components/ResultsList'
import { Player } from './components/Player'
import { LibraryDrawer } from './components/LibraryDrawer'
import styles from './App.module.css'

const SORT_LABELS: Record<SortKey, string> = {
  relevant: 'Relevant',
  popular: 'Popular',
  newest: 'Newest',
  obscure: 'Most obscure',
}

export function App() {
  const qc = useQueryClient()
  const {
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
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1} className={styles.logo}>
            simpl<span className={styles.accent}>er</span>
          </Title>
          <Text c="dimmed" size="sm">
            Sampling, simplified.
          </Text>
        </div>
        <Button
          variant="light"
          leftSection={<IconHeart size={16} />}
          onClick={() => setLibraryOpen(true)}
        >
          Library ({library.data?.length ?? 0})
        </Button>
      </Group>

      <Stack gap="lg">
        <SearchPrompt
          value={prompt}
          onChange={setPrompt}
          loading={searchMut.isPending}
          onSearch={runSearch}
        />

        <ReferenceTrack onSeeded={() => runSearch()} />

        <Group justify="space-between" align="center">
          <SegmentedControl
            size="xs"
            value={sort}
            onChange={(v) => {
              setSort(v as SortKey)
              runSearch()
            }}
            data={SORT_KEYS.map((k) => ({ value: k, label: SORT_LABELS[k] }))}
          />
          {results.length > 0 && (
            <Text size="xs" c="dimmed">
              {results.length} samples
            </Text>
          )}
        </Group>

        {lastSearch?.reasoning && (
          <Group gap={6} wrap="nowrap" className={styles.reasoning}>
            <IconSparkles size={14} />
            <Text size="xs" c="dimmed" fs="italic">
              {lastSearch.reasoning}
            </Text>
          </Group>
        )}

        <ResultsList
          results={results}
          loading={searchMut.isPending}
          playingId={playingId}
          saved={library.data ?? []}
          onPlay={(s) => setPlaying(playingId === s.id ? null : s.id)}
          onSave={(s) => saveMut.mutate(s)}
        />
      </Stack>

      <Player results={results} />
      <LibraryDrawer
        opened={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        saved={library.data ?? []}
        onRemove={(id) => removeMut.mutate(id)}
      />
    </Box>
  )
}
