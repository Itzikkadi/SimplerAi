import styles from './QuickTags.module.css'

const TAGS = [
  { label: 'Shout', query: 'vocal shout aggressive' },
  { label: 'Chant', query: 'tribal chant vocal' },
  { label: 'Gospel', query: 'gospel choir shout' },
  { label: 'Male yell', query: 'male yell raw' },
  { label: 'Female raw', query: 'female vocal raw' },
  { label: 'Spoken', query: 'spoken word aggressive' },
  { label: 'African', query: 'african vocal chant' },
]

export function QuickTags({ activeQuery, onSelect }) {
  return (
    <div className={styles.wrap}>
      {TAGS.map(tag => (
        <button
          key={tag.label}
          onClick={() => onSelect(tag.query)}
          className={`${styles.tag} ${activeQuery === tag.query ? styles.active : ''}`}
        >
          {tag.label}
        </button>
      ))}
    </div>
  )
}
