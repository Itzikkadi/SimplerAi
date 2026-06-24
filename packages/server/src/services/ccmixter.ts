import https from 'node:https'
import type { Sample, StructuredQuery } from '@simpler/shared'

const TIMEOUT_MS = 8_000
const MAX_DURATION_S = 600

interface CcMixterFormatInfo {
  ps?: string
}

interface CcMixterFile {
  file_nicname?: string
  file_name?: string
  download_url?: string
  file_format_info?: CcMixterFormatInfo
}

interface CcMixterItem {
  upload_id?: number
  upload_name?: string
  user_name?: string
  license_name?: string
  file_page_url?: string
  files?: CcMixterFile[]
}

export function buildCcMixterUrl(q: StructuredQuery): string {
  const params = new URLSearchParams({ f: 'json', type: 'sample', search: q.keywords, limit: '20' })
  return `https://ccmixter.org/api/query?${params}`
}

function parseDuration(ps?: string): number {
  if (!ps) return 0
  const parts = ps.split(':').map(Number)
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
  if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0)
  return 0
}

function normalizeItem(item: CcMixterItem): Sample | null {
  if (!item.upload_id) return null
  const mp3 = item.files?.find(f => f.file_nicname === 'mp3' || f.file_name?.endsWith('.mp3'))
  if (!mp3?.download_url) return null
  const duration = parseDuration(mp3.file_format_info?.ps)
  if (duration > MAX_DURATION_S) return null
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(mp3.download_url)}`
  return {
    id: `ccmixter:${item.upload_id}`,
    name: item.upload_name ?? '',
    username: item.user_name ?? '',
    duration,
    license: item.license_name ?? '',
    previewUrl: proxyUrl,
    tags: [],
    source: 'ccmixter',
    sourceUrl: item.file_page_url ?? `https://ccmixter.org/files/${item.user_name ?? ''}/${item.upload_id}`,
  }
}

function httpsGetJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { req.destroy(); reject(new Error('timeout')) }, TIMEOUT_MS)
    const req = https.get(url, { maxHeaderSize: 65536 }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        clearTimeout(timer)
        if ((res.statusCode ?? 0) >= 400) { reject(new Error(`ccmixter ${res.statusCode}`)); return }
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
        catch (e) { reject(e) }
      })
      res.on('error', (e) => { clearTimeout(timer); reject(e) })
    })
    req.on('error', (e) => { clearTimeout(timer); reject(e) })
  })
}

export async function searchCcMixter(
  q: StructuredQuery,
  fetchImpl?: (url: string) => Promise<CcMixterItem[]>,
): Promise<Sample[]> {
  const url = buildCcMixterUrl(q)
  try {
    const items = fetchImpl
      ? await fetchImpl(url)
      : await httpsGetJson<CcMixterItem[]>(url)
    return items.map(normalizeItem).filter((s): s is Sample => s !== null)
  } catch {
    return []
  }
}
