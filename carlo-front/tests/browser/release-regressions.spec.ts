import { test, expect, type Page } from "@playwright/test"
import { languages } from "../../lib/i18n"
import { chatTranslations } from "../../lib/chat-translations"

/**
 * Release UI regressions against a LOCAL production build.
 * Public page reads use the selected local backend snapshot. Explicit request
 * interceptions below test browser protocol handling, NOT server authorization
 * or real paid AI. Existing SQL/security suites remain required for those gates.
 * No real credentials, editorial writes or provider calls are used by this file.
 */
test.skip(process.env.ACUTIS_RELEASE_BROWSER !== "1", "Requires the isolated release runner")

const browserErrors = new WeakMap<Page, string[]>()
function local(url: URL) { return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) }
const example = {
  id: "release-ui-saint", slug: "release-ui-saint", name: "Santo sintético de regresión",
  biography: "Contenido exclusivamente sintético para verificar recuperación del navegador.",
  imageUrl: null, title: null, country: null, birthYear: null, deathYear: null,
  birthCountryCode: null, birthContinent: null, birthPlace: null,
  birthLat: null, birthLng: null, birthPrecision: null, birthSources: [],
  editorial: null, patronOf: [], symbols: [],
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
}
function collection(items: { id: string }[]) {
  return { items, total: items.length, nextCursor: null, hasMore: false, previousCursor: null, hasPrevious: false, offset: 0, revision: "release-ui-v1", rankingMode: "alphabetical-unrated", metadata: { facets: { countries: [], types: [] }, approvedTotal: items.length } }
}
async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}
async function open(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "networkidle" })
  expect(response?.status(), "Production-build document response").toBe(200)
  await expect(page.getByRole("heading", { name: "No se pudo cargar el contenido", exact: true })).toHaveCount(0)
  await noOverflow(page)
}

test.beforeEach(async ({ page, context, baseURL }) => {
  expect(baseURL && local(new URL(baseURL)), "Never run release UI simulations on production").toBe(true)
  const errors: string[] = []
  browserErrors.set(page, errors)
  page.on("pageerror", error => errors.push(error.message.slice(0, 500)))
  page.on("console", message => { if (message.type() === "error" && /hydration|Minified React|Uncaught/i.test(message.text())) errors.push(message.text().slice(0, 500)) })
  // Keep local assets/HTTP real; no analytics, map tiles or paid provider traffic.
  await context.route(url => !local(url), route => route.abort())
  await page.route(/\/(?:api\/)?auth\/me(?:\?|$)/, route => route.fulfill({ status: 401, json: { error: "NOT_AUTHENTICATED" } }))
  await page.route("**/api/analytics-config", route => route.fulfill({ json: { enabled: false } }))
  await page.route(/\/(?:api\/)?ai\/(?:chat|translate)(?:\?|$)/, route => route.fulfill({ status: 503, json: { error: "AI_DISABLED" } }))
})

test.afterEach(async ({ page }, info) => {
  const errors = browserErrors.get(page) || []
  await info.attach("release-unhandled-browser-errors", { body: JSON.stringify(errors), contentType: "application/json" })
  expect(errors, "No unexpected application exception or hydration failure").toEqual([])
})

