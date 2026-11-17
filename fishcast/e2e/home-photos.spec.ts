import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const gallery: Record<string, { url: string; alt: string; sourceUrl: string }[]> = JSON.parse(
  readFileSync(new URL('../src/data/spot-gallery.json', import.meta.url), 'utf8'),
);

test.beforeEach(async ({ page }) => {
  // Network fixtures exercise image fallback only, never real-place evidence.
  await page.route('https://**/*', (route) => route.abort());
});

test('首页地点以照片代替问号，首图失败后使用同一地点的下一张资料图', async ({ page }) => {
  const replacement = gallery['cq-liangfeng'][1];
  await page.route(replacement.url, (route) =>
    route.fulfill({ path: 'public/images/water.jpg', contentType: 'image/jpeg' }),
  );
  await page.goto('/');
  const cards = page.locator('.is-home .spot-card');
  await expect(cards).toHaveCount(6);
  await expect(cards.locator('.spot-icon')).toHaveCount(0);
  await expect(cards.locator('.trip-photo')).toHaveCount(6);
  await cards.first().scrollIntoViewIfNeeded();
  const photo = cards.first().locator('.trip-photo img');
  await expect(photo).toHaveAttribute('src', replacement.url);
  await expect(photo).toHaveAttribute('alt', replacement.alt);
  await expect(cards.first().locator('figcaption a')).toHaveAttribute(
    'href',
    replacement.sourceUrl,
  );
  await expect
    .poll(() =>
      photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);

  for (const width of [320, 375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await cards.first().getByRole('link', { name: '凉风村垂钓基地', exact: true }).click();
  await expect(page).toHaveURL(/#\/spots\/cq-liangfeng$/);
});

test('首页实景全部加载失败后显示已标注的示意图，资料仍可展开', async ({ page }) => {
  await page.goto('/');
  const first = page.locator('.is-home .spot-card').first();
  await first.scrollIntoViewIfNeeded();
  const photo = first.locator('.trip-photo img');
  await expect(photo).toHaveAttribute('alt', '水景示意，非该场所实景');
  await expect(first.locator('.trip-photo figcaption')).toHaveText('水景示意 · 非实景');
  await expect(first.locator('.trip-photo a')).toHaveCount(0);
  await expect
    .poll(() =>
      photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  await first.getByText('场所资料', { exact: true }).click();
  await expect(first.locator('details')).toHaveAttribute('open', '');
  await expect(first.getByRole('link', { name: '查看详情', exact: true })).toBeVisible();
});
