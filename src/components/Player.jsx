import styles from './Player.module.css'

export function Player({ name, progress, playing, onToggle, onSeek }) {
  if (!name) return null

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    onSeek(pct)
  }

  return (
    <div className={styles.bar}>
      <button className={styles.playBtn} onClick={onToggle}>
        {playing ? '⏸' : '▶'}
      </button>
      <span className={styles.name}>{name}</span>
      <div className={styles.progWrap} onClick={handleClick}>
        <div className={styles.prog} style={{ width: `${progress}%` }} />
      </div>
      <span className={styles.time}>
        {Math.floor(progress / 100 * 30)}s
      </span>
    </div>
  )
}
