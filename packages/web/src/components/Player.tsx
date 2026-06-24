import { useEffect, useRef, useState } from 'react'
import { Paper, Group, ActionIcon, Text, Box, Slider } from '@mantine/core'
import {
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconX,
  IconRewindBackward10,
  IconRewindForward10,
} from '@tabler/icons-react'
import type { Sample } from '@simpler/shared'
import { useStore } from '../store'

function formatTime(secs: number) {
  if (!isFinite(secs) || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const SPEEDS = [0.5, 1, 1.5, 2]

export function Player({ results }: { results: Sample[] }) {
  const { playingId, setPlaying } = useStore()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const seekingRef = useRef(false)

  const current = results.find((s) => s.id === playingId) ?? null

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    setProgress(0)
    setCurrentTime(0)
    setDuration(0)
    if (current?.previewUrl) {
      audio.src = current.previewUrl
      audio.playbackRate = speed
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

  function skip(seconds: number) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds))
  }

  function cycleSpeed() {
    const audio = audioRef.current
    const nextSpeed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]
    setSpeed(nextSpeed)
    if (audio) audio.playbackRate = nextSpeed
  }

  function seekTo(pct: number) {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    audio.currentTime = (pct / 100) * audio.duration
  }

  return (
    <>
      <audio
        ref={audioRef}
        onEnded={() => setPlaying(null)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          if (seekingRef.current) return
          const a = e.currentTarget
          if (a.duration) {
            setProgress((a.currentTime / a.duration) * 100)
            setCurrentTime(a.currentTime)
          }
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
          <Box style={{ maxWidth: 900, margin: '0 auto', padding: '10px 20px 12px' }}>
            <Slider
              value={progress}
              onChange={(v) => {
                seekingRef.current = true
                setProgress(v)
                setCurrentTime((duration * v) / 100)
              }}
              onChangeEnd={(v) => {
                seekTo(v)
                seekingRef.current = false
              }}
              size="xs"
              color="teal"
              thumbSize={10}
              label={(v) => formatTime((v / 100) * duration)}
              mb={8}
              styles={{ track: { cursor: 'pointer' } }}
            />
            <Group gap="xs" wrap="nowrap" align="center">
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                onClick={() => skip(-10)}
                aria-label="Skip back 10 seconds"
                title="−10s"
              >
                <IconRewindBackward10 size={18} />
              </ActionIcon>

              <ActionIcon
                size="lg"
                radius="xl"
                variant="filled"
                color="teal"
                onClick={toggle}
                aria-label={paused ? 'Play' : 'Pause'}
              >
                {paused ? (
                  <IconPlayerPlayFilled size={18} />
                ) : (
                  <IconPlayerPauseFilled size={18} />
                )}
              </ActionIcon>

              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                onClick={() => skip(10)}
                aria-label="Skip forward 10 seconds"
                title="+10s"
              >
                <IconRewindForward10 size={18} />
              </ActionIcon>

              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={500} truncate>
                  {current.name}
                </Text>
              </Box>

              <Text
                size="xs"
                c="dimmed"
                style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
              >
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>

              <ActionIcon
                size="sm"
                variant="light"
                color="teal"
                onClick={cycleSpeed}
                aria-label={`Speed: ${speed}×`}
                title="Cycle playback speed"
                style={{ fontSize: 11, fontWeight: 700, minWidth: 36 }}
              >
                {speed}×
              </ActionIcon>

              <Text size="xs" c="dimmed" visibleFrom="sm" truncate style={{ maxWidth: 100 }}>
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
          </Box>
        </Paper>
      )}
    </>
  )
}
