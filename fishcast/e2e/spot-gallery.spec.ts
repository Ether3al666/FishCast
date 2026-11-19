import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const gallery: Record<string, { url: string; sourceUrl: string }[]> = JSON.parse(
  readFileSync(new URL('../src/data/spot-gallery.json', import.meta.url), 'utf8'),
);
const photos: Record<string, { url: string; sourceUrl: string }> = JSON.parse(
  readFileSync(new URL('../src/data/spot-photos.json', import.meta.url), 'utf8'),
);

test.beforeEach(async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', (r) => r.abort());
  await page.route('https://webapi.amap.com/**', (r) => r.abort());
});

test('地点相册可用键盘切换，资料默认折叠且可查来源', async ({ page }) => {
  // Local decorative image only substitutes bytes for deterministic interaction testing.
  // Genuine remote images are checked separately in the browser capture script.
  await page.route('https://ws.cq.gov.cn/**/*.jpg', (r) =>
    r.fulfill({ path: 'public/images/water.jpg', contentType: 'image/jpeg' }),
  );
  await page.goto('/#/spots/cq-liangfeng');
  const mainPhoto = page.locator('.venue-gallery-main img');
  await expect(mainPhoto).toHaveAttribute('src', gallery['cq-liangfeng'][0].url);
  await expect(page.getByText('2024 年赛事资料图 · 不代表当前开放情况')).toBeVisible();
  await expect(page.getByRole('link', { name: '图片来源：关坝镇人民政府' })).toHaveAttribute(
    'href',
    gallery['cq-liangfeng'][0].sourceUrl,
  );
  const choice = page.getByRole('button', { name: '查看沿岸钓位' });
  await choice.focus();
  await choice.press('Enter');
  await expect(choice).toHaveAttribute('aria-pressed', 'true');
  await expect(mainPhoto).toHaveAttribute('src', gallery['cq-liangfeng'][1].url);
  await expect(page.locator('.venue-disclosures details[open]')).toHaveCount(0);
  await page.getByText('位置与核查信息', { exact: true }).click();
  await expect(page.getByText(/仅用于识别所在区域，不是钓位导航/)).toBeVisible();
  await page.getByText('公开资料与来源', { exact: false }).click();
  await expect(page.getByRole('link', { name: /万盛融媒体/ })).toBeVisible();
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('link', { name: '看看其他地点' }).click();
  await expect(page).toHaveURL(/#\/map$/);
});

test('全部实景照片加载失败后明确显示示意图，不残留实景来源', async ({ page }) => {
  await page.route('https://ws.cq.gov.cn/**/*.jpg', (r) => r.abort());
  await page.goto('/#/spots/cq-liangfeng');
  const mainPhoto = page.locator('.venue-gallery-main img');
  await expect(mainPhoto).toHaveAttribute('alt', '水景示意，非该场所实景');
  await expect(page.getByText('地点图片暂时无法加载 · 当前为水景示意')).toBeVisible();
  await expect(page.locator('.venue-gallery-thumbnails')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /图片来源/ })).toHaveCount(0);
  await expect
    .poll(() => mainPhoto.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0))
    .toBe(true);
  await expect(page.getByRole('heading', { name: '出行信息', exact: true })).toBeVisible();
});

test('单张高德图和无图地点可直接访问，换地点不会沿用旧照片', async ({ page }) => {
  const [id, photo] = Object.entries(photos)[0];
  await page.route(photo.url, (r) =>
    r.fulfill({ path: 'public/images/water.jpg', contentType: 'image/jpeg' }),
  );
  await page.goto(`/#/spots/${id}`);
  await expect(page.locator('.venue-gallery-main img')).toHaveAttribute('src', photo.url);
  await expect(page.getByRole('link', { name: '图片来源：高德场所图' })).toHaveAttribute(
    'href',
    photo.sourceUrl,
  );
  await expect(page.locator('.venue-gallery-thumbnails')).toHaveCount(0);
  await page.evaluate(() => {
    location.hash = '/spots/cq-dongfeng';
  });
  await expect(page.getByText('暂无可核实的地点图片 · 当前为水景示意')).toBeVisible();
  await expect(page.locator('.venue-gallery-main img')).toHaveAttribute(
    'alt',
    '水景示意，非该场所实景',
  );
  await expect(page.getByRole('link', { name: '在高德查看场所位置' })).toHaveCount(0);
});
