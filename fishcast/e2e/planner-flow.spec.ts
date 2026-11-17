import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const catalog = JSON.parse(
  readFileSync(new URL('../src/data/chongqing-spots.json', import.meta.url), 'utf8'),
) as unknown[];

test('真实候选筛选、扩围、选择场所获取当地天气并重试', async ({ page }) => {
  let failLocal = false;
  const requested: string[] = [];
  await page.route('https://api.open-meteo.com/**', (route) => {
    const url = new URL(route.request().url());
    requested.push(url.searchParams.get('latitude')! + ',' + url.searchParams.get('longitude'));
    if (failLocal) return route.abort();
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(
      new Date(Date.now() + 86400000),
    );
    const time = Array.from({ length: 24 }, (_, i) => `${day}T${String(i).padStart(2, '0')}:00`);
    const col = (v: number) => time.map(() => v);
    return route.fulfill({
      json: {
        timezone: 'Asia/Shanghai',
        hourly: {
          time,
          temperature_2m: col(16),
          relative_humidity_2m: col(70),
          precipitation: col(0),
          wind_speed_10m: col(5),
          wind_direction_10m: col(90),
          pressure_msl: col(1012),
          weather_code: col(1),
        },
      },
    });
  });
  await page.goto('/#/plan');
  await expect(page.getByRole('button', { name: '刷新天气', exact: true })).toBeEnabled();
  const input = page.getByRole('textbox', { name: '告诉助手你的出钓想法' });
  await input.fill('明天上午，5公里');
  await input.press('Enter');
  await expect(page.getByRole('heading', { name: '当前范围内没有匹配场所' })).toBeVisible();
  await page.getByRole('button', { name: '扩大到 25 km' }).click();
  await expect(page.locator('.agent-draft')).toContainText('25 km');
  await expect(page.locator('.trip-candidate')).toHaveCount(3);
  await page.getByRole('button', { name: '查这里的天气', exact: true }).first().click();
  await expect(page.getByRole('region', { name: '所选场所天气' })).toContainText(
    '风雨较小的两小时',
  );
  expect(new Set(requested).size).toBeGreaterThan(1);
  await expect(page.locator('.trip-permission, .trip-weather-caption')).toHaveCount(0);
  failLocal = true;
  await page.getByRole('button', { name: '刷新当地天气' }).click();
  await expect(page.getByRole('region', { name: '所选场所天气' }).getByRole('alert')).toBeVisible();
  await expect(page.locator('.trip-windows')).toHaveCount(0);
  failLocal = false;
  await page.getByRole('button', { name: '刷新当地天气' }).click();
  await expect(page.locator('.trip-windows')).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await input.fill('明天上午路亚，25公里');
  await input.press('Enter');
  await expect(page.locator('.trip-candidate').first()).toContainText('路亚');
  await expect(page.getByRole('region', { name: '所选场所天气' })).toHaveCount(0);
});

test('扩充后的目录可搜索且未知许可不伪装成开放', async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', (r) => r.abort());
  await page.goto('/#/map');
  await page.getByRole('searchbox', { name: '搜索场所或地址' }).fill('路亚');
  const count = await page.locator('.spot-card').count();
  expect(count).toBeGreaterThan(5);
  expect(count).toBeLessThan(catalog.length);
  await page.getByRole('combobox', { name: '按资料类型查看' }).selectOption('VERIFIED_OPEN');
  await expect(page.locator('.spot-card')).toHaveCount(0);
});
