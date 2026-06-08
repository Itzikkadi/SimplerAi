import { useState, useRef, useCallback, useEffect } from 'react'

export function usePlayer() {
  const [currentId, setCurrentId] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentName, setCurrentName] = useState('')
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)
  const rafRef = useRef(null)

  const tick = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    setProgress((audio.currentTime / audio.duration) * 100)
    if (!audio.paused) rafRef.current = requestAnimationFrame(tick)
  }, [])

  const play = useCallback((id, url, name) => {
    if (audioRef.current) {
      audioRef.current.pause()
      cancelAnimationFrame(rafRef.current)
    }

    const audio = new Audio(url)
    audioRef.current = audio

    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration))
    audio.addEventListener('ended', () => {
      setPlaying(false)
      setCurrentId(null)
      setProgress(0)
      cancelAnimationFrame(rafRef.current)
    })

    audio.play().then(() => {
      setCurrentId(id)
      setCurrentName(name)
      setPlaying(true)
      setProgress(0)
      rafRef.current = requestAnimationFrame(tick)
    }).catch(() => {})
  }, [tick])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setPlaying(false)
    cancelAnimationFrame(rafRef.current)
  }, [])

  const resume = useCallback(() => {
    audioRef.current?.play().then(() => {
      setPlaying(true)
      rafRef.current = requestAnimationFrame(tick)
    }).catch(() => {})
  }, [tick])

  const toggle = useCallback((id, url, name) => {
    if (currentId === id) {
      if (playing) pause()
      else resume()
    } else {
      play(id, url, name)
    }
  }, [currentId, playing, play, pause, resume])

  const seek = useCallback((pct) => {
    const audio = audioRef.current
    if (audio?.duration) {
      audio.currentTime = (pct / 100) * audio.duration
      setProgress(pct)
    }
  }, [])

  useEffect(() => () => {
    audioRef.current?.pause()
    cancelAnimationFrame(rafRef.current)
  }, [])

  return { currentId, playing, progress, currentName, duration, toggle, seek, pause }
}
