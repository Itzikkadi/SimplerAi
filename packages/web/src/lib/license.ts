export function licenseBadge(license = ''): { label: string; color: string; tooltip: string } {
  const l = license.toLowerCase()
  if (l.includes('publicdomain') || l.includes('zero') || l.includes('cc0'))
    return { label: 'CC0', color: 'teal', tooltip: 'Public domain — free to use, no attribution needed.' }
  if (l.includes('by-nc'))
    return { label: 'CC BY-NC', color: 'yellow', tooltip: 'Free for non-commercial use, with attribution.' }
  if (l.includes('by'))
    return { label: 'CC BY', color: 'cyan', tooltip: 'Free to use with credit to the creator.' }
  if (l.includes('sampling'))
    return { label: 'Sampling+', color: 'grape', tooltip: 'Sampling allowed — check the terms.' }
  if (!l) return { label: 'Unknown', color: 'gray', tooltip: 'License not stated — verify rights before use.' }
  return { label: 'CC', color: 'gray', tooltip: 'Creative Commons — check the specific terms.' }
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
