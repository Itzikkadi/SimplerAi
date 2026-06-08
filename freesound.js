const BACKEND = import.meta.env.VITE_BACKEND_URL

if (!BACKEND) {
  console.warn('[Simpler] VITE_BACKEND_URL is not set. Check your .env file.')
}

export const SORT_OPTIONS = {
  score: 'score',
  downloads: 'downloads',
  created_desc: 'created',
  downloads_asc: 'downloads',
}

export async function searchVocals({ query, sort = 'score', pageSize = 15 }) {
  if (!BACKEND) throw new Error('Backend URL not configured. Check VITE_BACKEND_URL in .env')

  const params = new URLSearchParams({
    q: query,
    sort: SORT_OPTIONS[sort] || 'score',
    page_size: pageSize,
  })

  const res = await fetch(`${BACKEND}/api/search?${params}`)
  if (!res.ok) throw new Error(`Search failed: ${res.status}`)

  const data = await res.json()
  if (data.error) throw new Error(data.error)

  return data
}

export function getLicenseBadge(license = '') {
  if (license.includes('publicdomain') || license.includes('CC0')) return { label: 'CC0', type: 'green' }
  if (license.includes('by/3.0') || license.includes('by/4.0')) return { label: 'CC BY', type: 'teal' }
  return { label: 'CC', type: 'teal' }
}

export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
