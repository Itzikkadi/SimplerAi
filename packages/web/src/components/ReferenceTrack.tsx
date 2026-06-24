import { useState } from 'react'
import {
  Paper,
  Group,
  Text,
  Badge,
  NumberInput,
  TextInput,
  Loader,
  ActionIcon,
  Box,
} from '@mantine/core'
import { Dropzone, type FileWithPath } from '@mantine/dropzone'
import { IconMusic, IconWaveSine, IconX } from '@tabler/icons-react'
import { analyzeTrack } from '../audio/analyze'
import { useStore } from '../store'

const AUDIO_MIME = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/mp4',
  'audio/x-m4a',
]

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text tt="uppercase" fz={10} fw={700} c="dimmed" mb={4} style={{ letterSpacing: '0.06em' }}>
      {children}
    </Text>
  )
}

export function ReferenceTrack({ onSeeded }: { onSeeded?: () => void }) {
  const { seed, setSeed, seedFileName, setSeedFileName, clearSeed } = useStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onDrop(files: FileWithPath[]) {
    const file = files[0]
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const { bpm, mood } = await analyzeTrack(file)
      setSeed({ ...seed, bpm, bpmMin: Math.max(40, bpm - 6), bpmMax: bpm + 6, mood: mood.join(', ') })
      setSeedFileName(file.name)
      onSeeded?.()
    } catch {
      setError("Couldn't analyze that file — try another.")
    } finally {
      setBusy(false)
    }
  }

  const moodTags = seed?.mood
    ? seed.mood.split(',').map((m) => m.trim()).filter(Boolean)
    : []

  // Empty state — slim dropzone, clearly optional.
  if (seed?.bpm == null) {
    return (
      <div>
        <Label>Reference track · optional</Label>
        <Dropzone
          onDrop={onDrop}
          onReject={() => setError('Audio files only')}
          accept={AUDIO_MIME}
          multiple={false}
          loading={busy}
          py="md"
          px="md"
          radius="md"
          style={{ borderStyle: 'dashed', cursor: 'pointer' }}
        >
          <Group gap="sm" wrap="nowrap" style={{ pointerEvents: 'none' }}>
            <Dropzone.Accept>
              <IconWaveSine size={20} />
            </Dropzone.Accept>
            <Dropzone.Idle>{busy ? <Loader size={18} /> : <IconMusic size={20} />}</Dropzone.Idle>
            <div>
              <Text size="sm">{busy ? 'Analyzing your track…' : 'Drop a track to match its vibe'}</Text>
              <Text size="xs" c="dimmed">
                We read its tempo & mood to steer the search — your file stays in your browser.
              </Text>
            </div>
          </Group>
        </Dropzone>
        {error && (
          <Text size="xs" c="red" mt={6}>
            {error}
          </Text>
        )}
      </div>
    )
  }

  // Loaded state — distinct tinted card, clearly labeled "From your track".
  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      style={{
        background: 'var(--mantine-color-dark-6)',
        borderColor: 'var(--mantine-color-teal-8)',
      }}
    >
      <Group justify="space-between" mb="md" wrap="nowrap">
        <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
          <IconMusic size={16} color="var(--mantine-color-teal-4)" />
          <Text size="sm" fw={600}>
            From your track
          </Text>
          {seedFileName && (
            <Text size="xs" c="dimmed" truncate maw={200} title={seedFileName}>
              {seedFileName}
            </Text>
          )}
        </Group>
        <ActionIcon variant="subtle" color="gray" onClick={clearSeed} aria-label="Remove track">
          <IconX size={16} />
        </ActionIcon>
      </Group>

      <Group gap={40} align="flex-start">
        <Box>
          <Label>Tempo</Label>
          <Group gap={6} wrap="nowrap">
            <NumberInput
              size="xs"
              w={62}
              hideControls
              aria-label="min bpm"
              value={seed.bpmMin ?? seed.bpm}
              onChange={(v) => setSeed({ ...seed, bpmMin: Number(v) })}
            />
            <Text size="xs" c="dimmed">
              –
            </Text>
            <NumberInput
              size="xs"
              w={78}
              hideControls
              suffix=" bpm"
              aria-label="max bpm"
              value={seed.bpmMax ?? seed.bpm}
              onChange={(v) => setSeed({ ...seed, bpmMax: Number(v) })}
            />
          </Group>
        </Box>
        <Box>
          <Label>Mood (detected)</Label>
          <Group gap={6}>
            {moodTags.length ? (
              moodTags.map((t) => (
                <Badge key={t} variant="light" color="teal" size="sm">
                  {t}
                </Badge>
              ))
            ) : (
              <Text size="xs" c="dimmed">
                —
              </Text>
            )}
          </Group>
        </Box>
        <Box>
          <Label>Key</Label>
          <TextInput
            size="xs"
            w={70}
            placeholder="—"
            value={seed.key ?? ''}
            onChange={(e) => setSeed({ ...seed, key: e.currentTarget.value })}
          />
        </Box>
      </Group>
    </Paper>
  )
}
