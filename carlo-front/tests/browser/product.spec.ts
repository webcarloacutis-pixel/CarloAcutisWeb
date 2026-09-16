import { test, expect, type Page } from "@playwright/test"


// Wait for the actual bootstrap requests before deliberately leaving a document.
// A load event alone can precede React effects and their first API reads.
async function initializedNavigation(page: Page, navigate: () => ReturnType<Page["goto"]>) {
  const initialization = Promise.all(["/api/auth/me", "/api/analytics-config"].map(async (path) => {
    const response = await page.waitForResponse((candidate) => new URL(candidate.url()).pathname === path)
    expect([200, 401]).toContain(response.status())
  }))
  const [response] = await Promise.all([navigate(), initialization])
  return response
}
function gotoReady(page: Page, url: string) { return initializedNavigation(page, () => page.goto(url)) }
function reloadReady(page: Page) { return initializedNavigation(page, () => page.reload()) }

function localUrl(url: string) {
  try { return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(new URL(url).hostname) } catch { return false }
}
async function noOverflow(page: Page) {
  try {
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), { message: "No horizontal overflow at " + page.url() }).toBe(true)
  } catch (error) {
    const overflow = await page.evaluate(() => ({ path: location.pathname, width: innerWidth, scrollWidth: document.documentElement.scrollWidth, elements: [...document.querySelectorAll("body *")].map((element) => ({ tag: element.tagName, classes: String(element.className), right: element.getBoundingClientRect().right, width: element.getBoundingClientRect().width })).filter((element) => element.width > 0 && element.right > innerWidth + 1).slice(-20) }))
    await test.info().attach("overflow-diagnostic", { body: JSON.stringify(overflow, null, 2), contentType: "application/json" })
    throw error
  }
}
test.beforeEach(async ({ context, page }) => {
  await context.route((url) => !localUrl(url.toString()), (route) => route.abort())
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error" && /hydration|Minified React|Uncaught/i.test(message.text())) errors.push(message.text())
  })
  Object.assign(page, { productErrors: errors })
})
test.afterEach(async ({ page }, testInfo) => {
  const errors = (page as Page & { productErrors?: string[] }).productErrors || []
  await testInfo.attach("product-browser-errors", { body: JSON.stringify(errors, null, 2), contentType: "application/json" })
  expect(errors, "No uncaught application or hydration errors").toEqual([])
})

