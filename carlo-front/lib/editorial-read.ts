import { blankEditorial, factStatuses, type Editorial, type EditorialDate, type EditorialImage, type EditorialSource, type FactStatus } from './editorial'

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const string = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value : null
function safeLink(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null } catch { return null }
}
function date(value: unknown, nonPerson: boolean): EditorialDate {
  const raw = record(value)
  return { text: string(raw.text), status: factStatuses.includes(raw.status as FactStatus) ? raw.status as FactStatus : nonPerson ? 'not-applicable' : 'unknown' }
}

/** Tolerant display adapter for existing JSON. Never writes or invents editorial facts. */
export function editorialForDisplay(input: unknown): Editorial | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const raw = record(input), defaults = blankEditorial()
  const kind = raw.kind === 'archangel' || raw.kind === 'collective' ? raw.kind : 'person'
  const sources: EditorialSource[] = []
  if (Array.isArray(raw.sources)) for (const item of raw.sources) {
    const source = record(item), url = safeLink(source.url)
    if (!url) continue
    sources.push({ url, institution: string(source.institution) || '', title: string(source.title) || 'Fuente documental',
      accessedAt: string(source.accessedAt) || '', claims: Array.isArray(source.claims) ? source.claims.filter((value): value is string => typeof value === 'string') : [] })
  }
  let image: EditorialImage | null = null
  const candidate = record(raw.image), sourceUrl = safeLink(candidate.sourceUrl), licenseUrl = safeLink(candidate.licenseUrl)
  const imageKind = candidate.kind
  if (sourceUrl && licenseUrl && ['painting', 'sculpture', 'photograph', 'illustration', 'mosaic'].includes(String(imageKind)) &&
      [candidate.creator, candidate.license, candidate.attribution, candidate.alt].every(value => Boolean(string(value)))) {
    image = { sourceUrl, licenseUrl, creator: String(candidate.creator), license: String(candidate.license), attribution: String(candidate.attribution), alt: String(candidate.alt), kind: imageKind as EditorialImage['kind'] }
  }
  return { ...defaults, kind, ecclesialStatus: string(raw.ecclesialStatus) || defaults.ecclesialStatus,
    birthDate: date(raw.birthDate, kind !== 'person'), deathDate: date(raw.deathDate, kind !== 'person'),
    birthplaceStatus: factStatuses.includes(raw.birthplaceStatus as FactStatus) ? raw.birthplaceStatus as FactStatus : kind === 'person' ? 'unknown' : 'not-applicable',
    notes: string(raw.notes), sources, image }
}
