import Database from 'better-sqlite3'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Sample, SavedSample, StructuredQuery } from '@simpler/shared'

const here = dirname(fileURLToPath(import.meta.url))
const schema = readFileSync(join(here, 'schema.sql'), 'utf8')

export function createDb(path: string): Database.Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.exec(schema)
  return db
}

export function saveSample(db: Database.Database, s: Sample, sourcePrompt: string | null): SavedSample {
  const stmt = db.prepare(
    `INSERT INTO saved_samples (freesound_id, name, username, duration, license, preview_url, tags, source_prompt)
     VALUES (@id, @name, @username, @duration, @license, @previewUrl, @tags, @sourcePrompt)
     ON CONFLICT(freesound_id) DO UPDATE SET source_prompt=excluded.source_prompt
     RETURNING saved_id as savedId, created_at as createdAt`,
  )
  const row = stmt.get({ ...s, tags: JSON.stringify(s.tags), sourcePrompt }) as { savedId: number; createdAt: string }
  return { ...s, savedId: row.savedId, sourcePrompt, createdAt: row.createdAt }
}

export function listSaved(db: Database.Database): SavedSample[] {
  const rows = db.prepare(`SELECT * FROM saved_samples ORDER BY created_at DESC`).all() as Record<string, unknown>[]
  return rows.map((r) => ({
    savedId: r.saved_id as number,
    id: r.freesound_id as string,
    name: r.name as string,
    username: r.username as string,
    duration: r.duration as number,
    license: r.license as string,
    previewUrl: (r.preview_url as string) ?? null,
    tags: JSON.parse(r.tags as string),
    sourcePrompt: (r.source_prompt as string) ?? null,
    createdAt: r.created_at as string,
  }))
}

export function deleteSaved(db: Database.Database, savedId: number): void {
  db.prepare(`DELETE FROM saved_samples WHERE saved_id = ?`).run(savedId)
}

export function logSearch(db: Database.Database, prompt: string, q: StructuredQuery, count: number): void {
  db.prepare(`INSERT INTO searches (prompt, structured_query, result_count) VALUES (?, ?, ?)`).run(
    prompt, JSON.stringify(q), count,
  )
}

const CACHE_TTL_MS = 1000 * 60 * 30
export function readCache(db: Database.Database, hash: string): unknown | null {
  const row = db.prepare(`SELECT response, created_at FROM search_cache WHERE query_hash = ?`).get(hash) as
    | { response: string; created_at: string }
    | undefined
  if (!row) return null
  if (Date.now() - new Date(row.created_at + 'Z').getTime() > CACHE_TTL_MS) return null
  return JSON.parse(row.response)
}

export function writeCache(db: Database.Database, hash: string, response: unknown): void {
  db.prepare(
    `INSERT INTO search_cache (query_hash, response) VALUES (?, ?)
     ON CONFLICT(query_hash) DO UPDATE SET response=excluded.response, created_at=datetime('now')`,
  ).run(hash, JSON.stringify(response))
}
