import type { Sample, StructuredQuery } from '@simpler/shared'

const TIMEOUT_MS = 6_000
const TOTAL_MS = 5_000
const ROWS = 4

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
  return `(${terms}) AND mediatype:audio AND format:MP3`
}

function pickAudioFile(files: ArchiveFile[]): ArchiveFile | undefined {
  return (
    files.find(f => f.format === 'VBR MP3' || f.format === 'MP3') ??
    files.find(f => f.format === 'Ogg Vorbis')
  )
}

function buildFileUrl(identifier: string, filename: string): string {
  const encodedParts = filename.split('/').map(encodeURIComponent).join('/')
  return `https://archive.org/download/${identifier}/${encodedParts}`
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
    const parsedDuration = parseFloat(audio.length ?? '')
    return {
      id: `archive:${doc.identifier}`,
      name: doc.title ?? doc.identifier,
      username: doc.creator ?? 'archive.org',
      duration: Number.isFinite(parsedDuration) ? parsedDuration : 0,
      license: '',
      previewUrl: buildFileUrl(doc.identifier, audio.name),
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
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier,title,creator&output=json&rows=${ROWS}`
  let docs: ArchiveDoc[]
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return []
    const data = (await res.json()) as { response?: { docs?: ArchiveDoc[] } }
    docs = data.response?.docs ?? []
  } catch {
    return []
  }
  const work = Promise.allSettled(docs.map(doc => resolveItem(doc, fetchImpl)))
    .then(settled =>
      settled
        .filter((r): r is PromiseFulfilledResult<Sample | null> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter((s): s is Sample => s !== null),
    )
  const timeout = new Promise<Sample[]>(resolve => setTimeout(() => resolve([]), TOTAL_MS))
  return Promise.race([work, timeout])
}
