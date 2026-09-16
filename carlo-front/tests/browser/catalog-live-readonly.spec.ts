import { test, expect } from '@playwright/test';
import { catalogEntries as entries } from './catalog-data';

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
  const more = page.getByRole('button', { name: 'Cargar más santos', exact: true });
  while (await more.isVisible()) await more.click();
  await expect(cards).toHaveCount(entries.length);
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
  await expect(page.getByRole('link', { name: /^Ver detalles de / })).toHaveCount(entries.length);
  await expect(page.getByLabel('Mapa de lugares de nacimiento. Usa las flechas y las teclas más y menos para navegar.', { exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: `${entries.length} santos encontrados;` })).toBeVisible();
});

test('existing miracles expose complete API text and working search', async ({ page, request }) => {
  const response = await request.get('/api/miracles?limit=100');
  expect(response.status()).toBe(200);
  const miracles = await response.json() as Array<{ title: string; details: string | null }>;
  expect(miracles.length).toBeGreaterThan(0);
  await page.goto('/milagros');
  await expect(page.getByText(`${miracles.length} milagros encontrados`, { exact: true })).toBeVisible();
  for (const miracle of miracles) {
    await expect(page.getByText(miracle.title, { exact: true })).toBeVisible();
    if (miracle.details) await expect(page.getByText(miracle.details, { exact: true })).toBeVisible();
  }
  await page.getByLabel('Buscar milagros', { exact: true }).fill(miracles[0].title);
  await expect(page.getByText(miracles[0].title, { exact: true })).toBeVisible();
});
