import { Group, ActionIcon, Text, Stack, Badge } from '@mantine/core'
import {
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconHeart,
  IconHeartFilled,
} from '@tabler/icons-react'
import type { Sample } from '@simpler/shared'
import { RightsBadge } from './RightsBadge'
import { formatDuration } from '../lib/license'

const SOURCE_LABELS: Record<string, string> = {
  freesound: 'Freesound',
  archive: 'Archive.org',
  ccmixter: 'ccMixter',
}

interface Props {
  sample: Sample
  playing: boolean
  saved: boolean
  onPlay: () => void
  onSave: () => void
}

export function ResultRow({ sample, playing, saved, onPlay, onSave }: Props) {
  const summary = sample.tags.slice(0, 4).join(' · ')
  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      px="sm"
      py="sm"
      style={{
        borderRadius: 10,
        background: playing ? 'var(--mantine-color-dark-6)' : 'transparent',
        transition: 'background 120ms ease',
      }}
    >
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <ActionIcon
          variant={playing ? 'filled' : 'light'}
          color="teal"
          radius="xl"
          size="lg"
          onClick={onPlay}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <IconPlayerPauseFilled size={16} /> : <IconPlayerPlayFilled size={16} />}
        </ActionIcon>
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text size="sm" fw={500} truncate>
            {sample.name}
          </Text>
          {summary && (
            <Text size="xs" c="dimmed" truncate>
              {summary}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            {sample.username} · {formatDuration(sample.duration)}
          </Text>
        </Stack>
      </Group>
      <Group gap="xs" wrap="nowrap">
        <RightsBadge license={sample.license} />
        {sample.sourceUrl ? (
          <Badge
            component="a"
            href={sample.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            size="xs"
            color="gray"
            style={{ cursor: 'pointer', textDecoration: 'none' }}
          >
            {SOURCE_LABELS[sample.source] ?? sample.source}
          </Badge>
        ) : (
          <Badge variant="outline" size="xs" color="gray">
            {SOURCE_LABELS[sample.source] ?? sample.source}
          </Badge>
        )}
        <ActionIcon
          variant="subtle"
          color={saved ? 'teal' : 'gray'}
          onClick={onSave}
          aria-label="Save"
        >
          {saved ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
        </ActionIcon>
      </Group>
    </Group>
  )
}
