import { randomUUID } from 'node:crypto'
import { test, expect, type Page } from '@playwright/test'

// Real cookies and persistence are tested only against the disposable local release fixture.
// Auth/conversation responses must never be intercepted. The only interception below
// prevents an accidental paid AI call; this scenario never submits a chat prompt.
test.skip(process.env.ACUTIS_RELEASE_BROWSER !== '1', 'Requires the disposable 179-saint release fixture')
test.setTimeout(180_000)

const origin = 'http://127.0.0.1:3197'
const password = 'Synthetic-release-session-2026!'
const mutationHeaders = { Origin: origin }

async function openHistory(page: Page) {
  const history = page.locator('#chat-history')
  if (!(await history.isVisible())) await page.getByRole('button', { name: 'Abrir historial', exact: true }).click()
  await expect(history).toBeVisible()
  return history
}

async function openAccess(page: Page) {
  const history = await openHistory(page)
  await history.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: /Bienvenido de vuelta|Únete a nuestra comunidad/ })
  await expect(dialog).toBeVisible()
  return dialog
}

async function register(page: Page, email: string) {
  const dialog = await openAccess(page)
  await dialog.getByRole('button', { name: 'Registrarse', exact: true }).click()
  await dialog.getByLabel('Nombre', { exact: true }).fill('Cuenta sintética de cierre')
  await dialog.getByLabel('Correo electrónico', { exact: true }).fill(email)
  await dialog.getByLabel('Contraseña', { exact: true }).fill(password)
  const registered = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/register' && response.request().method() === 'POST')
  await dialog.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  expect((await registered).status()).toBe(201)
  await expect(dialog).not.toBeVisible()
  const session = await page.request.get('/api/auth/me')
  expect(session.status()).toBe(200)
  expect((await session.json()).user.email).toBe(email)
}

