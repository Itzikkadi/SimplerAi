import { useState } from 'react'
import { Group, Badge, NumberInput, TextInput, Loader, Text, ActionIcon } from '@mantine/core'
import { Dropzone, type FileWithPath } from '@mantine/dropzone'
import { IconMusic, IconWaveSine, IconX } from '@tabler/icons-react'
import { detectBpm } from '../audio/analyze'
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

export function SeedBar() {
  const { seed, setSeed } = useStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onDrop(files: FileWithPath[]) {
    const file = files[0]
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const bpm = await detectBpm(file)
      setSeed({ ...seed, bpm })
    } catch {
      setError("Couldn't read BPM — try another file")
    } finally {
      setBusy(false)
    }
  }

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
          <Dropzone.Idle>
            {busy ? <Loader size={16} /> : <IconMusic size={18} />}
          </Dropzone.Idle>
          <Text size="sm" c="dimmed">
            {busy ? 'Reading BPM…' : 'Drop a track or click to seed'}
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
          <NumberInput
            size="xs"
            w={110}
            value={seed.bpm}
            suffix=" bpm"
            onChange={(v) => setSeed({ ...seed, bpm: Number(v) })}
          />
          <TextInput
            size="xs"
            w={90}
            placeholder="key"
            value={seed.key ?? ''}
            onChange={(e) => setSeed({ ...seed, key: e.currentTarget.value })}
          />
          <Badge variant="dot" color="teal">
            seeded
          </Badge>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            onClick={() => setSeed(null)}
            aria-label="Clear seed"
          >
            <IconX size={14} />
          </ActionIcon>
        </>
      )}
    </Group>
  )
}
