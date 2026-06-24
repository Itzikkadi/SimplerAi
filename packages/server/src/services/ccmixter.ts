import https from 'node:https'
import type { Sample, StructuredQuery } from '@simpler/shared'

const TIMEOUT_MS = 8_000

interface CcMixterFile {
  file_nicname?: string
  file_name?: string
  download_url?: string
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

function normalizeItem(item: CcMixterItem): Sample | null {
  if (!item.upload_id) return null
  const mp3 = item.files?.find(f => f.file_nicname === 'mp3' || f.file_name?.endsWith('.mp3'))
  if (!mp3?.download_url) return null
  return {
    id: `ccmixter:${item.upload_id}`,
    name: item.upload_name ?? '',
    username: item.user_name ?? '',
    duration: 0,
    license: item.license_name ?? '',
    previewUrl: mp3.download_url,
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
