import { ResultRow } from './ResultRow'
import styles from './ResultsList.module.css'

export function ResultsList({ results, loading, error, currentId, saved, onPlay, onSave }) {
  if (loading) return <div className={styles.state}>🔍 מחפש...</div>
  if (error) return <div className={styles.error}>❌ {error}</div>
  if (!results.length) return <div className={styles.state}>לחץ חפש להתחיל</div>

  return (
    <div className={styles.list}>
      {results.map(r => (
        <ResultRow
          key={r.id}
          result={r}
          isPlaying={currentId === r.id}
          isSaved={saved.has(r.id)}
          onPlay={onPlay}
          onSave={onSave}
        />
      ))}
    </div>
  )
}
