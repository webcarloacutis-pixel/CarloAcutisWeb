import { test, expect, type BrowserContext, type Page, type Request, type Response } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'

// Real local TLS + PostgreSQL; no provider mocking and no external traffic.
// Never record credentials, Set-Cookie headers, traces, or request bodies from auth.
test.use({ trace: 'off', screenshot: 'off', video: 'off', actionTimeout: 15000 })
test.describe.configure({ retries: 0, timeout: 120000 })

const origin = 'https://localhost:3443'
const evidence = resolve(__dirname, '../../../.audit/acutis-production/evidence')
const accountA = 'fixture-a@example.test'
const accountB = 'fixture-b@example.test'
const aiUnavailable = 'No se pudo obtener una respuesta. Reintenta más tarde.'
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])
const pageErrors = new WeakMap<Page, string[]>()

function local(url: string) {
  try { return localHosts.has(new URL(url).hostname) } catch { return false }
}
function apiResponse(page: Page, path: string, method = 'POST') {
  return page.waitForResponse(response => new URL(response.url()).pathname === '/api' + path && response.request().method() === method)
}
async function openHistory(page: Page) {
  const sidebar = page.locator('#chat-history')
  await expect(sidebar).toBeAttached()
  const mobileHistory = await page.evaluate(() => !window.matchMedia('(min-width: 1024px)').matches)
  const newChat = sidebar.getByRole('button', { name: 'Nueva conversación', exact: true })
  if (mobileHistory && !await newChat.isVisible()) await page.getByRole('button', { name: 'Abrir historial', exact: true }).click({ timeout: 15000 })
  await expect(newChat).toBeVisible()
  return sidebar
}
async function closeHistory(page: Page) {
  const close = page.getByRole('button', { name: 'Cerrar historial', exact: true })
  if (await close.isVisible()) {
    await close.click()
    await expect(page.locator('#chat-history')).toBeHidden()
  }
}
async function userLogin(page: Page, email: string) {
  const sidebar = await openHistory(page)
  await sidebar.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Correo electrónico', { exact: true }).fill(email)
  await dialog.getByLabel('Contraseña', { exact: true }).fill(process.env.UI_TEST_PASSWORD!)
  const login = apiResponse(page, '/auth/login')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  const loginResponse = await login
  expect(loginResponse.status()).toBe(200)
  await wireCookieFlags(loginResponse, 'carlo_token')
  await expect(dialog).toHaveCount(0)
  await openHistory(page)
  await expect(sidebar.getByText(email, { exact: true })).toBeVisible()
  await expect(sidebar.getByRole('button', { name: 'Nueva conversación', exact: true })).toBeEnabled()
}
async function userLogout(page: Page) {
  await openHistory(page)
  const logout = apiResponse(page, '/auth/logout')
  await page.locator('#chat-history').getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  expect((await logout).status()).toBe(200)
  await expect(page.locator('#chat-history').getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeVisible()
}
function nativeWindowsWebKit(context: BrowserContext) {
  return process.platform === 'win32' && context.browser()?.browserType().name() === 'webkit'
}
async function wireCookieFlags(response: Response, name: string) {
  const header = (await response.headerValues('set-cookie')).find(value => value.startsWith(name + '='))
  expect(Boolean(header), 'The login response sets the expected session cookie').toBe(true)
  // Discard the credential before asserting or attaching anything.
  const attributes = header!.split(';').slice(1).map(value => value.trim().toLowerCase())
  expect({ httpOnly: attributes.includes('httponly'), secure: attributes.includes('secure'),
    sameSiteLax: attributes.includes('samesite=lax'), rootPath: attributes.includes('path=/') })
    .toEqual({ httpOnly: true, secure: true, sameSiteLax: true, rootPath: true })
}
async function cookieFlags(context: BrowserContext, name: string) {
  const cookie = (await context.cookies(origin)).find(value => value.name === name)
  expect(Boolean(cookie), 'The expected session cookie exists').toBe(true)
  // Values deliberately excluded from assertions and artifacts.
  expect({ httpOnly: cookie?.httpOnly, secure: cookie?.secure, path: cookie?.path })
    .toEqual({ httpOnly: true, secure: true, path: '/' })
  if (nativeWindowsWebKit(context)) {
    // Upstream explicitly marks native Windows WebKit SameSite reporting as failing:
    // https://github.com/microsoft/playwright/blob/main/tests/library/browsercontext-cookies.spec.ts#L122
    expect(['None', 'Lax']).toContain(cookie?.sameSite)
  } else expect(cookie?.sameSite).toBe('Lax')
}
async function crossSitePost(context: BrowserContext) {
  const attacker = await context.newPage()
  try {
    const source = 'https://127.0.0.1:3443/__security_csrf_probe'
    await attacker.route(source, route => route.fulfill({ contentType: 'text/html', body:
      '<form method="POST" action="https://localhost:3443/api/conversations"><input name="title" value="Synthetic CSRF probe"><button>Submit cross-site probe</button></form>' }))
    await attacker.goto(source)
    const rejected = apiResponse(attacker, '/conversations')
    await attacker.getByRole('button', { name: 'Submit cross-site probe', exact: true }).click()
    const response = await rejected
    expect(response.status()).toBe(403)
    const headers = await response.request().allHeaders()
    expect(headers.origin).toBe('https://127.0.0.1:3443')
    const sessionCookieSent = Boolean(headers.cookie?.includes('carlo_token='))
    if (!nativeWindowsWebKit(context)) expect(sessionCookieSent).toBe(false)
    return { rejectionStatus: response.status(), sessionCookieSent, nativeWindowsWebKit: nativeWindowsWebKit(context) }
  } finally { await attacker.close() }
}
async function newConversation(page: Page) {
  await openHistory(page)
  const created = apiResponse(page, '/conversations')
  await page.locator('#chat-history').getByRole('button', { name: 'Nueva conversación', exact: true }).click()
  const response = await created
  expect(response.status()).toBe(200)
  const data = await response.json() as { conversation: { id: string } }
  expect(typeof data.conversation.id).toBe('string')
  await expect(page.locator('#chat-history button[aria-current="true"]')).toHaveText('Nueva conversación')
  return data.conversation.id
}
async function sendStoredMessage(page: Page, id: string, content: string) {
  await closeHistory(page)
  await page.getByRole('textbox', { name: 'Mensaje para la IA', exact: true }).fill(content)
  const saved = apiResponse(page, '/conversations/' + id + '/messages')
  const ai = apiResponse(page, '/ai/chat')
  await page.getByRole('button', { name: 'Enviar mensaje', exact: true }).click()
  expect((await saved).status()).toBe(201)
  const aiResponse = await ai
  expect(aiResponse.status()).toBe(503)
  // Status and visible failure suffice; Chromium can discard the unread streamed body.
  await expect(page.locator('main p').filter({ hasText: content })).toBeVisible()
  await expect(page.getByText(aiUnavailable, { exact: true })).toBeVisible()
}

test.beforeEach(async ({ context, page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop' && process.env.SECURITY_BROWSER_CROSS_ENGINE !== 'true', 'Additional engines require the explicit bounded auth-budget run.')
  expect(Boolean(process.env.UI_TEST_PASSWORD), 'Isolated fixture password must be supplied through the helper environment').toBe(true)
  expect(Boolean(process.env.ADMIN_KEY), 'Isolated admin key must be supplied through the helper environment').toBe(true)
  await context.route('**/*', route => local(route.request().url()) ? route.continue() : route.abort())
  if (nativeWindowsWebKit(context)) testInfo.annotations.push({ type: 'platform-limitation', description: 'Native Windows WebKit reports SameSite=None; real Set-Cookie=Lax is checked, plus cross-site POST Origin rejection. This is not physical Safari certification. https://github.com/microsoft/playwright/blob/main/tests/library/browsercontext-cookies.spec.ts#L122' })
  const errors: string[] = []
  pageErrors.set(page, errors)
  page.on('pageerror', error => errors.push(error.name))
})
test.afterEach(async ({ page }, testInfo) => {
  await testInfo.attach('security-ui-error-count', { body: JSON.stringify({ uncaughtPageErrors: pageErrors.get(page)?.length || 0 }), contentType: 'application/json' })
  expect(pageErrors.get(page) || [], 'No uncaught browser application errors').toEqual([])
})

test('real account login, private chat persistence, switching, logout and account isolation', async ({ page, context }, testInfo) => {
  const marker = 'audit-ui-' + randomUUID().slice(0, 8)
  const firstMessage = marker + '-A-first synthetic prayer request'
  const secondMessage = marker + '-A-second synthetic prayer request'
  await page.goto('/')
  await userLogin(page, accountA)
  await cookieFlags(context, 'carlo_token')
  await testInfo.attach('csrf-cross-site-checks', { body: JSON.stringify(await crossSitePost(context)), contentType: 'application/json' })
  expect(await page.evaluate(() => document.cookie.includes('carlo_token=')), 'HttpOnly token is unreadable in document.cookie').toBe(false)

  const firstId = await newConversation(page)
  await sendStoredMessage(page, firstId, firstMessage)
  await page.locator('section').filter({ has: page.locator('#chat-history') }).screenshot({ path: resolve(evidence, '../local/private-captures', 'security-auth-ui-' + testInfo.project.name + '.png'), mask: [page.locator('#chat-history')] })
  const secondId = await newConversation(page)
  expect(secondId === firstId).toBe(false)
  await sendStoredMessage(page, secondId, secondMessage)

  const sidebar = await openHistory(page)
  await sidebar.getByRole('button', { name: firstMessage, exact: true }).click()
  await expect(page.locator('main p').filter({ hasText: firstMessage })).toBeVisible()
  await expect(page.locator('main p').filter({ hasText: secondMessage })).toHaveCount(0)
  // Provider failure text is a UI state, not a fabricated persisted assistant response.
  await expect(page.getByText(aiUnavailable, { exact: true })).toHaveCount(0)
  await page.reload()
  await openHistory(page)
  await expect(sidebar.getByText(accountA, { exact: true })).toBeVisible()
  await sidebar.getByRole('button', { name: firstMessage, exact: true }).click()
  await expect(page.locator('main p').filter({ hasText: firstMessage })).toBeVisible()
  const read = await context.request.get('/api/conversations/' + firstId + '/messages')
  expect(read.status()).toBe(200)
  const stored = await read.json() as { messages: { role: string; content: string }[] }
  expect(stored.messages.filter(message => message.content === firstMessage)).toHaveLength(1)
  expect(stored.messages.some(message => message.role === 'assistant')).toBe(false)

  const revokedUserCookie = (await context.cookies(origin)).find(cookie => cookie.name === 'carlo_token')!
  await userLogout(page)
  expect((await context.cookies(origin)).some(cookie => cookie.name === 'carlo_token')).toBe(false)
  // Replay only in memory: removing a cookie alone would not prove server revocation.
  const replayedUser = await context.request.get('/api/auth/me', { headers: { Cookie: 'carlo_token=' + revokedUserCookie.value } })
    .catch(() => { throw new Error('Revoked user-session probe could not complete') })
  expect(replayedUser.status()).toBe(401)
  await userLogin(page, accountB)
  await expect(sidebar.getByText(accountA, { exact: true })).toHaveCount(0)
  await expect(sidebar.getByRole('button', { name: firstMessage, exact: true })).toHaveCount(0)
  await expect(sidebar.getByRole('button', { name: secondMessage, exact: true })).toHaveCount(0)
  await expect(page.locator('main p').filter({ hasText: firstMessage })).toHaveCount(0)
  expect((await context.request.get('/api/conversations/' + firstId + '/messages')).status()).toBe(404)
  expect((await context.request.get('/api/conversations/' + secondId + '/messages')).status()).toBe(404)
  await userLogout(page)
  await testInfo.attach('security-account-checks', { body: JSON.stringify({
    realTls: true, realDatabase: true, loginAccounts: 2, privateConversationsCreated: 2,
    cookieFlagsVerified: true, revokedCookieRejected: true, reloadedPersistence: true, accountIsolation: true,
    aiDisabledResponses: 2, realProviderCalls: 0,
    retainedData: 'Only this run synthetic conversation fixtures remain in the isolated test database.'
  }), contentType: 'application/json' })
})

test('administration uses the real server session and revokes it on UI logout', async ({ page, context }, testInfo) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/sanctum\/portal$/)
  expect((await context.request.get('/api/auth/admin/me')).status()).toBe(401)
  await page.getByLabel('Clave de Acceso', { exact: true }).fill(process.env.ADMIN_KEY!)
  const login = apiResponse(page, '/auth/admin/login')
  await page.getByRole('button', { name: 'Acceder al Sanctum', exact: true }).click()
  const loginResponse = await login
  expect(loginResponse.status()).toBe(200)
  await wireCookieFlags(loginResponse, 'carlo_admin')
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Panel de Administración Sagrado', exact: true })).toBeVisible()
  await cookieFlags(context, 'carlo_admin')
  expect(await page.evaluate(() => document.cookie.includes('carlo_admin='))).toBe(false)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Panel de Administración Sagrado', exact: true })).toBeVisible()
  const title = 'audit-admin-' + randomUUID().slice(0, 8)
  let ownedPrayerId: string | undefined
  try {
    await page.getByRole('button', { name: 'Oraciones', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Gestión de Oraciones', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Nueva Oración', exact: true }).click()
    const createModal = page.locator('.fixed').filter({ hasText: 'Registra una oración en el sistema' })
    await createModal.locator('label').filter({ hasText: /^Título$/ }).locator('..').locator('input').fill(title)
    await createModal.locator('label').filter({ hasText: /^Categoría$/ }).locator('..').locator('input').fill('Audit fixture')
    await createModal.locator('textarea').fill('Synthetic administrative prayer fixture; no personal data.')
    const created = apiResponse(page, '/prayers')
    await createModal.getByRole('button', { name: 'Crear', exact: true }).click()
    const createdResponse = await created
    expect(createdResponse.status()).toBe(201)
    const prayer = await createdResponse.json() as { id: string; approved: boolean }
    ownedPrayerId = prayer.id
    expect(prayer.approved).toBe(false)
    await expect(createModal).toHaveCount(0)
    await page.getByPlaceholder('Buscar oraciones...', { exact: true }).fill(title)
    await expect(page.getByText(title, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Editar', exact: true }).click()
    const editModal = page.locator('.fixed').filter({ hasText: 'Actualiza la oración seleccionada' })
    await editModal.locator('textarea').fill('Edited synthetic administrative prayer fixture; no personal data.')
    const updated = apiResponse(page, '/prayers/' + ownedPrayerId, 'PATCH')
    await editModal.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
    expect((await updated).status()).toBe(200)
    await expect(editModal).toHaveCount(0)
    await expect(page.getByText('Edited synthetic administrative prayer fixture; no personal data.', { exact: true })).toBeVisible()
    // Keep the fixture unpublished so concurrent product checks retain their public corpus.
    const published = await context.request.get('/api/prayers/approved?limit=100')
    expect((await published.json() as { id: string }[]).some(row => row.id === ownedPrayerId)).toBe(false)
  } finally {
    if (ownedPrayerId) {
      // Exact ID created by this test only; never bulk-delete fixtures or real data.
      const deleted = await context.request.delete('/api/prayers/' + ownedPrayerId, { headers: { Origin: origin } })
      expect(deleted.status()).toBe(200)
    }
  }
  const revokedAdminCookie = (await context.cookies(origin)).find(cookie => cookie.name === 'carlo_admin')!
  const logout = apiResponse(page, '/auth/admin/logout')
  await page.getByRole('button', { name: 'Cerrar Sesión', exact: true }).click()
  expect((await logout).status()).toBe(200)
  await expect(page).toHaveURL(origin + '/sanctum/portal')
  expect((await context.cookies(origin)).some(cookie => cookie.name === 'carlo_admin')).toBe(false)
  expect((await context.request.get('/api/auth/admin/me')).status()).toBe(401)
  const replayedAdmin = await context.request.get('/api/auth/admin/me', { headers: { Cookie: 'carlo_admin=' + revokedAdminCookie.value } })
    .catch(() => { throw new Error('Revoked admin-session probe could not complete') })
  expect(replayedAdmin.status()).toBe(401)
  await testInfo.attach('security-admin-checks', { body: JSON.stringify({ serverLogin: true, secureHttpOnlyCookie: true, reload: true, logout: true, revokedSession: true, ownPrayerCreatedEditedDeleted: true, publishedCorpusUnchanged: true }), contentType: 'application/json' })
})

type EventCapture = { url: string; payloadKeys: string[]; rootKeys: string[]; forbidden: boolean; cookieSent: boolean; refererSent: boolean }
async function capturedEvent(request: Request): Promise<EventCapture> {
  const data = request.postDataJSON() as { type: string; payload: Record<string, unknown> }
  const headers = await request.allHeaders()
  const payload = data.payload
  const text = JSON.stringify(data)
  return {
    url: String(payload.url), payloadKeys: Object.keys(payload).sort(), rootKeys: Object.keys(data).sort(),
    forbidden: /PRIVATE_QUERY|PRIVATE_HASH|fixture-[ab]@|SYNTHETIC_COOKIE|title|email|account|userId/i.test(text) || payload.referrer !== '' || data.type !== 'event',
    cookieSent: Boolean(headers.cookie), refererSent: Boolean(headers.referer),
  }
}
test('real analytics collector receives canonical navigation without private fields or duplicate query pageviews', async ({ page, context }, testInfo) => {
  const captures: EventCapture[] = []
  const pending: Promise<void>[] = []
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/send' && request.method() === 'POST')
      pending.push(capturedEvent(request).then(value => { captures.push(value) }))
  })
  await context.addCookies([{ name: 'privacy_sentinel', value: 'SYNTHETIC_COOKIE_NOT_ANALYTICS', url: origin, secure: true, httpOnly: true, sameSite: 'Lax' }])
  const initialEvent = page.waitForResponse(response => new URL(response.url()).pathname === '/api/send' && response.request().method() === 'POST')
  await page.goto('/?email=PRIVATE_QUERY#PRIVATE_HASH')
  expect((await initialEvent).status()).toBe(200)
  await Promise.all(pending)
  expect(captures.map(event => event.url)).toEqual(['/'])

  const navigation = page.getByRole('navigation', { name: 'Navegación principal', exact: true })
  const nextEvent = page.waitForResponse(response => new URL(response.url()).pathname === '/api/send' && response.request().method() === 'POST')
  await navigation.getByRole('link', { name: 'Santos', exact: true }).click()
  await expect(page).toHaveURL(/\/santos$/)
  expect((await nextEvent).status()).toBe(200)
  await page.getByLabel('Buscar santos', { exact: true }).fill('PRIVATE_QUERY')
  await expect(page.getByText('0 santos encontrados', { exact: true })).toBeVisible()
  await page.waitForLoadState('networkidle')
  await Promise.all(pending)
  expect(captures.filter(event => event.url === '/santos')).toHaveLength(1)
  await page.getByRole('button', { name: /Limpiar Filtros/i }).click()
  await expect(page.getByText('10 santos encontrados', { exact: true })).toBeVisible()
  const detailEvent = page.waitForResponse(response => new URL(response.url()).pathname === '/api/send' && response.request().method() === 'POST')
  await page.locator('main').getByRole('link', { name: 'Ver biografía de San Francisco (test)', exact: true }).click()
  expect((await detailEvent).status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'San Francisco (test)', exact: true })).toBeVisible()
  await page.waitForLoadState('networkidle')
  await Promise.all(pending)
  expect(captures.map(event => event.url)).toEqual(['/', '/santos', '/santos/detalle'])
  const beforePrivateRoute = captures.length
  await page.goto('/sanctum/portal?email=PRIVATE_QUERY#PRIVATE_HASH')
  await expect(page.getByLabel('Clave de Acceso', { exact: true })).toBeVisible()
  await page.waitForLoadState('networkidle')
  await Promise.all(pending)
  expect(captures).toHaveLength(beforePrivateRoute)
  for (const event of captures) {
    expect(event.rootKeys).toEqual(['payload', 'type'])
    expect(event.payloadKeys).toEqual(['hostname', 'language', 'referrer', 'screen', 'url', 'website'])
    expect({ forbidden: event.forbidden, cookieSent: event.cookieSent, refererSent: event.refererSent }).toEqual({ forbidden: false, cookieSent: false, refererSent: false })
  }
  await testInfo.attach('analytics-canonical-wire-checks', { body: JSON.stringify(captures, null, 2), contentType: 'application/json' })
})

