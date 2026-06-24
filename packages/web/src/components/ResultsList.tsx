import { Stack, Divider, Text, Center, Loader } from '@mantine/core'
import type { Sample, SavedSample } from '@simpler/shared'
import { ResultRow } from './ResultRow'

interface Props {
  results: Sample[]
  loading: boolean
  playingId: string | null
  saved: SavedSample[]
  onPlay: (s: Sample) => void
  onSave: (s: Sample) => void
}

export function ResultsList({ results, loading, playingId, saved, onPlay, onSave }: Props) {
  if (loading) return <Center py="xl"><Loader color="teal" /></Center>
  if (!results.length) return <Center py="xl"><Text c="dimmed">No samples yet — describe what you need.</Text></Center>
  const savedIds = new Set(saved.map((s) => s.id))
  return (
    <Stack gap={0}>
      {results.map((s, i) => (
        <div key={s.id}>
          {i > 0 && <Divider opacity={0.4} />}
          <ResultRow
            sample={s} playing={playingId === s.id} saved={savedIds.has(s.id)}
            onPlay={() => onPlay(s)} onSave={() => onSave(s)}
          />
        </div>
      ))}
    </Stack>
  )
}
