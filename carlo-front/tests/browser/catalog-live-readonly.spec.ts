import { test, expect, type Page, type Locator } from '@playwright/test';
import { catalogEntries as entries } from './catalog-data';


async function collectVisibleLinks(page: Page, links: Locator, label: string, total: number, size: number) {
  const seen = new Set<string>();
  const next = page.getByRole('navigation', { name: label, exact: true }).getByRole('button', { name: 'Siguiente' });
  for (let step = 0; step < Math.max(1, Math.ceil(total / size)); step++) {
    const hrefs = await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')!));
    expect(hrefs.length).toBeLessThanOrEqual(size);
    for (const href of hrefs) { expect(seen.has(href)).toBe(false); seen.add(href); }
    if (seen.size === total) break;
    await expect(next).toBeEnabled();
    const before = await links.first().getAttribute('href');
    await next.click();
    await expect(links.first()).not.toHaveAttribute('href', before!);
  }
  expect(seen.size).toBe(total);
}

// Reads existing content only. Never seed, reset, create, edit, or delete records.
test.use({ trace: 'off', screenshot: 'only-on-failure', video: 'off' });
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
});

test('existing catalogue supports complete pagination, search, reload, country and unknown death filters', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/santos');
  await expect(page.getByText(`${entries.length} santos encontrados`, { exact: true })).toBeVisible();
  const cards = page.locator('main').getByRole('link', { name: /^Ver biografía de / });
  await collectVisibleLinks(page, cards, 'Paginación de santos', entries.length, 12);
  const chosen = [...entries].sort((a, b) => b.name.length - a.name.length)[0];
  const search = page.getByLabel('Buscar santos', { exact: true }).filter({ visible: true });
  await search.fill(chosen.name);
  await expect(page.getByRole('heading', { name: chosen.name, exact: true })).toBeVisible();
  await page.reload();
  await expect(search).toHaveValue(chosen.name);
  const country = entries.find(entry => typeof entry.birthCountryCode === 'string' && entry.birthCountryCode)?.birthCountryCode;
  if (typeof country === 'string') {
    await page.goto('/santos?country=' + encodeURIComponent(country));
    await expect(page.getByText(`${entries.filter(entry => entry.birthCountryCode === country).length} santos encontrados`, { exact: true })).toBeVisible();
    await expect(page.getByLabel('País de nacimiento', { exact: true }).filter({ visible: true })).toHaveValue(country);
  }
  await page.goto('/santos?century=unknown');
  await expect(page.getByText(`${entries.filter(entry => entry.deathYear == null).length} santos encontrados`, { exact: true })).toBeVisible();
});

test('existing map retains all catalogue links and documented location labels', async ({ page }) => {
  await page.goto('/mapa');
  await expect(page.getByRole('status').filter({ hasText: `${entries.length} santos encontrados;` })).toBeVisible();
  await collectVisibleLinks(page, page.getByRole('link', { name: /^Ver detalles de / }), 'Paginación de santos del mapa', entries.length, 20);
  await expect(page.getByLabel('Mapa de lugares de nacimiento. Usa las flechas y las teclas más y menos para navegar.', { exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: `${entries.length} santos encontrados;` })).toBeVisible();
});

test('existing miracles expose complete API text and working search', async ({ page, request }) => {
  const miracles: Array<{ id: string; title: string; details: string | null }> = [];
  let cursor: string | null = null;
  const cursors = new Set<string>();
  for (let step = 0; step < 1000; step++) {
    const response = await request.get('/api/miracles?limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
    expect(response.status()).toBe(200);
    const body = await response.json();
    miracles.push(...(Array.isArray(body) ? body : body.items));
    cursor = Array.isArray(body) ? response.headers()['x-next-cursor'] || null : body.nextCursor;
    if (!cursor) break;
    expect(cursors.has(cursor)).toBe(false); cursors.add(cursor);
    expect(step).toBeLessThan(999);
  }
  expect(new Set(miracles.map(item => item.id)).size).toBe(miracles.length);
  expect(miracles.length).toBeGreaterThan(0);
  await page.goto('/milagros');
  await expect(page.getByText(`${miracles.length} milagros encontrados`, { exact: true })).toBeVisible();
  for (const miracle of miracles) {
    await page.getByLabel('Buscar milagros', { exact: true }).fill(miracle.title);
    await expect(page.getByText(miracle.title, { exact: true })).toBeVisible();
    if (miracle.details) await expect(page.getByText(miracle.details, { exact: true })).toBeVisible();
  }
  await page.getByLabel('Buscar milagros', { exact: true }).fill(miracles[0].title);
  await expect(page.getByText(miracles[0].title, { exact: true })).toBeVisible();
});
