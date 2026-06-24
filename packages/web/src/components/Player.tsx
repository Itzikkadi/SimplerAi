import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import type { Sample } from '@simpler/shared'

export function Player({ results }: { results: Sample[] }) {
  const { playingId, setPlaying } = useStore()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const sample = results.find((s) => s.id === playingId)
    if (!audioRef.current) return
    if (sample?.previewUrl) {
      audioRef.current.src = sample.previewUrl
      void audioRef.current.play()
    } else {
      audioRef.current.pause()
    }
  }, [playingId, results])

  return <audio ref={audioRef} onEnded={() => setPlaying(null)} />
}