test('blocked analytics does not interrupt public navigation or content rendering', async ({ page, context }, testInfo) => {
  let blocked = 0
  await context.route('**/api/send', async route => { blocked++; await route.abort('blockedbyclient') })
  await page.goto('/oraciones?email=PRIVATE_QUERY#PRIVATE_HASH')
  await expect(page.getByRole('region', { name: 'Resultados de oraciones', exact: true }).getByText('12 oraciones encontradas', { exact: true })).toBeVisible()
  await expect.poll(() => blocked).toBeGreaterThan(0)
  await page.getByRole('navigation', { name: 'Navegación principal', exact: true }).getByRole('link', { name: 'Versículos', exact: true }).click()
  await expect(page).toHaveURL(/\/versiculos$/)
  await expect(page.getByRole('searchbox', { name: 'Sentimiento, palabra o referencia bíblica', exact: true })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Sentimiento, palabra o referencia bíblica', exact: true }).fill('paz')
  await page.getByRole('button', { name: 'Buscar Versículos', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Versículos para «paz»', exact: true })).toBeVisible()
  await page.screenshot({ path: resolve(evidence, 'security-analytics-blocked-ui-' + testInfo.project.name + '.png'), fullPage: false })
  await testInfo.attach('analytics-blocked-checks', { body: JSON.stringify({ blockedRequests: blocked, navigationWorked: true, searchWorked: true }), contentType: 'application/json' })
})
