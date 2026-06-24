import type { Sample, StructuredQuery } from '@simpler/shared'

const TIMEOUT_MS = 8_000

interface ArchiveDoc {
  identifier: string
  title?: string
  creator?: string
}

interface ArchiveFile {
  name: string
  format: string
  length?: string
}

export function buildArchiveQuery(q: StructuredQuery): string {
  const terms = [q.keywords, ...q.tags].filter(Boolean).join(' ')
  return `(${terms}) AND mediatype:audio`
}

function pickAudioFile(files: ArchiveFile[]): ArchiveFile | undefined {
  return (
    files.find(f => f.format === 'VBR MP3' || f.format === 'MP3') ??
    files.find(f => f.format === 'Ogg Vorbis')
  )
}

async function resolveItem(doc: ArchiveDoc, fetchImpl: typeof fetch): Promise<Sample | null> {
  try {
    const res = await fetchImpl(`https://archive.org/metadata/${doc.identifier}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { files?: ArchiveFile[] }
    const audio = pickAudioFile(data.files ?? [])
    if (!audio) return null
    return {
      id: `archive:${doc.identifier}`,
      name: doc.title ?? doc.identifier,
      username: doc.creator ?? 'archive.org',
      duration: (() => {
        const parsedDuration = parseFloat(audio.length)
        return Number.isFinite(parsedDuration) ? parsedDuration : 0
      })(),
      license: '',
      previewUrl: `https://archive.org/download/${doc.identifier}/${encodeURIComponent(audio.name)}`,
      tags: [],
      source: 'archive',
      sourceUrl: `https://archive.org/details/${doc.identifier}`,
    }
  } catch {
    return null
  }
}

export async function searchArchive(
  q: StructuredQuery,
  fetchImpl: typeof fetch = fetch,
): Promise<Sample[]> {
  const query = buildArchiveQuery(q)
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier,title,creator&output=json&rows=10`
  let docs: ArchiveDoc[]
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return []
    const data = (await res.json()) as { response?: { docs?: ArchiveDoc[] } }
    docs = data.response?.docs ?? []
  } catch {
    return []
  }
  const settled = await Promise.allSettled(docs.map(doc => resolveItem(doc, fetchImpl)))
  return settled
    .filter((r): r is PromiseFulfilledResult<Sample | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((s): s is Sample => s !== null)
}
