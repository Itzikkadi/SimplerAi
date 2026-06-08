import { getLicenseBadge, formatDuration } from '../api/freesound'
import styles from './ResultRow.module.css'

export function ResultRow({ result, isPlaying, isSaved, onPlay, onSave }) {
  const previewUrl = result.previews?.['preview-hq-mp3'] || ''
  const badge = getLicenseBadge(result.license)

  return (
    <div className={`${styles.row} ${isPlaying ? styles.playing : ''}`}>
      <button
        className={`${styles.playBtn} ${isPlaying ? styles.active : ''}`}
        onClick={() => onPlay(result.id, previewUrl, result.name)}
        disabled={!previewUrl}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <div className={styles.info}>
        <div className={styles.name}>{result.name}</div>
        <div className={styles.meta}>
          <span className={styles.dur}>{formatDuration(result.duration)}</span>
          <span className={`${styles.badge} ${styles[badge.type]}`}>{badge.label}</span>
          {result.tags?.slice(0, 3).map(tag => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
      </div>

      <button
        className={`${styles.iconBtn} ${isSaved ? styles.saved : ''}`}
        onClick={() => onSave(result.id)}
        aria-label={isSaved ? 'Unsave' : 'Save'}
      >
        {isSaved ? '♥' : '♡'}
      </button>
    </div>
  )
}
