import { test, expect } from '@playwright/test'
import { catalogTranslations } from '../../lib/catalog-translations'
import { supplementalUiTranslations } from '../../lib/supplemental-ui-translations'
import { prayerHelpKeys, prayerLibraryHelpTranslations } from '../../lib/prayer-library-help-translations'
import { observeReleaseNetwork, assertReleaseNetwork } from './release-network'

test.skip(process.env.ACUTIS_RELEASE_BROWSER !== '1', 'Requires the guarded local release')
test.use({ trace: 'off' })

for (const language of ['en', 'ar'] as const) {
  test(`${language} catalogue, map, miracles and prayers retain real content across navigation`, async ({ page, baseURL }) => {
    test.setTimeout(120_000)
    expect(baseURL).toBe('http://127.0.0.1:3197')
    expect(process.env.BACKEND_URL === 'http://127.0.0.1:3198', 'Exact local backend required').toBe(true)
    let database: URL | undefined
    try { database = new URL(process.env.DATABASE_URL || '') } catch { /* Report only a safe boolean below. */ }
    expect(Boolean(database && database.hostname === '127.0.0.1' && database.port === '55439' &&
      database.pathname === '/acutis_catalog_browser_test' && database.searchParams.get('sslaccept') === 'strict'), 'Exact disposable TLS database required').toBe(true)
    const errors: string[] = []
    const network = observeReleaseNetwork(page)
    page.on('pageerror', error => errors.push(error.name + ': ' + error.message))
    await page.addInitScript(code => localStorage.setItem('language', code), language)
    const cat = (key: string) => catalogTranslations[language]['catalog.' + key]
    const ui = (key: string) => supplementalUiTranslations[language]['supplemental.' + key]
    const checkLayout = async () => {
      await expect(page.locator('html')).toHaveAttribute('lang', language)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      expect(errors).toEqual([])
    }

    await page.goto('/santos?q=Santa%20Felicidad', { waitUntil: 'networkidle' })
    await expect(page.getByLabel(cat('searchSaints'), { exact: true }).filter({ visible: true })).toBeEnabled()
    const biographyLink = page.getByRole('link', { name: cat('readBiography').replace('{name}', 'Santa Felicidad'), exact: true })
    await expect(biographyLink).toBeVisible()
    await checkLayout()
    await biographyLink.click()
    await expect(page.getByRole('heading', { level: 1, name: 'Santa Felicidad', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: cat('backSaints'), exact: true })).toBeVisible()
    await checkLayout()

    await page.goto('/mapa', { waitUntil: 'networkidle' })
    await expect(page.locator('.leaflet-container')).toBeVisible()
    await expect(page.getByLabel(cat('birthCountry'), { exact: true }).filter({ visible: true })).toBeEnabled()
    await checkLayout()

    await page.goto('/milagros', { waitUntil: 'networkidle' })
    await expect(page.getByLabel(cat('searchMiracles'), { exact: true })).toBeEnabled()
    await expect(page.getByText(cat('miraclesCount').replace('{count}', '7'), { exact: true })).toBeVisible()
    await checkLayout()

    const prayerResponse = await page.request.get('/api/prayers/approved')
    expect(prayerResponse.status()).toBe(200)
    const prayers = await prayerResponse.json()
    expect(prayers).toHaveLength(1)
    await page.goto('/oraciones', { waitUntil: 'networkidle' })
    await expect(page.getByLabel(ui('searchPrayerText'), { exact: true }).filter({ visible: true })).toBeEnabled()
    await expect(page.getByText(prayers[0].title, { exact: true }).first()).toBeVisible()
    for (const key of prayerHelpKeys) await expect(page.getByText(prayerLibraryHelpTranslations[language]['prayerHelp.' + key], { exact: true })).toBeVisible()
    await checkLayout()
    await page.screenshot({ path: test.info().outputPath(`prayers-${language}.png`), fullPage: true })
    await assertReleaseNetwork(network,test.info())
    await test.info().attach('language-content-separation', { contentType: 'application/json', body: JSON.stringify({ language, originalSaintName: 'Santa Felicidad', originalPrayerTitle: prayers[0].title, paidAiCalls: 0, catalogWrites: 0 }) })
  })
}