for (const path of ["/", "/santos", "/mapa", "/milagros", "/oraciones", "/versiculos", "/simbolos", "/eucaristia", "/descubre-tu-santo"]) {
  test(`public route ${path}: meaningful content, anonymous access and responsive shell`, async ({ page }) => {
    await open(page, path)
    await expect(page.getByRole("banner")).toHaveCount(1)
    // The full-screen chat deliberately has a different shell from content pages.
    if (path !== "/") await expect(page.getByRole("contentinfo")).toHaveCount(1)
    if (path === "/") {
      await expect(page.getByLabel("Mensaje para la IA", { exact: true })).toBeEnabled()
      await expect(page.getByTestId("chat-section").locator("button[data-chat-suggestion]")).toHaveCount(4)
      await expect(page.getByRole("banner").locator('a[href="/santos"]').filter({ visible: true })).toBeVisible()
    } else if (path === "/santos") {
      await expect(page.getByText(/^\d+ santos encontrados$/, { exact: true }).filter({ visible: true })).toBeVisible()
      await expect(page.getByLabel("Buscar santos", { exact: true }).filter({ visible: true })).toBeEnabled()
      expect(await page.locator('main a[href^="/santos/"]').count()).toBeLessThanOrEqual(12)
    } else if (path === "/mapa") {
      await expect(page.locator(".leaflet-container")).toBeVisible()
      await expect(page.getByText(/^\d+ santos encontrados; \d+ con ubicación documentada\.$/, { exact: true })).toBeVisible()
    } else if (path === "/milagros") {
      await expect(page.getByText("Cargando milagros...", { exact: true })).toHaveCount(0)
      await expect(page.getByLabel("Filtrar milagros por santo")).toBeEnabled()
    } else if (path === "/oraciones") {
      await expect(page.getByLabel("Buscar por título o contenido").filter({ visible: true })).toBeEnabled()
      await expect(page.getByRole("heading", { name: /Oraciones/ }).first()).toBeVisible()
    } else if (path === "/versiculos") {
      await expect(page.getByRole("searchbox", { name: "Sentimiento, palabra o referencia bíblica" })).toBeEnabled()
    } else if (path === "/simbolos") {
      for (const symbol of ["La Cruz", "El Pez (IXTHYS)", "La Paloma", "El Cordero", "El Corazón Sagrado", "La Rosa Mística", "El Ancla", "La Vid"]) {
        await expect(page.getByText(symbol, { exact: true }).first()).toBeVisible()
      }
    } else if (path === "/eucaristia") {
      for (const step of ["Liturgia de la Palabra", "Presentación de las Ofrendas", "Plegaria Eucarística", "Comunión"]) {
        await expect(page.getByText(step, { exact: true }).first()).toBeVisible()
      }
    } else {
      await expect(page.getByRole("button", { name: "Descubrir mis santos afines", exact: true })).toBeDisabled()
      await page.getByPlaceholder("Ejemplo: Soy una persona que valora mucho la familia y la justicia...").fill("Descripción sintética para probar el formulario sin enviar datos personales.")
      await expect(page.getByRole("button", { name: "Descubrir mis santos afines", exact: true })).toBeEnabled()
    }
    await noOverflow(page)
  })
}

test("unknown public route returns a real HTTP404", async ({ page }) => {
  const response = await page.goto("/release-unknown-public-route", { waitUntil: "networkidle" })
  expect(response?.status()).toBe(404)
  await expect(page.getByRole("heading", { name: "Contenido no encontrado", exact: true })).toBeVisible()
})

for (const failure of ["upstream503", "nonJson", "invalidContract"] as const) {
  test(`catalogue ${failure}: visible failure, no false zero and explicit recovery`, async ({ page }) => {
    let attempts = 0
    await page.route(url => url.pathname === "/api/saints", route => {
      attempts++
      if (attempts > 1) return route.fulfill({ json: collection([example]) })
      if (failure === "upstream503") return route.fulfill({ status: 503, json: { error: "BACKEND_UNAVAILABLE" } })
      if (failure === "nonJson") return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Temporary upstream failure</title>" })
      return route.fulfill({ json: { items: null, total: 1, nextCursor: null, hasMore: false } })
    })
    await open(page, "/santos")
    await expect(page.getByRole("alert").filter({ hasText: "No se pudo" })).toBeVisible()
    await expect(page.getByText("0 santos encontrados", { exact: true })).toHaveCount(0)
    expect(attempts, "No hidden retry storm").toBe(1)
    await page.getByRole("button", { name: "Reintentar", exact: true }).click()
    await expect(page.getByRole("heading", { name: example.name, exact: true })).toBeVisible()
    await expect(page.getByText("1 santos encontrados", { exact: true })).toBeVisible()
    expect(attempts).toBe(2)
    await expect(page.getByRole("alert").filter({ hasText: "No se pudo cargar el catálogo" })).toHaveCount(0)
  })
}

