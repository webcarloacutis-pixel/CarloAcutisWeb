import { createHash, randomUUID } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
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
type SaintJsonStorage = {
  id: string; birthSourcesSqlNull: boolean; birthSourcesJsonType: string | null;
  editorialSqlNull: boolean; editorialJsonType: string | null;
}
type SqlCatalog = { catalog: Catalog; saintJsonStorage: SaintJsonStorage[] }
type SqlClient = {
  $queryRaw<T>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>
  $disconnect(): Promise<void>
}
type LocalPrismaModule = {
  PrismaClient: new (options: { datasourceUrl: string }) => SqlClient
  Prisma: { prismaVersion: { client: string } }
}
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
  // Prisma's timestamp(3) columns contain UTC without a timezone suffix in
  // PostgreSQL JSON. Parse those explicitly as UTC, preserving offset-aware ISO.
  if (typeof rest.createdAt === 'string') {
    const timestamp = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(rest.createdAt)
      ? rest.createdAt.replace(' ', 'T') + 'Z' : rest.createdAt
    rest.createdAt = new Date(timestamp).toISOString()
  }
  return rest as Row
}

function digest(rows: Row[]): string {
  return createHash('sha256').update(JSON.stringify(canonical(rows.map(content).sort((a, b) => a.id.localeCompare(b.id))))).digest('hex')
}

function summary(rows: Catalog) {
  return Object.fromEntries((['Saint', 'Miracle', 'Prayer'] as const).map(kind => [kind, { count: rows[kind].length, contentSha256: digest(rows[kind]) }]))
}

function sqlSummary(rows: SqlCatalog) {
  return { tables: summary(rows.catalog), saintJsonStorageSha256: createHash('sha256')
    .update(JSON.stringify(canonical(rows.saintJsonStorage))).digest('hex') }
}

async function sqlCatalog(baseURL: string): Promise<SqlCatalog> {
  // This independent proof only runs after the exact local/TLS target guard.
  // All statements are SELECTs; no SQL restoration or timestamp writes are used.
  guardLocalTarget(baseURL)
  // Keep this fixture-only dependency out of the independent frontend build.
  const clientUrl = pathToFileURL(resolve(__dirname, '../../../carlo-back/node_modules/@prisma/client/default.js')).href
  const loaded = await import(clientUrl) as LocalPrismaModule & { default?: LocalPrismaModule }
  const { PrismaClient, Prisma } = loaded.default ?? loaded
  expect(/^6\./.test(Prisma.prismaVersion.client), 'Use the reviewed local Prisma 6 client').toBe(true)
  const client = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })
  try {
    const [identity] = await client.$queryRaw<Array<{ database: string; address: string; port: number; ssl: boolean }>>`
      SELECT current_database() AS database, inet_server_addr()::text AS address,
        inet_server_port() AS port, ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()`
    expect(Boolean(identity && identity.database === 'acutis_catalog_browser_test' &&
      identity.address === '127.0.0.1' && identity.port === 55439 && identity.ssl), 'SQL must use the owned loopback TLS fixture').toBe(true)
    const [saints, miracles, prayers, saintJsonStorage] = await Promise.all([
      client.$queryRaw<Array<{ row: Row }>>`SELECT to_jsonb(s) AS row FROM "Saint" s ORDER BY "id"`,
      client.$queryRaw<Array<{ row: Row }>>`SELECT to_jsonb(m) AS row FROM "Miracle" m ORDER BY "id"`,
      client.$queryRaw<Array<{ row: Row }>>`SELECT to_jsonb(p) AS row FROM "Prayer" p ORDER BY "id"`,
      client.$queryRaw<SaintJsonStorage[]>`SELECT "id", "birthSources" IS NULL AS "birthSourcesSqlNull",
        jsonb_typeof("birthSources") AS "birthSourcesJsonType", "editorial" IS NULL AS "editorialSqlNull",
        jsonb_typeof("editorial") AS "editorialJsonType" FROM "Saint" ORDER BY "id"`,
    ])
    const catalog = { Saint: saints.map(item => item.row), Miracle: miracles.map(item => item.row), Prayer: prayers.map(item => item.row) }
    expect([catalog.Saint.length, catalog.Miracle.length, catalog.Prayer.length]).toEqual([179, 7, 1])
    // to_jsonb captures every persisted column. Separate JSON null descriptors
    // distinguish SQL NULL from JSON null, which to_jsonb alone cannot prove.
    return { catalog, saintJsonStorage }
  } finally { await client.$disconnect() }
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
    // Null becomes an empty control only for display, never in a save snapshot.
    const expected = arrayFields.has(key) ? ((raw ?? []) as string[]).join('\n') : String(raw ?? '')
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

