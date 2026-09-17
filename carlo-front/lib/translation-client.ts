import { postAiTranslate } from "./ai-client"
type Entry = { controller: AbortController; users: number; promise: Promise<string> }
const inFlight = new Map<string, Entry>()
const cache = new Map<string, { value?: string; failed?: boolean; until: number }>()

/** Explicit actions only: at most two concurrent requests, no queue or automatic retry. */
export function acquireTranslation(text: string, language: string) {
  const key = JSON.stringify([language, text]), saved = cache.get(key)
  if (saved && saved.until > Date.now()) return { promise: saved.failed ? Promise.reject(new Error("TRANSLATION_UNAVAILABLE")) : Promise.resolve(saved.value!), release() {} }
  let entry = inFlight.get(key)
  if (!entry) {
    if (inFlight.size >= 2) return { promise: Promise.reject(new Error("TRANSLATION_BUSY")), release() {} }
    const controller = new AbortController()
    entry = { controller, users: 0, promise: Promise.resolve("") }
    const active = entry
    entry.promise = postAiTranslate({ text, targetLang: language }, controller.signal).then(response => {
      const value = response.translated || response.translation || response.text
      if (controller.signal.aborted) throw new DOMException("Cancelled", "AbortError")
      if (typeof value !== "string" || !value.trim()) throw new Error("TRANSLATION_UNAVAILABLE")
      cache.set(key, { value, until: Date.now() + 3_600_000 })
      return value
    }).catch(error => {
      if (!controller.signal.aborted) cache.set(key, { failed: true, until: Date.now() + 60_000 })
      throw error
    }).finally(() => {
      if (inFlight.get(key) === active) inFlight.delete(key)
      while (cache.size > 100) cache.delete(cache.keys().next().value!)
    })
    inFlight.set(key, entry)
  }
  entry.users++
  const active = entry
  let released = false
  return { promise: active.promise, release() {
    if (released) return
    released = true
    if (--active.users === 0) {
      active.controller.abort()
      if (inFlight.get(key) === active) inFlight.delete(key)
    }
  } }
}
