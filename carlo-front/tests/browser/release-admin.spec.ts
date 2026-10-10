import { createHash, randomUUID } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { test, expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { backendOrigin } from '../../lib/backend-origin'
import { editorialForDisplay } from '../../lib/editorial-read'

// Auth and catalog responses are real. This test never creates/deletes catalog
// records or writes a production origin. Public catalog images may be read from
// the authorized existing Supabase bucket. Credentials stay in memory.
test.skip(process.env.ACUTIS_RELEASE_BROWSER !== '1', 'Requires the disposable local release fixture')
test.use({ trace: 'off', screenshot: 'off', video: 'off', actionTimeout: 15_000, navigationTimeout: 25_000 })
test.setTimeout(600_000)

const origin = 'http://127.0.0.1:3197'
const backend = 'http://127.0.0.1:3198'
const privateFolder = resolve('C:/Users/sebas/AppData/Local/Temp/acutis-local-20261009-233138/private')
type Row = Record<string, unknown> & { id: string; slug?: string; name?: string }
type Catalog = { Saint: Row[]; Miracle: Row[]; Prayer: Row[] }
const basicFields = ['slug', 'name', 'title', 'feastDay', 'country', 'continent', 'imageUrl',
  'birthYear', 'deathYear', 'canonizationYear', 'birthPlace', 'birthCountryCode', 'birthContinent',
  'birthLat', 'birthLng', 'birthPrecision', 'lat', 'lng', 'biography', 'patronOf', 'symbols', 'birthSources'] as const
const numericFields = new Set(['birthYear', 'deathYear', 'canonizationYear', 'birthLat', 'birthLng', 'lat', 'lng'])
const arrayFields = new Set(['patronOf', 'symbols', 'birthSources'])
const writableFields = [...basicFields, 'editorial'] as const
const editorialKeys = ['kind', 'ecclesialStatus', 'birthDate', 'deathDate', 'birthplaceStatus', 'notes', 'sources', 'image']

function guardLocalTarget(baseURL = origin) {
  // Parse first, then assert only booleans: assertion output must never contain a DB credential.
  let db: URL | undefined
  try { db = new URL(process.env.DATABASE_URL || '') } catch { /* guarded below */ }
  expect(process.env.ACUTIS_RELEASE_BROWSER === '1', 'Local release flag is required').toBe(true)
  expect(baseURL === origin && process.env.ACUTIS_BROWSER_ORIGIN === origin, 'Exact local frontend is required').toBe(true)
  expect(Boolean(db && ['postgres:', 'postgresql:'].includes(db.protocol) && db.hostname === '127.0.0.1' &&
    db.port === '55439' && db.pathname === '/acutis_catalog_browser_test' &&
    db.searchParams.get('schema') === 'public' && db.searchParams.get('sslmode') === 'require' &&
    db.searchParams.get('sslaccept') === 'strict' && db.searchParams.has('sslcert')), 'Exact disposable TLS database is required').toBe(true)
  expect(backendOrigin() === backend && process.env.BACKEND_URL === backend, 'Exact local proxy backend is required').toBe(true)
  expect(process.env.AI_ENABLED === 'false', 'Paid AI must be disabled for this fixture').toBe(true)
  expect(/^[a-f0-9]{40}$/i.test(process.env.RENDER_GIT_COMMIT || ''), 'Explicit local backend revision is required').toBe(true)
}

function fixture(): Catalog {
  expect(Boolean(process.env.ACUTIS_CATALOG_SNAPSHOT), 'Private local fixture snapshot is required').toBe(true)
  expect(realpathSync(dirname(process.env.ACUTIS_CATALOG_SNAPSHOT!)) === realpathSync(privateFolder), 'Fixture must be owned by the local release').toBe(true)
  const rows = JSON.parse(readFileSync(resolve(privateFolder, 'public-catalog.json'), 'utf8').replace(/^\uFEFF/, '')) as Catalog
  expect([rows.Saint.length, rows.Miracle.length, rows.Prayer.length]).toEqual([179, 7, 1])
  return rows
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]))
  return value
}

