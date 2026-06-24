import { useState, useCallback, useEffect } from 'react'
import { SearchBar } from './components/SearchBar'
import { QuickTags } from './components/QuickTags'
import { SortToolbar } from './components/SortToolbar'
import { ResultsList } from './components/ResultsList'
import { Player } from './components/Player'
import { useSearch } from './hooks/useSearch'
import { usePlayer } from './hooks/usePlayer'
import { useSavedSamples } from './hooks/useSavedSamples'
import styles from './App.module.css'

const DEFAULT_QUERY = 'vocal shout aggressive'

export default function App() {
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [sort, setSort] = useState('score')

  const { results, count, loading, error, search } = useSearch()
  const { currentId, playing, progress, currentName, toggle, seek, pause } = usePlayer()
  const { saved, toggle: toggleSave } = useSavedSamples()

  const runSearch = useCallback((q = query, s = sort) => {
    search({ query: q, sort: s })
  }, [query, sort, search])

  const handleTagSelect = (q) => {
    setQuery(q)
    runSearch(q, sort)
  }

  const handleSort = (s) => {
    setSort(s)
    runSearch(query, s)
  }

  const handlePlay = (id, url, name) => {
    if (!url) return
    toggle(id, url, name)
  }

  useEffect(() => {
    runSearch(DEFAULT_QUERY, 'score')
  }, [])

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.logo}>simpl<span>er</span></h1>
          <p className={styles.tagline}>Sampling, simplified.</p>
        </div>
      </header>

      <main className={styles.main}>
        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={() => runSearch()}
          hasRef={false}
        />

        <QuickTags
          activeQuery={query}
          onSelect={handleTagSelect}
        />

        <SortToolbar
          sort={sort}
          onSort={handleSort}
          count={count}
        />

        <ResultsList
          results={results}
          loading={loading}
          error={error}
          currentId={currentId}
          saved={saved}
          onPlay={handlePlay}
          onSave={toggleSave}
        />

        <Player
          name={currentName}
          progress={progress}
          playing={playing}
          onToggle={() => playing ? pause() : toggle(currentId, null, currentName)}
          onSeek={seek}
        />
      </main>
    </div>
  )
}
