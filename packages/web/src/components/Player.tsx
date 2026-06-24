import { useEffect, useRef, useState } from 'react'
import { Paper, Group, ActionIcon, Text, Progress, Box } from '@mantine/core'
import { IconPlayerPlayFilled, IconPlayerPauseFilled, IconX } from '@tabler/icons-react'
import type { Sample } from '@simpler/shared'
import { useStore } from '../store'

export function Player({ results }: { results: Sample[] }) {
  const { playingId, setPlaying } = useStore()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)

  const current = results.find((s) => s.id === playingId) ?? null

  // Start/stop playback when the selected sample changes.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    setProgress(0)
    if (current?.previewUrl) {
      audio.src = current.previewUrl
      void audio.play()
      setPaused(false)
    } else {
      audio.pause()
    }
  }, [playingId])

  function toggle() {
    const audio = audioRef.current
    if (!audio || !current?.previewUrl) return
    if (audio.paused) {
      void audio.play()
      setPaused(false)
    } else {
      audio.pause()
      setPaused(true)
    }
  }

  return (
    <>
      <audio
        ref={audioRef}
        onEnded={() => setPlaying(null)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget
          if (a.duration) setProgress((a.currentTime / a.duration) * 100)
        }}
      />
      {current && (
        <Paper
          shadow="md"
          withBorder
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            borderRadius: 0,
            zIndex: 200,
          }}
        >
          <Group
            gap="sm"
            wrap="nowrap"
            style={{ maxWidth: 760, margin: '0 auto', padding: '10px 20px' }}
          >
            <ActionIcon
              size="lg"
              radius="xl"
              variant="filled"
              color="teal"
              onClick={toggle}
              aria-label={paused ? 'Play' : 'Pause'}
            >
              {paused ? <IconPlayerPlayFilled size={18} /> : <IconPlayerPauseFilled size={18} />}
            </ActionIcon>
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={500} truncate>
                {current.name}
              </Text>
              <Progress value={progress} size="xs" color="teal" mt={4} />
            </Box>
            <Text size="xs" c="dimmed" visibleFrom="xs">
              {current.username}
            </Text>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => setPlaying(null)}
              aria-label="Stop"
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>
        </Paper>
      )}
    </>
  )
}