function content(row: Row): Row {
  const { updatedAt: _updatedAt, ...rest } = row
  // PostgreSQL JSON and Prisma encode the same timestamp in different ISO forms.
  if (typeof rest.createdAt === 'string') rest.createdAt = new Date(rest.createdAt).toISOString()
  return rest as Row
}

function digest(rows: Row[]): string {
  return createHash('sha256').update(JSON.stringify(canonical(rows.map(content).sort((a, b) => a.id.localeCompare(b.id))))).digest('hex')
}

function summary(rows: Catalog) {
  return Object.fromEntries((['Saint', 'Miracle', 'Prayer'] as const).map(kind => [kind, { count: rows[kind].length, contentSha256: digest(rows[kind]) }]))
}

function snapshot(row: Row) {
  return Object.fromEntries(writableFields.map(key => [key, structuredClone(row[key])]))
}

function completeEditorial(row: Row): boolean {
  const editorial = row.editorial
  return Boolean(editorial && typeof editorial === 'object' && !Array.isArray(editorial) && editorialKeys.every(key => Object.hasOwn(editorial, key)))
}

async function json(request: APIRequestContext, url: string) {
  const response = await request.get(url, { headers: { 'Cache-Control': 'no-cache' } })
  expect(response.status(), 'Local catalog read must succeed').toBe(200)
  return response.json()
}

