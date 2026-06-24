import { useState } from 'react'
import { Group, Badge, NumberInput, TextInput, Loader, Text, ActionIcon } from '@mantine/core'
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

export function SeedBar({ onSeeded }: { onSeeded?: () => void }) {
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
      setSeed({
        ...seed,
        bpm,
        bpmMin: Math.max(40, bpm - 6),
        bpmMax: bpm + 6,
        mood: mood.join(', '),
      })
      setSeedFileName(file.name)
      onSeeded?.()
    } catch {
      setError("Couldn't analyze — try another file")
    } finally {
      setBusy(false)
    }
  }

  const moodTags = seed?.mood
    ? seed.mood.split(',').map((m) => m.trim()).filter(Boolean)
    : []

  return (
    <Group gap="sm" wrap="nowrap">
      <Dropzone
        onDrop={onDrop}
        onReject={() => setError('Audio files only')}
        accept={AUDIO_MIME}
        multiple={false}
        loading={busy}
        py={6}
        px="sm"
        radius="md"
        style={{ borderStyle: 'dashed', cursor: 'pointer' }}
      >
        <Group gap="xs" wrap="nowrap" style={{ pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconWaveSine size={18} />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size={18} />
          </Dropzone.Reject>
          <Dropzone.Idle>{busy ? <Loader size={16} /> : <IconMusic size={18} />}</Dropzone.Idle>
          <Text size="sm" c="dimmed">
            {busy ? 'Analyzing…' : 'Drop a track or click to seed'}
          </Text>
        </Group>
      </Dropzone>

      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}

      {seed?.bpm != null && (
        <>
          <Group gap={4} wrap="nowrap">
            <NumberInput
              size="xs"
              w={70}
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
              w={86}
              hideControls
              suffix=" bpm"
              aria-label="max bpm"
              value={seed.bpmMax ?? seed.bpm}
              onChange={(v) => setSeed({ ...seed, bpmMax: Number(v) })}
            />
          </Group>
          <TextInput
            size="xs"
            w={66}
            placeholder="key"
            value={seed.key ?? ''}
            onChange={(e) => setSeed({ ...seed, key: e.currentTarget.value })}
          />
          {moodTags.map((t) => (
            <Badge key={t} size="sm" variant="light" color="teal">
              {t}
            </Badge>
          ))}
          {seedFileName && (
            <Text size="xs" c="dimmed" maw={140} truncate title={seedFileName}>
              ♪ {seedFileName}
            </Text>
          )}
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            onClick={() => clearSeed()}
            aria-label="Clear seed"
          >
            <IconX size={14} />
          </ActionIcon>
        </>
      )}
    </Group>
  )
}