async function logout(page: Page) {
  const history = await openHistory(page)
  const ended = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/logout' && response.request().method() === 'POST')
  await history.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  expect((await ended).status()).toBe(200)
  await expect(history.getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeVisible()
  expect((await page.request.get('/api/auth/me')).status()).toBe(401)
  expect((await page.request.get('/api/conversations')).status()).toBe(401)
}

test('real registration, session reload, logout and two-account history isolation', async ({ page, baseURL }) => {
  expect(baseURL).toBe(origin)
  const catalogBefore = await page.request.get('/api/saints?view=cards&limit=1')
  expect(catalogBefore.status()).toBe(200)
  expect((await catalogBefore.json()).total).toBe(179)
  const miraclesBefore = await page.request.get('/api/miracles?view=cards&limit=1')
  expect(miraclesBefore.status()).toBe(200)
  const miracleTotal = (await miraclesBefore.json()).total

  const marker = randomUUID()
  const firstEmail = `release-session-${marker}-a@example.invalid`
  const secondEmail = `release-session-${marker}-b@example.invalid`
  const conversationId = randomUUID()
  const title = `Historial sintético ${marker}`
  const userMessage = `Pregunta privada sintética ${marker}`
  const assistantMessage = `Respuesta guardada de prueba ${marker}`
  const pageErrors: string[] = []
  let aiRequests = 0
  page.on('pageerror', error => pageErrors.push(error.name))
  await page.addInitScript(() => localStorage.setItem('language', 'es'))
  await page.route('**/api/ai/chat', async route => {
    aiRequests++
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'AI_DISABLED' }) })
  })

  await page.goto('/')
  const initial = await page.request.get('/api/auth/me')
  expect(initial.status()).toBe(401) // Expected anonymous access, not an application failure.
  const invalidDialog = await openAccess(page)
  await invalidDialog.getByLabel('Correo electrónico', { exact: true }).fill(firstEmail)
  await invalidDialog.getByLabel('Contraseña', { exact: true }).fill(password)
  const rejected = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/login' && response.request().method() === 'POST')
  await invalidDialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  expect((await rejected).status()).toBe(401)
  await expect(invalidDialog.getByRole('alert')).toBeVisible()
  expect((await page.request.get('/api/auth/me')).status()).toBe(401)
  await invalidDialog.getByRole('button', { name: 'Cerrar acceso', exact: true }).click()

  await register(page, firstEmail)
  // Authenticated direct and internal detail navigation use the real existing snapshot.
  for (const [slug, name] of [['santa-felicidad', 'Santa Felicidad'], ['san-jose', 'San José'], ['san-carlo-acutis', 'San Carlo Acutis']]) {
    expect((await page.goto('/santos/' + slug, { waitUntil: 'domcontentloaded' }))?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible()
    await expect.poll(() => page.locator('main img').first().evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    await page.getByRole('link', { name: 'Volver a Santos', exact: true }).click()
    await page.getByLabel('Buscar santos', { exact: true }).filter({ visible: true }).fill(name)
    await page.getByRole('link', { name: 'Ver biografía de ' + name, exact: true }).click()
    await expect(page).toHaveURL(new RegExp('/santos/' + slug + '$'))
    await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible()
  }
  const missing = await page.goto('/santos/release-saint-that-does-not-exist')
  expect(missing?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Contenido no encontrado', exact: true })).toBeVisible()
  await page.goto('/')
  const created = await page.request.post('/api/conversations', { headers: mutationHeaders, data: { id: conversationId, title } })
  expect(created.status()).toBe(200)
  expect((await created.json()).conversation.id).toBe(conversationId)
  for (const [role, content] of [['user', userMessage], ['assistant', assistantMessage]]) {
    const saved = await page.request.post(`/api/conversations/${conversationId}/messages`, { headers: mutationHeaders, data: { id: randomUUID(), role, content } })
    expect(saved.status()).toBe(201)
  }

  await page.reload()
  const firstHistory = await openHistory(page)
  await expect(firstHistory.getByText(firstEmail, { exact: true })).toBeVisible()
  await expect(firstHistory.getByRole('button', { name: title, exact: true })).toBeVisible()
  await firstHistory.getByRole('button', { name: title, exact: true }).click()
  await expect(page.getByTestId('chat-messages').getByText(userMessage, { exact: true })).toBeVisible()
  await expect(page.getByTestId('chat-messages').getByText(assistantMessage, { exact: true })).toBeVisible()

  await logout(page)
  await expect(page.getByText(userMessage, { exact: true })).toHaveCount(0)
  await expect(page.getByText(assistantMessage, { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: title, exact: true })).toHaveCount(0)

  await register(page, secondEmail)
  const secondList = await page.request.get('/api/conversations')
  expect(secondList.status()).toBe(200)
  expect(secondList.headers()['cache-control']).toContain('no-store')
  expect((await secondList.json()).conversations).toEqual([])
  const foreignMessages = await page.request.get(`/api/conversations/${conversationId}/messages`)
  expect(foreignMessages.status()).toBe(404)
  expect((await page.request.patch(`/api/conversations/${conversationId}`, { headers: mutationHeaders, data: { title: 'No debe cambiar' } })).status()).toBe(404)
  expect((await page.request.delete(`/api/conversations/${conversationId}`, { headers: mutationHeaders })).status()).toBe(404)
  expect((await page.request.post(`/api/conversations/${conversationId}/messages`, { headers: mutationHeaders, data: { role: 'user', content: 'No debe guardarse' } })).status()).toBe(404)
  expect((await page.request.post('/api/conversations', { headers: mutationHeaders, data: { id: conversationId, title: 'No debe apropiarse' } })).status()).toBe(404)
  expect((await page.request.get('/api/miracles/all?view=cards&limit=1')).status()).toBe(401)
  expect((await page.request.get('/api/auth/admin/me')).status()).toBe(401)
  expect((await page.request.post('/api/auth/admin/login', { headers: mutationHeaders, data: { email: secondEmail, password } })).status()).toBe(401)

  await page.reload()
  const secondHistory = await openHistory(page)
  await expect(secondHistory.getByText(secondEmail, { exact: true })).toBeVisible()
  await expect(secondHistory.getByText('No hay conversaciones', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: title, exact: true })).toHaveCount(0)
  await expect(page.getByText(userMessage, { exact: true })).toHaveCount(0)
  await expect(page.getByText(assistantMessage, { exact: true })).toHaveCount(0)
  await logout(page)

  const loginDialog = await openAccess(page)
  await loginDialog.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click()
  await loginDialog.getByLabel('Correo electrónico', { exact: true }).fill(firstEmail)
  await loginDialog.getByLabel('Contraseña', { exact: true }).fill(password)
  const authenticated = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/login' && response.request().method() === 'POST')
  await loginDialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  expect((await authenticated).status()).toBe(200)
  await expect(loginDialog).not.toBeVisible()
  await page.reload()
  const restored = await openHistory(page)
  await expect(restored.getByRole('button', { name: title, exact: true })).toBeVisible()
  await restored.getByRole('button', { name: title, exact: true }).click()
  await expect(page.getByTestId('chat-messages').getByText(userMessage, { exact: true })).toBeVisible()
  await expect(page.getByTestId('chat-messages').getByText(assistantMessage, { exact: true })).toBeVisible()
  const finalMessages = await page.request.get(`/api/conversations/${conversationId}/messages`)
  expect(finalMessages.status()).toBe(200)
  expect((await finalMessages.json()).messages.map((message: { content: string }) => message.content)).toEqual([userMessage, assistantMessage])
  expect((await page.request.delete(`/api/conversations/${conversationId}`, { headers: mutationHeaders })).status()).toBe(200)
  await logout(page)

  expect((await (await page.request.get('/api/saints?view=cards&limit=1')).json()).total).toBe(179)
  expect((await (await page.request.get('/api/miracles?view=cards&limit=1')).json()).total).toBe(miracleTotal)
  expect(aiRequests).toBe(0)
  expect(pageErrors).toEqual([])
  await test.info().attach('session-isolation', { contentType: 'application/json', body: JSON.stringify({ syntheticAccounts: 2, realAuthentication: true, interceptedAuthOrHistory: false, foreignReadAndWritesRejected: 5, paidAiCalls: 0, catalogWrites: 0 }) })
})
