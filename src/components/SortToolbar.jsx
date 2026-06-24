import styles from './SortToolbar.module.css'

const SORTS = [
  { key: 'score', label: '⚡ רלוונטי' },
  { key: 'downloads', label: '🔥 פופולרי' },
  { key: 'created_desc', label: '✨ חדש' },
  { key: 'downloads_asc', label: '👁 נסתר' },
]

export function SortToolbar({ sort, onSort, count }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.sorts}>
        {SORTS.map(s => (
          <button
            key={s.key}
            onClick={() => onSort(s.key)}
            className={`${styles.btn} ${sort === s.key ? styles.active : ''}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {count > 0 && (
        <span className={styles.count}>{count.toLocaleString()} תוצאות</span>
      )}
    </div>
  )
}
