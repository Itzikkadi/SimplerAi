import { Group, ActionIcon, Text, Stack } from '@mantine/core'
import { IconPlayerPlay, IconPlayerPause, IconHeart, IconHeartFilled } from '@tabler/icons-react'
import type { Sample } from '@simpler/shared'
import { RightsBadge } from './RightsBadge'
import { formatDuration } from '../lib/license'

interface Props {
  sample: Sample
  playing: boolean
  saved: boolean
  onPlay: () => void
  onSave: () => void
}

export function ResultRow({ sample, playing, saved, onPlay, onSave }: Props) {
  return (
    <Group justify="space-between" wrap="nowrap" py="xs">
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <ActionIcon variant="light" radius="xl" onClick={onPlay} aria-label="Play">
          {playing ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}
        </ActionIcon>
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text size="sm" fw={500} truncate>{sample.name}</Text>
          <Text size="xs" c="dimmed">{sample.username} · {formatDuration(sample.duration)}</Text>
        </Stack>
      </Group>
      <Group gap="xs" wrap="nowrap">
        <RightsBadge license={sample.license} />
        <ActionIcon variant="subtle" color={saved ? 'teal' : 'gray'} onClick={onSave} aria-label="Save">
          {saved ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
        </ActionIcon>
      </Group>
    </Group>
  )
}
