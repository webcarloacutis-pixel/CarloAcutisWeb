import { test, expect } from '@playwright/test'
import { catalogStorageOrigin, catalogStorageBucket, catalogStorageProvider, resolveCatalogImageUrl } from '../../lib/catalog-storage.mjs'

const provider = catalogStorageProvider()
const bucketUrl = `${catalogStorageOrigin}/storage/v1/object/public/${catalogStorageBucket}/`
const examples = ['san-jose', 'san-pedro', 'san-pablo-de-tarso', 'san-juan-evangelista', 'san-mateo']

// This suite only reads existing catalogue data and public objects, anonymously.
test.beforeEach(async ({ page, baseURL }) => {
  await page.route('**/*', route => {
    const request = route.request()
    const sameSite = new URL(request.url()).origin === new URL(baseURL!).origin
    return ['GET', 'HEAD'].includes(request.method()) && (sameSite || request.url().startsWith(bucketUrl))
      ? route.continue() : route.abort()
  })
})

test('home, catalogue and San José work anonymously with resolved images', async ({ page }, testInfo) => {
  const anonymousState = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/me')
  await page.goto('/', { waitUntil: 'networkidle' })
  expect((await anonymousState).status()).toBe(401)
  const saintsLink = page.getByRole('banner').getByRole('link', { name: 'Santos', exact: true }).filter({ visible: true }).first()
  await saintsLink.click()
  await expect(page).toHaveURL(/\/santos$/)
  await expect(page.locator('main').getByRole('img').first()).toBeVisible()
  await page.goto('/santos?q=San%20Jos%C3%A9')
  const card = page.getByRole('heading', { name: 'San José', exact: true })
  const more = page.getByRole('navigation', { name: 'Paginación de santos', exact: true }).getByRole('button', { name: 'Siguiente', exact: true })
  for (let step = 0; step < 250 && !(await card.count()) && await more.isVisible() && await more.isEnabled(); step++) await more.click()
  await expect(card).toBeVisible()
  const image = page.getByRole('img', { name: 'San José', exact: true })
  await image.scrollIntoViewIfNeeded()
  await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).src)).toBe(new URL(resolveCatalogImageUrl('/catalog/owner-2026/owner-2026-001.webp', provider), page.url()).href)
  await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await page.screenshot({ path: testInfo.outputPath('catalogue.png'), fullPage: true })
  await page.getByRole('link', { name: 'Ver biografía de San José', exact: true }).click()
  await expect(page).toHaveURL(/\/santos\/san-jose$/)
  await expect(page.getByRole('heading', { level: 1, name: 'San José', exact: true })).toBeVisible()
  await expect.poll(() => page.locator('main img').first().evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  // 401 is the expected anonymous auth state, not a catalogue failure.
  expect((await page.request.get('/api/auth/me')).status()).toBe(401)
  await page.screenshot({ path: testInfo.outputPath('san-jose.png'), fullPage: true })
})

for (const [index, slug] of examples.entries()) test(`existing image ${slug}: public 200 WebP and browser decode`, async ({ page, request }) => {
  const logical = `/catalog/owner-2026/owner-2026-${String(index + 1).padStart(3, '0')}.webp`
  const resolved = resolveCatalogImageUrl(logical, provider)
  const response = await request.get(resolved)
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type'].split(';')[0]).toBe('image/webp')
  const bytes = await response.body()
  expect(bytes.subarray(0, 4).toString()).toBe('RIFF')
  expect(bytes.subarray(8, 12).toString()).toBe('WEBP')
  await page.goto('/santos/' + slug)
  const image = page.locator('main img').first()
  await image.scrollIntoViewIfNeeded()
  await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).src)).toBe(new URL(resolved, page.url()).href)
  await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
})

test('a missing public image falls back without a retry loop', async ({ page, request }, testInfo) => {
  const original = resolveCatalogImageUrl('/catalog/owner-2026/owner-2026-001.webp', provider)
  const missing = resolveCatalogImageUrl('/catalog/owner-2026/__nonexistent_image_regression__.webp', provider)
  expect((await request.get(missing)).ok()).toBe(false)
  let attempts = 0
  await page.route(url => url.href === new URL(original, testInfo.project.use.baseURL).href, route => {
    attempts++
    return route.continue({ url: new URL(missing, testInfo.project.use.baseURL).href })
  })
  await page.goto('/santos/san-jose')
  const image = page.locator('main img').first()
  await image.scrollIntoViewIfNeeded()
  await expect.poll(() => image.evaluate(node => new URL((node as HTMLImageElement).src).pathname)).toBe('/placeholder.svg')
  await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  expect(attempts).toBe(1)
  await page.screenshot({ path: testInfo.outputPath('missing-image-fallback.png'), fullPage: true })
})