async function allPages(request: APIRequestContext, path: string): Promise<Row[]> {
  const rows: Row[] = []
  let cursor: string | null = null
  let total: number | undefined
  do {
    const page = await json(request, origin + '/api/' + path + '?limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''))
    expect(Array.isArray(page.items), 'Full catalog must use its real paginated contract').toBe(true)
    expect(typeof page.total).toBe('number')
    expect(page.items.length).toBeLessThanOrEqual(100)
    if (total === undefined) total = page.total
    expect(page.total).toBe(total)
    rows.push(...page.items)
    cursor = page.nextCursor
    expect(rows.length).toBeLessThanOrEqual(total!)
  } while (cursor)
  expect(rows.length).toBe(total)
  expect(new Set(rows.map(row => row.id)).size).toBe(rows.length)
  return rows
}

async function catalog(request: APIRequestContext): Promise<Catalog> {
  const [Saint, Miracle, Prayer] = await Promise.all([
    allPages(request, 'saints'), allPages(request, 'miracles'), json(request, origin + '/api/prayers/approved?limit=100'),
  ])
  expect(Array.isArray(Prayer)).toBe(true)
  expect([Saint.length, Miracle.length, Prayer.length]).toEqual([179, 7, 1])
  return { Saint, Miracle, Prayer }
}

async function openEditor(page: Page, row: Row): Promise<Locator> {
  await page.getByPlaceholder('Buscar santos...', { exact: true }).fill(row.slug!)
  const card = page.locator('div.rounded-xl.border.bg-card').filter({ has: page.getByRole('heading', { name: row.name!, exact: true }) })
  await expect(card).toHaveCount(1)
  const detail = page.waitForResponse(response => new URL(response.url()).pathname === '/api/saints/' + row.id && response.request().method() === 'GET')
  await card.getByRole('button', { name: 'Editar', exact: true }).click()
  expect((await detail).status()).toBe(200)
  const dialog = page.getByRole('dialog', { name: 'Editar santo', exact: true })
  await expect(dialog).toBeVisible()
  return dialog
}

async function editorMatches(dialog: Locator, row: Row) {
  const actual = await dialog.evaluate(node => Object.fromEntries(Array.from(node.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input[id],textarea[id],select[id]')).map(input => [input.id, input.value])))
  for (const key of basicFields) {
    const raw = row[key]
    const expected = arrayFields.has(key) ? (raw as string[]).join('\n') : String(raw ?? '')
    if (numericFields.has(key) && raw !== null && raw !== undefined) {
      expect(actual[key], 'Numeric editor field must be present: ' + key).not.toBe('')
      expect(Number(actual[key]), 'Numeric editor field: ' + key).toBeCloseTo(Number(raw), 10)
    } else expect(actual[key], 'Raw basic editor field: ' + key).toBe(expected)
  }
  const display = editorialForDisplay(row.editorial)
  if (!display) {
    expect(Object.hasOwn(actual, 'entity-kind')).toBe(false)
    return
  }
  const expected: Record<string, string> = {
    'entity-kind': display.kind, 'ecclesial-status': display.ecclesialStatus,
    'birthDate-text': display.birthDate.text ?? '', 'birthDate-status': display.birthDate.status,
    'deathDate-text': display.deathDate.text ?? '', 'deathDate-status': display.deathDate.status,
    'birthplace-status': display.birthplaceStatus, 'editorial-notes': display.notes ?? '',
  }
  display.sources.forEach((source, index) => {
    for (const key of ['url', 'institution', 'title', 'accessedAt'] as const) expected[`source-${index}-${key}`] = source[key]
    expected[`source-${index}-claims`] = source.claims.join('\n')
  })
  if (display.image) for (const key of ['sourceUrl', 'creator', 'license', 'licenseUrl', 'attribution', 'alt', 'kind'] as const) expected['image-' + key] = display.image[key]
  const editorialActual = Object.fromEntries(Object.entries(actual).filter(([key]) => !basicFields.includes(key as typeof basicFields[number])))
  expect(editorialActual, 'Editorial display must match the tolerant read adapter').toEqual(expected)
}

test('real admin reads 179 existing editors and saves, reloads and restores one local biography', async ({ page, request, browser, baseURL }, testInfo) => {
  guardLocalTarget(baseURL)
  const expected = fixture()
  const incomplete = expected.Saint.filter(row => !completeEditorial(row)).length
  expect(incomplete).toBe(100)
  const before = await catalog(request)
  expect(summary(before), 'Frontend catalog must equal the owned local fixture').toEqual(summary(expected))
  for (const target of [origin + '/api/ready', backend + '/ready']) {
    const ready = await request.get(target)
    expect(ready.status()).toBe(200)
    expect(ready.headers()['x-backend-revision']).toBe(process.env.RENDER_GIT_COMMIT)
  }
  const selected = before.Saint.find(row => completeEditorial(row) && (row.editorial as { kind: string }).kind === 'person' && typeof row.biography === 'string')!
  expect(Boolean(selected), 'A complete existing person is required for the write').toBe(true)
  const [frontDetail, backDetail] = await Promise.all([
    json(request, origin + '/api/saints/' + selected.id), json(request, backend + '/saints/' + selected.id),
  ])
  expect(digest([frontDetail])).toBe(digest([selected]))
  expect(digest([backDetail]), 'Backend must serve the same local fixture').toBe(digest([selected]))
  const original = snapshot(selected)
  const marker = 'Verificación temporal de la copia local ' + randomUUID()
  const temporaryBiography = String(selected.biography) + '\n\n' + marker
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.name))
  await page.addInitScript(() => localStorage.setItem('language', 'es'))
  expect(Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_KEY), 'Local admin credentials are required').toBe(true)
  await page.goto('/sanctum/portal')
  await page.locator('#admin-email').fill(process.env.ADMIN_EMAIL!)
  await page.locator('#password').fill(process.env.ADMIN_KEY!)
  const login = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/admin/login' && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Acceder al Sanctum', exact: true }).click()
  expect((await login).status()).toBe(200)
  await expect(page).toHaveURL(origin + '/admin')
  const adminCookie = (await page.context().cookies(origin)).find(cookie => cookie.name === 'carlo_admin')
  expect(Boolean(adminCookie), 'Real admin session cookie is required').toBe(true)
  // Retained only in memory so restoration survives a page/context failure.
  const cookieHeader = 'carlo_admin=' + adminCookie!.value
  let writeAttempted = false
  let checkedEditors = 0
  let after: Catalog | undefined
  let restoredUpdatedAt: unknown
  try {
    await page.getByRole('button', { name: 'Santos', exact: true }).click()
    for (const row of before.Saint) {
      const dialog = await openEditor(page, row)
      await editorMatches(dialog, row)
      await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
      await expect(dialog).toBeHidden()
      checkedEditors++
    }
    expect(checkedEditors).toBe(179)
    // Use the independent anonymous request context, then the real authenticated
    // cookie with a different local Origin. Neither denial may mutate content.
    writeAttempted = true
    const anonymous = await request.patch(origin + '/api/saints/' + selected.id, { headers: { Origin: origin }, data: { biography: temporaryBiography } })
    expect(anonymous.status()).toBe(401)
    const crossOrigin = await page.request.patch(origin + '/api/saints/' + selected.id, { headers: { Origin: 'http://127.0.0.1:3199' }, data: { biography: temporaryBiography } })
    expect(crossOrigin.status()).toBe(403)
    expect(snapshot(await json(request, origin + '/api/saints/' + selected.id))).toEqual(original)
    const dialog = await openEditor(page, selected)
    await dialog.locator('#biography').fill(temporaryBiography)
    const saved = page.waitForResponse(response => new URL(response.url()).pathname === '/api/saints/' + selected.id && response.request().method() === 'PATCH')
    await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
    const response = await saved
    const sent = response.request().postDataJSON() as Record<string, unknown>
    expect(Object.keys(sent).every(key => basicFields.includes(key as typeof basicFields[number]))).toBe(true)
    expect(Object.hasOwn(sent, 'editorial'), 'Untouched editorial must not be written').toBe(false)
    expect(sent.biography).toBe(temporaryBiography)
    expect(response.status()).toBe(200)
    await expect(dialog).toBeHidden()
    const persisted = await json(request, origin + '/api/saints/' + selected.id)
    expect(snapshot(persisted), 'Only biography may change in the copied record').toEqual({ ...original, biography: temporaryBiography })
    await page.reload()
    await page.getByRole('button', { name: 'Santos', exact: true }).click()
    const reloaded = await openEditor(page, selected)
    await editorMatches(reloaded, persisted)
    await reloaded.getByRole('button', { name: 'Cancelar', exact: true }).click()
    const publicContext = await browser.newContext({ baseURL: origin })
    try {
      await publicContext.addInitScript(() => localStorage.setItem('language', 'es'))
      const visitor = await publicContext.newPage()
      await visitor.goto('/santos/' + selected.slug)
      await expect(visitor.getByRole('heading', { level: 1, name: selected.name!, exact: true })).toBeVisible()
      await expect(visitor.getByText(marker, { exact: false })).toBeVisible()
    } finally { await publicContext.close() }
    expect(pageErrors).toEqual([])
  } finally {
    guardLocalTarget(baseURL)
    const cleanupErrors: unknown[] = []
    // Attempt each cleanup independently, then rethrow any failed assertion.
    // A failed restore must not prevent checking conservation or ending login.
    try {
      if (writeAttempted) {
        const restored = await fetch(origin + '/api/saints/' + selected.id, {
          method: 'PATCH', headers: { Origin: origin, Cookie: cookieHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify(original), signal: AbortSignal.timeout(20_000), redirect: 'error',
        })
        expect(restored.status, 'Restore all original allowed fields in the local copy').toBe(200)
        const restoredRow = await restored.json() as Row
        expect(snapshot(restoredRow), 'Local rollback must preserve exact raw values including nulls, arrays and editorial').toEqual(original)
        restoredUpdatedAt = restoredRow.updatedAt
      }
    } catch (error) { cleanupErrors.push(error) }
    try {
      after = await catalog(request)
      expect(summary(after), 'Content hashes exclude updatedAt; every catalog value must be restored').toEqual(summary(before))
    } catch (error) { cleanupErrors.push(error) }
    try {
      const logout = await fetch(origin + '/api/auth/admin/logout', { method: 'POST', headers: { Origin: origin, Cookie: cookieHeader }, signal: AbortSignal.timeout(15_000), redirect: 'error' })
      expect(logout.status).toBe(200)
    } catch (error) { cleanupErrors.push(error) }
    await testInfo.attach('local-admin-catalog-conservation', { contentType: 'application/json', body: JSON.stringify({
      frontendOrigin: origin, backendOrigin: backend, database: 'acutis_catalog_browser_test',
      checkedEditors, incompleteEditorialEditors: incomplete, catalogCreates: 0, catalogDeletes: 0, paidAiCalls: 0,
      contentHashExcludes: ['updatedAt'], before: summary(before), after: after ? summary(after) : null,
      cleanupFailureCount: cleanupErrors.length,
      localUpdatedAtExpectedChanged: writeAttempted && restoredUpdatedAt !== selected.updatedAt,
    }, null, 2) })
    if (cleanupErrors.length) throw cleanupErrors[0]
  }
})
