"use client"
import { useSyncExternalStore } from 'react'
import { apiUrl } from './api-url'
import { fetchPublicCollection } from './public-collection'
import { catalogErrorKey } from './public-request'

export type SaintName = { id: string; name: string; slug: string }
type State = { items: SaintName[]; loading: boolean; error: string | null }
type Read = { controller: AbortController; generation: number }
const initial: State = { items: [], loading: true, error: null }
let state = initial
let cached: { items: SaintName[]; expires: number } | undefined
let inFlight: Read | undefined
let generation = 0
const listeners = new Set<() => void>()

function publish(next: State) { state = next; for (const listener of listeners) listener() }
function startRead() {
  if (cached && cached.expires > Date.now()) { publish({ items: cached.items, loading: false, error: null }); return }
  if (inFlight) return
  const read: Read = { controller: new AbortController(), generation }
  inFlight = read
  publish(initial)
  const current = () => inFlight === read && generation === read.generation && !read.controller.signal.aborted
  void fetchPublicCollection<SaintName>(apiUrl('/saints?view=names'), { cache: 'no-store', signal: read.controller.signal })
    .then(items => {
      if (!current()) return
      cached = { items, expires: Date.now() + 30_000 }
      publish({ items, loading: false, error: null })
    })
    .catch(error => { if (current()) publish({ items: [], loading: false, error: catalogErrorKey(error) }) })
    .finally(() => { if (inFlight === read) inFlight = undefined })
}
function invalidate() {
  cached = undefined; generation++; inFlight?.controller.abort(); inFlight = undefined
  if (listeners.size) startRead()
}
function subscribe(listener: () => void) {
  if (!listeners.size) window.addEventListener('catalog:saints-changed', invalidate)
  listeners.add(listener)
  startRead()
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      window.removeEventListener('catalog:saints-changed', invalidate)
      generation++; inFlight?.controller.abort(); inFlight = undefined
      // No mutation listener remains while idle, so a later mount must read fresh options.
      cached = undefined; publish(initial)
    }
  }
}
/** Shared selector metadata only: no biographies, private session or per-user cache. */
export function useSaintNames() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => initial)
  return { ...snapshot, retry: invalidate }
}