test("all15 languages preserve public chat/navigation with zero implicit translation calls", async ({ page }) => {
  test.setTimeout(120_000)
  let translationRequests = 0
  const messages: string[] = []
  await page.route(/\/(?:api\/)?ai\/translate(?:\?|$)/, route => { translationRequests++; return route.fulfill({ status: 503, json: { error: "UNEXPECTED_TRANSLATION" } }) })
  await page.route(/\/(?:api\/)?ai\/chat(?:\?|$)/, route => {
    const body: { lang: string } = route.request().postDataJSON()
    messages.push(body.lang)
    return route.fulfill({ json: { answer: "Synthetic protocol answer " + body.lang } })
  })
  await open(page, "/")
  for (const language of languages) {
    const selector = page.getByTestId("site-language-selector").filter({ visible: true })
    await selector.click()
    const menuId = await selector.getAttribute("aria-controls")
    expect(menuId, "The language selector owns an accessible menu").toBeTruthy()
    await page.locator(`[id="${menuId}"]`).getByRole("button", { name: new RegExp(language.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).click()
    await expect(page.locator("html")).toHaveAttribute("lang", language.code)
    // Anonymous conversations are ephemeral. Reload starts a new empty chat and
    // also verifies that the explicitly chosen language survives navigation.
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.locator("html")).toHaveAttribute("lang", language.code)
    await expect(page.getByTestId("chat-section")).toHaveAttribute("dir", language.code === "ar" ? "rtl" : "ltr")
    const input = page.getByLabel(chatTranslations[language.code]["chat.messageLabel"], { exact: true })
    await expect(input).toBeEnabled()
    await expect(page.getByRole("banner").locator('a[href="/santos"]').filter({ visible: true })).toBeVisible()
    await expect(page.getByTestId("chat-section").locator("button[data-chat-suggestion]")).toHaveCount(4)
    await input.fill("Synthetic browser language-protocol test " + language.code)
    const before = await page.evaluate(() => scrollY)
    await input.press("Enter")
    await expect(page.getByTestId("chat-messages")).toContainText("Synthetic protocol answer " + language.code)
    expect(await page.evaluate(() => scrollY)).toBe(before)
    await noOverflow(page)
  }
  expect(messages).toEqual(languages.map(language => language.code))
  expect(translationRequests).toBe(0)
  await page.reload({ waitUntil: "networkidle" })
  await expect(page.locator("html")).toHaveAttribute("lang", "pl")
  expect(translationRequests).toBe(0)
})

test("discovery result/reset and rejected request are visible (simulated HTTP contract)", async ({ page }) => {
  let requests = 0
  await page.route(/\/(?:api\/)?discover-saint(?:\?|$)/, route => {
    requests++
    if (requests === 1) return route.fulfill({ json: { summary: "Synthetic affinity explanation", matches: [{ id: example.id, slug: example.slug, name: example.name, score: 4 }] } })
    return route.fulfill({ status: 429, json: { error: "RATE_LIMITED" } })
  })
  await open(page, "/descubre-tu-santo")
  const quality = page.getByRole("button", { name: "Compasivo", exact: true })
  await quality.focus()
  await page.keyboard.press("Enter")
  await expect(quality).toHaveAttribute("aria-pressed", "true")
  const challenge = page.getByRole("button", { name: "Impaciencia", exact: true })
  await challenge.focus()
  await page.keyboard.press("Space")
  await expect(challenge).toHaveAttribute("aria-pressed", "true")
  const describe = page.getByPlaceholder("Ejemplo: Soy una persona que valora mucho la familia y la justicia...")
  await describe.fill("Descripción sintética para probar afinidad sin usar información personal.")
  await page.getByRole("button", { name: "Descubrir mis santos afines" }).click()
  await expect(page.getByText("Synthetic affinity explanation", { exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "Ver santo" })).toHaveAttribute("href", "/santos/" + example.slug)
  await page.getByRole("button", { name: "Hacer nuevo análisis" }).click()
  await describe.fill("Segunda descripción sintética para comprobar rechazo controlado.")
  await page.getByRole("button", { name: "Descubrir mis santos afines" }).click()
  await expect(page.getByText("RATE_LIMITED", { exact: true })).toBeVisible()
  expect(requests).toBe(2)
})

for (const actor of ["anonymous", "normalUser"] as const) {
  test(`admin gate rejects ${actor} without exposing dashboard (simulated session protocol)`, async ({ page }) => {
    if (actor === "normalUser") await page.route("**/api/auth/me", route => route.fulfill({ json: { user: { id: "release-normal", email: "release@example.invalid", name: "Synthetic" } } }))
    await page.route("**/api/auth/admin/me", route => route.fulfill({ status: 401, json: { error: "NOT_AUTHENTICATED" } }))
    await page.route("**/api/auth/admin/login", route => route.fulfill({ status: 403, json: { error: "FORBIDDEN" } }))
    await page.goto("/admin", { waitUntil: "networkidle" })
    await expect(page).toHaveURL(/\/sanctum\/portal$/)
    await expect(page.getByRole("heading", { name: "Panel de Administración Sagrado" })).toHaveCount(0)
    await page.getByLabel("Email", { exact: true }).fill("release@example.invalid")
    await page.getByLabel("Contraseña", { exact: true }).fill("Synthetic-not-a-real-secret-2026!")
    await page.getByRole("button", { name: "Acceder al Sanctum" }).click()
    await expect(page.getByRole("alert").filter({ hasText: "No se pudo" })).toBeVisible()
    await expect(page).toHaveURL(/\/sanctum\/portal$/)
    await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue("")
  })
}

test("admin successful session renders tabs and logout revokes UI access (simulated protocol)", async ({ page }) => {
  let authenticated = false
  await page.route("**/api/auth/admin/me", route => route.fulfill({ status: authenticated ? 200 : 401, json: authenticated ? { ok: true } : { error: "NOT_AUTHENTICATED" } }))
  await page.route("**/api/auth/admin/login", route => { authenticated = true; return route.fulfill({ json: { ok: true } }) })
  await page.route("**/api/auth/admin/logout", route => { authenticated = false; return route.fulfill({ json: { ok: true } }) })
  await page.route(url => ["/api/saints", "/api/miracles", "/api/miracles/all"].includes(url.pathname), route => route.fulfill({ json: collection([]) }))
  await page.route(url => ["/prayers", "/api/prayers", "/api/prayers/all", "/api/prayers/approved"].includes(url.pathname), route => route.fulfill({ headers: { "X-Total-Count": "0" }, json: [] }))
  await page.goto("/sanctum/portal", { waitUntil: "networkidle" })
  await page.getByLabel("Email", { exact: true }).fill("release-admin@example.invalid")
  await page.getByLabel("Contraseña", { exact: true }).fill("Synthetic-not-a-real-secret-2026!")
  await page.getByRole("button", { name: "Acceder al Sanctum" }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole("heading", { name: "Panel de Administración Sagrado", exact: true })).toBeVisible()
  for (const tab of ["Resumen", "Santos", "Milagros", "Oraciones", "Configuración"]) {
    await expect(page.getByRole("button", { name: tab, exact: true })).toBeVisible()
  }
  await page.getByRole("button", { name: "Santos", exact: true }).click()
  await expect(page.getByRole("button", { name: "Nuevo Santo", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Cerrar Sesión", exact: true }).click()
  await expect(page).toHaveURL(/\/sanctum\/portal$/)
  expect(authenticated).toBe(false)
})