test("catalogue combines birth country, continent and death century; URL reload/back/clear", async ({ page }) => {
  await gotoReady(page, "/santos?continent=europe&country=IT&century=11-15")
  await expect(page.getByText("2 santos encontrados", { exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "San Francisco (test)", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Santa Clara (test)", exact: true })).toBeVisible()
  await expect(page.getByLabel("País de nacimiento", { exact: true }).filter({ visible: true })).toHaveValue("IT")
  await page.getByLabel("Buscar santos", { exact: true }).filter({ visible: true }).fill(" santa  clara ")
  await expect(page.getByText("1 santos encontrados", { exact: true })).toBeVisible()
  await reloadReady(page)
  await expect(page.getByLabel("Buscar santos", { exact: true }).filter({ visible: true })).toHaveValue(" santa  clara ")
  await expect(page.getByRole("heading", { name: "Santa Clara (test)", exact: true })).toBeVisible()
  await page.getByLabel("Continente de nacimiento", { exact: true }).filter({ visible: true }).selectOption("asia")
  await expect(page.getByLabel("País de nacimiento", { exact: true }).filter({ visible: true })).toHaveValue("")
  await expect(page.getByText("0 santos encontrados", { exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByLabel("País de nacimiento", { exact: true }).filter({ visible: true })).toHaveValue("IT")
  await expect(page.getByText("1 santos encontrados", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: /Limpiar Filtros/i }).click()
  await expect(page.getByText("10 santos encontrados", { exact: true })).toBeVisible()
  await expect(page.locator("main").getByRole("link", { name: /^Ver biografía de / })).toHaveCount(6)
  await page.getByRole("button", { name: "Cargar más santos" }).click()
  await expect(page.locator("main").getByRole("link", { name: /^Ver biografía de / })).toHaveCount(10)
  await page.getByLabel("Siglo de fallecimiento", { exact: true }).filter({ visible: true }).selectOption("16-20")
  await expect(page.getByText("1 santos encontrados", { exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Santa Teresa (test)", exact: true })).toBeVisible()
  await noOverflow(page)
})

test("catalogue unknown/empty parameters are safe and no birthplace is invented", async ({ page }) => {
  await gotoReady(page, "/santos?country=unknown&century=not-a-century&q=")
  await expect(page.getByText("0 santos encontrados", { exact: true })).toBeVisible()
  await gotoReady(page, "/santos?country=ES&century=16-20")
  await expect(page.getByText("1 santos encontrados", { exact: true })).toBeVisible()
  await gotoReady(page, "/santos?continent=america")
  await expect(page.getByText("0 santos encontrados", { exact: true })).toBeVisible()
  await gotoReady(page, "/santos?q=" + "x".repeat(500))
  await expect(page.getByLabel("Buscar santos", { exact: true }).filter({ visible: true })).toHaveValue("x".repeat(200))
  await expect(page.getByText("0 santos encontrados", { exact: true })).toBeVisible()
})

test("verse direct links/categories persist; draft query does not relabel executed results; clear cannot restore stale results", async ({ page }) => {
  await gotoReady(page, "/versiculos?busqueda=ISAIAS%2041%3A10")
  await expect(page.getByRole("heading", { name: "Versículos para «ISAIAS 41:10»" })).toBeVisible()
  await expect(page.locator("#resultados").filter({ visible: true }).getByText("— Isaías 41:10")).toBeVisible()
  await page.getByRole("searchbox", { name: "Sentimiento, palabra o referencia bíblica" }).fill("esperanza")
  await expect(page.getByRole("heading", { name: "Versículos para «ISAIAS 41:10»" })).toBeVisible()
  await page.getByRole("button", { name: "Buscar Versículos", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Versículos para «esperanza»" })).toBeVisible()
  await reloadReady(page)
  await expect(page.getByRole("searchbox", { name: "Sentimiento, palabra o referencia bíblica" })).toHaveValue("esperanza")
  await page.goBack()
  await expect(page.getByRole("heading", { name: "Versículos para «ISAIAS 41:10»" })).toBeVisible()
  await expect(page.getByRole("searchbox", { name: "Sentimiento, palabra o referencia bíblica" })).toBeEnabled()
  await page.locator('a[href="/versiculos?categoria=miedo-y-ansiedad"]').click()
  await expect(page).toHaveURL(/\/versiculos\?categoria=miedo-y-ansiedad$/)
  await reloadReady(page)
  const results = page.locator("#resultados").filter({ visible: true })
  await expect(results.getByText(/^\d+ versículos encontrados$/)).toBeVisible()
  await expect(results.locator("blockquote")).not.toHaveCount(0)
  await page.clock.install()
  await page.getByRole("searchbox", { name: "Sentimiento, palabra o referencia bíblica" }).fill("miedo")
  await page.getByRole("button", { name: "Buscar Versículos", exact: true }).click()
  await page.getByRole("button", { name: "Limpiar", exact: true }).click()
  await page.clock.fastForward(1100)
  await expect(page.locator("#resultados").filter({ visible: true })).toHaveCount(0)
  await expect(page.getByRole("searchbox", { name: "Sentimiento, palabra o referencia bíblica" })).toHaveValue("")
  await page.getByRole("searchbox", { name: "Sentimiento, palabra o referencia bíblica" }).fill("consulta todavía sin ejecutar")
  await expect(page.getByText(/No encontramos versículos con estos filtros/)).toHaveCount(0)
  await noOverflow(page)
})

test("prayer cards retain complete stored content, URL categories and all-category clearing", async ({ page, request }) => {
  const response = await request.get("/api/prayers/approved?limit=100")
  expect(response.ok()).toBe(true)
  const prayers = await response.json() as { id: string; title: string; content: string; category: string | null }[]
  expect(prayers.length).toBeGreaterThan(0)
  const longest = [...prayers].sort((a, b) => b.content.length - a.content.length)[0]
  await gotoReady(page, "/oraciones?q=" + encodeURIComponent(longest.title))
  await expect(page.locator("#resultados").filter({ visible: true }).getByText(longest.content, { exact: true })).toBeVisible()
  const fullText = await page.locator("#resultados").filter({ visible: true }).getByText(longest.content, { exact: true }).textContent()
  expect(fullText).toBe(longest.content)
  const featured = page.locator("blockquote")
  expect(await featured.count()).toBeGreaterThan(0)
  for (const text of await featured.allTextContents()) expect(prayers.some((prayer) => prayer.content === text)).toBe(true)
  await noOverflow(page)
  await page.getByRole("button", { name: "Más filtros de oraciones" }).click()
  await page.getByLabel("Categoría", { exact: true }).filter({ visible: true }).selectOption("")
  await page.getByRole("button", { name: "Buscar", exact: true }).click()
  await expect(page.getByLabel("Categoría", { exact: true }).filter({ visible: true })).toHaveValue("")
  await page.getByRole("button", { name: "Limpiar búsqueda de oraciones" }).click()
  await expect(page.getByLabel("Buscar por título o contenido").filter({ visible: true })).toHaveValue("")
  await expect(page.getByRole("button", { name: "Buscar", exact: true })).toBeEnabled()
  await expect(page).toHaveURL(/\/oraciones$/)
  await gotoReady(page, "/oraciones?categoria=proteccion-y-fortaleza")
  await expect(page.getByLabel("Categoría", { exact: true }).filter({ visible: true })).toHaveValue("Protección y Fortaleza")
  await reloadReady(page)
  await expect(page.getByLabel("Categoría", { exact: true }).filter({ visible: true })).toHaveValue("Protección y Fortaleza")
  await page.getByLabel("Categoría", { exact: true }).filter({ visible: true }).selectOption("")
  await page.getByRole("button", { name: "Buscar", exact: true }).click()
  await expect(page.locator("#resultados").filter({ visible: true }).getByRole("heading", { name: prayers.length + " oraciones encontradas", exact: true })).toBeVisible()
  await expect(page.getByText(/Popularidad estimada por IA: sin estimación disponible/).first()).toBeVisible()
})

test("birthplace map keeps markers/list consistent, overlapping saints reachable with keyboard and touch", async ({ page }, testInfo) => {
  await gotoReady(page, "/mapa")
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(2)
  await expect(page.getByText("10 santos encontrados; 3 con ubicación documentada.", { exact: true })).toBeVisible()
  const overlap = page.locator(".leaflet-marker-icon").filter({ hasText: "2" })
  await overlap.focus()
  await overlap.press("Enter")
  await expect(page.locator(".leaflet-popup").getByRole("link", { name: "San Francisco (test)", exact: true })).toBeVisible()
  await expect(page.locator(".leaflet-popup").getByRole("link", { name: "Santa Clara (test)", exact: true })).toBeVisible()
  await expect(page.locator(".leaflet-popup").getByText(/Ubicación aproximada de la ciudad/)).toBeVisible()
  await page.keyboard.press("Escape")
  if (testInfo.project.use.hasTouch) {
    await overlap.tap()
    await expect(page.locator(".leaflet-popup")).toBeVisible()
    await page.keyboard.press("Escape")
  }
  await page.getByLabel("País de nacimiento", { exact: true }).filter({ visible: true }).selectOption("IT")
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(1)
  await expect(page.getByText("2 santos encontrados; 2 con ubicación documentada.", { exact: true })).toBeVisible()
  await page.getByLabel("Continente de nacimiento", { exact: true }).filter({ visible: true }).selectOption("asia")
  await expect(page.getByLabel("País de nacimiento", { exact: true }).filter({ visible: true })).toHaveValue("")
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(0)
  await expect(page.getByText("0 santos encontrados; 0 con ubicación documentada.", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: /Limpiar Filtros/i }).click()
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(2)
  await reloadReady(page)
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(2)
  await noOverflow(page)
})

test("common navigation and saint detail work with desktop/mobile keyboard, orientation and absent slugs", async ({ page }) => {
  await gotoReady(page, "/santos/test-san-francisco")
  await expect(page.getByRole("heading", { name: "San Francisco (test)", exact: true })).toBeVisible()
  await expect(page.getByRole("banner")).toHaveCount(1)
  await expect(page.getByRole("contentinfo")).toHaveCount(1)
  const menu = page.getByRole("button", { name: "Abrir menú", exact: true })
  if (await menu.isVisible()) {
    await menu.click()
    await expect(page.getByRole("button", { name: "Cerrar menú", exact: true })).toHaveAttribute("aria-expanded", "true")
    await page.keyboard.press("Escape")
    await expect(menu).toBeFocused()
    await menu.click()
    await page.getByRole("navigation", { name: "Navegación móvil" }).getByRole("link", { name: "Oraciones", exact: true }).click()
    await expect(menu).toHaveAttribute("aria-expanded", "false")
  } else {
    await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Oraciones", exact: true }).click()
  }
  await expect(page).toHaveURL(/\/oraciones$/)
  for (const path of ["/milagros", "/versiculos", "/simbolos", "/eucaristia", "/descubre-tu-santo"]) {
    await gotoReady(page, path)
    if (path === "/milagros") await expect(page.getByText("Cargando milagros...", { exact: true })).toHaveCount(0)
    await expect(page.getByRole("banner")).toHaveCount(1)
    await expect(page.getByRole("contentinfo")).toHaveCount(1)
    await noOverflow(page)
  }
  const size = page.viewportSize()
  if (size) { await page.setViewportSize({ width: size.height, height: size.width }); await noOverflow(page) }
  await gotoReady(page, "/santos/no-such-saint")
  await expect(page.getByRole("heading", { name: "Contenido no encontrado" })).toBeVisible()
})


test("public pages expose local navigation/resource timings and remain usable in both orientations", async ({ page }, testInfo) => {
  const failedRequests: { path: string; error: string }[] = []
  const badResponses: { path: string; status: number }[] = []
  const consoleMessages: { level: string; text: string }[] = []
  page.on("requestfailed", (request) => {
    if (localUrl(request.url())) failedRequests.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText || "Unknown" })
  })
  page.on("response", (response) => {
    if (localUrl(response.url()) && response.status() >= 400) badResponses.push({ path: new URL(response.url()).pathname, status: response.status() })
  })
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type())) consoleMessages.push({ level: message.type(), text: message.text().slice(0, 500) })
  })
  const timings: unknown[] = []
  for (const path of ["/", "/santos", "/mapa", "/oraciones"]) {
    const response = await gotoReady(page, path)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole("banner")).toHaveCount(1)
    if (path === "/santos") await expect(page.getByText("10 santos encontrados", { exact: true }).filter({ visible: true })).toBeVisible()
    if (path === "/mapa") await expect(page.locator(".leaflet-marker-icon")).toHaveCount(2)
    await noOverflow(page)
    const size = page.viewportSize()
    if (size) {
      await page.setViewportSize({ width: size.height, height: size.width })
      await noOverflow(page)
      await page.setViewportSize(size)
      await noOverflow(page)
    }
    timings.push(await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[]
      const summarize = (entries: PerformanceResourceTiming[]) => ({ requests: entries.length, transferBytes: entries.reduce((sum, entry) => sum + entry.transferSize, 0), encodedBytes: entries.reduce((sum, entry) => sum + entry.encodedBodySize, 0) })
      return {
        path: location.pathname, viewport: { width: innerWidth, height: innerHeight },
        navigation: navigation ? { ttfbMs: navigation.responseStart, domContentLoadedMs: navigation.domContentLoadedEventEnd, loadMs: navigation.loadEventEnd, transferBytes: navigation.transferSize } : null,
        paint: performance.getEntriesByType("paint").map((entry) => ({ name: entry.name, ms: entry.startTime })),
        allResources: summarize(resources), scripts: summarize(resources.filter((entry) => entry.initiatorType === "script" || new URL(entry.name).pathname.endsWith(".js"))), images: summarize(resources.filter((entry) => ["img", "image"].includes(entry.initiatorType))),
        scrollWidth: document.documentElement.scrollWidth,
      }
    }))
    if (path === "/mapa" || path === "/oraciones") {
      const name = path === "/mapa" ? "Continente de nacimiento" : "Santo"
      const control = page.getByRole("combobox", { name, exact: true }).filter({ visible: true })
      await expect(control).toBeEnabled()
      const controlPath = testInfo.outputPath("select-" + path.slice(1) + "-" + testInfo.project.name + ".png")
      await control.screenshot({ path: controlPath, animations: "disabled" })
      await testInfo.attach("public-select-" + path.slice(1), { path: controlPath, contentType: "image/png" })
    }
    if (path === "/santos") {
      const screenshotPath = testInfo.outputPath("catalogue-" + testInfo.project.name + ".png")
      await page.screenshot({ path: screenshotPath, fullPage: false, animations: "disabled" })
      await testInfo.attach("public-catalogue", { path: screenshotPath, contentType: "image/png" })
    }
  }
  await testInfo.attach("local-navigation-performance", { body: JSON.stringify({ scope: "Local production build; external traffic blocked; HTTP cache disabled by Playwright routing; device profiles emulated; no production or field-performance claim", timings, failedRequests, badResponses, consoleMessages }, null, 2), contentType: "application/json" })
  expect(badResponses.filter((response) => !(response.status === 401 && response.path === "/api/auth/me"))).toEqual([])
  expect(failedRequests.filter((request) => !/ABORTED|cancelled|canceled|NS_BINDING_ABORTED/i.test(request.error))).toEqual([])
})
