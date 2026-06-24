export const SORT_KEYS = ['relevant', 'popular', 'newest', 'obscure'] as const
export type SortKey = (typeof SORT_KEYS)[number]

export interface Sample {
  id: string
  name: string
  username: string
  duration: number
  license: string
  previewUrl: string | null
  tags: string[]
}

export interface Seed {
  bpm?: number
  key?: string
  mood?: string
  bpmMin?: number
  bpmMax?: number
}

export interface StructuredQuery {
  keywords: string
  tags: string[]
  filters: { license?: string; minDuration?: number; maxDuration?: number; bpmMin?: number; bpmMax?: number }
  sort: SortKey
  reasoning: string
  role?: string
}

export interface SearchRequest {
  prompt: string
  seed?: Seed
  sort?: SortKey
}

export interface SearchResponse {
  structuredQuery: StructuredQuery
  reasoning: string
  results: Sample[]
  facets?: string[]
}

export interface SavedSample extends Sample {
  savedId: number
  sourcePrompt: string | null
  createdAt: string
}