test('real admin reads 179 editors and preserves raw SQL while editing complete and partial local biographies', async ({ page, request, browser, baseURL }, testInfo) => {
  guardLocalTarget(baseURL)
  const expected = fixture()
  const incomplete = expected.Saint.filter(row => !completeEditorial(row)).length
  expect(incomplete).toBe(100)
  for (const target of [origin + '/api/ready', backend + '/ready']) {
    const ready = await request.get(target)
    expect(ready.status()).toBe(200)
    expect(ready.headers()['x-backend-revision']).toBe(process.env.RENDER_GIT_COMMIT)
  }
  const sqlBefore = await sqlCatalog(baseURL ?? origin)
  expect(summary(sqlBefore.catalog), 'Every persisted catalog column must equal the raw fixture').toEqual(summary(expected))
  const before = await catalog(request)
  // Prisma 6 returns birthSources:null here. Keep the actual transport contract;
  // only editor controls adapt null to blank, and the independent SQL proof
  // additionally records SQL NULL versus JSON null for both JSON columns.
  expect(summary(before), 'Frontend transport must equal the full raw fixture').toEqual(summary(expected))
  const selectedRows = [
    before.Saint.find(row => completeEditorial(row) && (row.editorial as { kind: string }).kind === 'person' && typeof row.biography === 'string'),
    before.Saint.find(row => !completeEditorial(row) && row.birthSources === null && (row.editorial as { kind?: string })?.kind === 'person' && typeof row.biography === 'string'),
  ]
  expect(selectedRows.every(Boolean), 'Existing complete and partial people are required for the two local writes').toBe(true)
  const selected = selectedRows as Row[]
  expect(new Set(selected.map(row => row.id)).size).toBe(2)
  for (const row of selected) {
    const [frontDetail, backDetail] = await Promise.all([
      json(request, origin + '/api/saints/' + row.id), json(request, backend + '/saints/' + row.id),
    ])
    expect(digest([frontDetail])).toBe(digest([row]))
    expect(digest([backDetail]), 'Backend must serve the same local fixture').toBe(digest([row]))
  }
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
  const writeAttempted = new Set<string>()
  let checkedEditors = 0
  let after: Catalog | undefined
  let sqlAfter: SqlCatalog | undefined
  const restoredUpdatedAt = new Map<string, unknown>()
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
    const denialTarget = selected[0]
    const deniedBiography = String(denialTarget.biography) + '\n\n' + 'Unauthorized local edit ' + randomUUID()
    // Arm restoration before a denial probe: an auth regression may commit the
    // request before its unexpected status causes this assertion to fail.
    writeAttempted.add(denialTarget.id)
    const anonymous = await request.patch(origin + '/api/saints/' + denialTarget.id, { headers: { Origin: origin }, data: { biography: deniedBiography } })
    expect(anonymous.status()).toBe(401)
    const crossOrigin = await page.request.patch(origin + '/api/saints/' + denialTarget.id, { headers: { Origin: 'http://127.0.0.1:3199' }, data: { biography: deniedBiography } })
    expect(crossOrigin.status()).toBe(403)
    expect(snapshot(await json(request, origin + '/api/saints/' + denialTarget.id))).toEqual(snapshot(denialTarget))
    expect(sqlSummary(await sqlCatalog(baseURL ?? origin)), 'Denied writes must not change any persisted value or JSON null class').toEqual(sqlSummary(sqlBefore))
    const changedBiographies = new Map<string, string>()
    for (const row of selected) {
      const marker = 'Verificación temporal de la copia local ' + randomUUID()
      const temporaryBiography = String(row.biography) + '\n\n' + marker
      const dialog = await openEditor(page, row)
      await dialog.locator('#biography').fill(temporaryBiography)
      const saved = page.waitForResponse(response => new URL(response.url()).pathname === '/api/saints/' + row.id && response.request().method() === 'PATCH')
      writeAttempted.add(row.id)
      await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
      const response = await saved
      const sent = response.request().postDataJSON() as Record<string, unknown>
      expect(sent, 'The UI must submit only the explicitly changed biography').toEqual({ biography: temporaryBiography })
      expect(response.status()).toBe(200)
      await expect(dialog).toBeHidden()
      const persisted = await json(request, origin + '/api/saints/' + row.id)
      expect(content(persisted), 'Every transport field except local updatedAt is conserved').toEqual({ ...content(row), biography: temporaryBiography })
      changedBiographies.set(row.id, temporaryBiography)
      const expectedSql = { ...sqlBefore, catalog: { ...sqlBefore.catalog, Saint: sqlBefore.catalog.Saint.map(original => changedBiographies.has(original.id)
        ? { ...original, biography: changedBiographies.get(original.id) } : original) } }
      expect(sqlSummary(await sqlCatalog(baseURL ?? origin)), 'All raw SQL fields and SQL/JSON null classes must be conserved apart from the two explicit biographies').toEqual(sqlSummary(expectedSql))
      await page.reload()
      await page.getByRole('button', { name: 'Santos', exact: true }).click()
      const reloaded = await openEditor(page, row)
      await editorMatches(reloaded, persisted)
      await reloaded.getByRole('button', { name: 'Cancelar', exact: true }).click()
      const publicContext = await browser.newContext({ baseURL: origin })
      try {
        await publicContext.addInitScript(() => localStorage.setItem('language', 'es'))
        const visitor = await publicContext.newPage()
        await visitor.goto('/santos/' + row.slug)
        await expect(visitor.getByRole('heading', { level: 1, name: row.name!, exact: true })).toBeVisible()
        await expect(visitor.getByText(marker, { exact: false })).toBeVisible()
      } finally { await publicContext.close() }
    }
    expect(pageErrors).toEqual([])
  } finally {
    guardLocalTarget(baseURL)
    const cleanupErrors: unknown[] = []
    // Attempt each cleanup independently, then rethrow any failed assertion.
    // A failed restore must not prevent checking conservation or ending login.
    for (const row of selected) try {
      if (writeAttempted.size > 0) {
        const restored = await fetch(origin + '/api/saints/' + row.id, {
          method: 'PATCH', headers: { Origin: origin, Cookie: cookieHeader, 'Content-Type': 'application/json' },
          // Roll back only the field this test changed; never rewrite a legacy
          // null, source array or tolerant editorial display value in cleanup.
          body: JSON.stringify({ biography: row.biography }), signal: AbortSignal.timeout(20_000), redirect: 'error',
        })
        expect(restored.status, 'Restore the original biography in the local copy').toBe(200)
        const restoredRow = await restored.json() as Row
        expect(content(restoredRow), 'Rollback must preserve every original transport field including nulls, arrays and editorial').toEqual(content(row))
        restoredUpdatedAt.set(row.id, restoredRow.updatedAt)
      }
    } catch (error) { cleanupErrors.push(error) }
    try {
      sqlAfter = await sqlCatalog(baseURL ?? origin)
      expect(sqlSummary(sqlAfter), 'Every persisted column and SQL/JSON null class must be restored; only updatedAt is excluded').toEqual(sqlSummary(sqlBefore))
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
      independentSqlBefore: sqlSummary(sqlBefore), independentSqlAfter: sqlAfter ? sqlSummary(sqlAfter) : null,
      biographyWriteTargets: selected.length, biographyWritesAttempted: writeAttempted.size,
      biographyRollbackTargets: writeAttempted.size > 0 ? selected.length : 0,
      originalPartialEditorialAndNullStorageConserved: sqlAfter ? JSON.stringify(sqlSummary(sqlAfter)) === JSON.stringify(sqlSummary(sqlBefore)) : false,
      cleanupFailureCount: cleanupErrors.length,
      localUpdatedAtExpectedChanged: writeAttempted.size > 0 && selected.every(row => restoredUpdatedAt.has(row.id) && restoredUpdatedAt.get(row.id) !== row.updatedAt),
    }, null, 2) })
    if (cleanupErrors.length) throw cleanupErrors[0]
  }
})
