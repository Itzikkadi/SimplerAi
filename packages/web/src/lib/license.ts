export function licenseBadge(license = ''): { label: string; color: string } {
  const l = license.toLowerCase()
  if (l.includes('publicdomain') || l.includes('zero') || l.includes('cc0'))
    return { label: 'CC0', color: 'teal' }
  if (l.includes('by')) return { label: 'CC BY', color: 'cyan' }
  return { label: 'CC', color: 'gray' }
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
