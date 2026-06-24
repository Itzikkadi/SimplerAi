import styles from './SearchBar.module.css'

export function SearchBar({ value, onChange, onSearch, hasRef }) {
  const handleKey = (e) => {
    if (e.key === 'Enter') onSearch()
  }

  return (
    <div className={styles.wrap}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder="vocal shout chant aggressive..."
        className={styles.input}
      />
      <button
        onClick={onSearch}
        className={`${styles.btn} ${hasRef ? styles.hasRef : ''}`}
      >
        🔍 {hasRef ? 'חפש + Reference' : 'חפש'}
      </button>
    </div>
  )
}
