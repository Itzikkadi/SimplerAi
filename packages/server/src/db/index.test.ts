import { describe, it, expect, beforeEach } from 'vitest'
import { createDb, saveSample, listSaved, deleteSaved, readCache, writeCache } from './index'
import type Database from 'better-sqlite3'

let db: Database.Database
const sample = {
  id: 'fs-1', name: 'shout', username: 'u', duration: 2.5,
  license: 'CC0', previewUrl: 'http://x/p.mp3', tags: ['vocal', 'shout'],
}

beforeEach(() => { db = createDb(':memory:') })

describe('db', () => {
  it('saves, lists, and deletes a sample', () => {
    const saved = saveSample(db, sample, 'dark vocal')
    expect(saved.savedId).toBeGreaterThan(0)
    expect(listSaved(db)).toHaveLength(1)
    expect(listSaved(db)[0].tags).toEqual(['vocal', 'shout'])
    deleteSaved(db, saved.savedId)
    expect(listSaved(db)).toHaveLength(0)
  })

  it('caches and reads back a response', () => {
    writeCache(db, 'hash1', { ok: true })
    expect(readCache(db, 'hash1')).toEqual({ ok: true })
    expect(readCache(db, 'missing')).toBeNull()
  })
})
