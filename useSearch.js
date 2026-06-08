import { useState, useCallback, useRef } from 'react'
import { searchVocals } from '../api/freesound'

export function useSearch() {
  const [results, setResults] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const search = useCallback(async ({ query, sort }) => {
    if (!query?.trim()) return
    if (abortRef.current) abortRef.current.abort()

    setLoading(true)
    setError(null)

    try {
      const data = await searchVocals({ query, sort })
      setResults(data.results || [])
      setCount(data.count || 0)
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { results, count, loading, error, search }
}
