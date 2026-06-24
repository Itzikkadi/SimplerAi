import { useState, useCallback } from 'react'

export function useSavedSamples() {
  const [saved, setSaved] = useState(new Set())

  const toggle = useCallback((id) => {
    setSaved(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  return { saved, toggle }
}
