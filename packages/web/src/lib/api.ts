import type { SearchRequest, SearchResponse, SavedSample, Sample } from '@simpler/shared'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}

export const api = {
  search: (req: SearchRequest, signal?: AbortSignal) =>
    fetch(`${BASE}/search`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req), signal,
    }).then(json<SearchResponse>),
  listLibrary: () => fetch(`${BASE}/library`).then(json<SavedSample[]>),
  saveSample: (s: Sample, sourcePrompt?: string) =>
    fetch(`${BASE}/library`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...s, sourcePrompt }),
    }).then(json<SavedSample>),
  deleteSaved: (savedId: number) =>
    fetch(`${BASE}/library/${savedId}`, { method: 'DELETE' }).then(json<{ ok: true }>),
}
