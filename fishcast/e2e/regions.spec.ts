import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { MAIN_CITY_DISTRICTS, OUTER_DISTRICTS } from '../src/config/regions';

const spots: {
  district: string;
  traditionalDistrict?: string;
  legalStatus: string;
  location: unknown;
}[] = JSON.parse(
  readFileSync(new URL('../src/data/chongqing-spots.json', import.meta.url), 'utf8'),
);
const mainCount = spots.filter((spot) => spot.traditionalDistrict).length;

test.beforeEach(async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', (r) => r.abort());
});
test('传统九区分区、现行区名、空区域和示例隔离', async ({ page }) => {
  await page.goto('/#/map');
  await expect(
    page.getByRole('button', { name: `全重庆 · ${spots.length}`, exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.spot-card')).toHaveCount(spots.length);
  await page.getByRole('button', { name: `主城九区 · ${mainCount}`, exact: true }).click();
  await expect(page.locator('.spot-card')).toHaveCount(mainCount);
  for (const district of MAIN_CITY_DISTRICTS) {
    const count = spots.filter((spot) => spot.traditionalDistrict === district).length;
    await page.getByRole('button', { name: `${district} · ${count}`, exact: true }).click();
    await expect(page.locator('.spot-card')).toHaveCount(count);
  }
  await page.getByRole('button', { name: '渝中区 · 0', exact: true }).click();
  await expect(page.getByText(/渝中区暂未收录可核实/)).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page
    .getByRole('button', {
      name: `江北区 · ${spots.filter((spot) => spot.traditionalDistrict === '江北区').length}`,
      exact: true,
    })
    .click();
  await page.getByRole('link', { name: '林秀湖畔路亚基地', exact: true }).click();
  await expect(page.locator('main')).toContainText('江北区 / 两江新区');
  await page.goto('/#/map');
  await page.getByRole('button', { name: `主城九区 · ${mainCount}`, exact: true }).click();
  await page.locator('footer').getByRole('button', { name: '体验示例', exact: true }).click();
  await expect(page.locator('.spot-card')).toHaveCount(2);
});

test('全重庆可逐区县浏览并在手机上回到全量目录', async ({ page }) => {
  await page.goto('/#/map');
  const selector = page.getByRole('combobox', { name: '更多区县' });
  for (const district of ['两江新区', ...OUTER_DISTRICTS]) {
    const count = spots.filter((spot) => spot.district === district).length;
    await selector.selectOption(district);
    await expect(selector).toHaveValue(district);
    await expect(page.locator('.spot-card')).toHaveCount(count);
  }
  await selector.selectOption('酉阳土家族苗族自治县');
  await page.setViewportSize({ width: 375, height: 812 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.getByRole('button', { name: `全重庆 · ${spots.length}`, exact: true }).click();
  await expect(selector).toHaveValue('');
  await expect(page.locator('.spot-card')).toHaveCount(spots.length);
});
test('规划在九区、单区和距离范围之间切换并保留出行条件', async ({ page }) => {
  await page.goto('/#/plan');
  await expect(page.getByRole('button', { name: '刷新天气', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '明天上午，看看主城九区', exact: false }).click();
  await expect(page.locator('.trip-summary')).toContainText('主城九区 · 不限半径');
  await expect(page.locator('.trip-stats')).toContainText(`${mainCount}范围内候选`);
  const input = page.getByRole('textbox', { name: '告诉助手你的出钓想法' });
  await input.fill('改为江北区');
  await input.press('Enter');
  await expect(page.locator('.trip-summary')).toContainText('江北区 · 不限半径');
  await expect(page.locator('.trip-candidate').first()).toContainText('江北区');
  await input.fill('改为渝中区');
  await input.press('Enter');
  await expect(page.locator('.trip-candidate')).toHaveCount(0);
  await page.getByRole('button', { name: '查看主城九区', exact: true }).click();
  await expect(page.locator('.trip-summary')).toContainText('主城九区 · 不限半径');
  await page.getByRole('button', { name: '改看附近 30 km', exact: true }).click();
  await expect(page.locator('.trip-summary')).toContainText('30 km 内');
  await expect(page.locator('.trip-summary')).not.toContainText('不限半径');
  await page.getByText('精确设置新计划', { exact: true }).click();
  await page.getByRole('combobox', { name: '查找区域', exact: true }).selectOption('南岸区');
  await page.getByRole('button', { name: '核查出钓计划' }).click();
  await expect(page.locator('.trip-summary')).toContainText('南岸区 · 不限半径');
});

test('规划支持全重庆、外围简称与精确区县设置', async ({ page }) => {
  await page.goto('/#/plan');
  await expect(page.getByRole('button', { name: '刷新天气', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '明天上午，看看全重庆', exact: false }).click();
  await expect(page.locator('.trip-summary')).toContainText('全重庆 · 不限半径');
  await expect(page.locator('.agent-draft')).not.toContainText('传统九区口径');
  const eligibleCount = spots.filter(
    (spot) => spot.location && spot.legalStatus !== 'PROHIBITED',
  ).length;
  await expect(page.locator('.trip-stats')).toContainText(`${eligibleCount}范围内候选`);
  const input = page.getByRole('textbox', { name: '告诉助手你的出钓想法' });
  for (const [short, district] of [
    ['万州', '万州区'],
    ['石柱', '石柱土家族自治县'],
    ['酉阳', '酉阳土家族苗族自治县'],
  ]) {
    await input.fill(`改为${short}`);
    await input.press('Enter');
    await expect(page.locator('.trip-summary')).toContainText(`${district} · 不限半径`);
    await expect(page.locator('.trip-stats')).toContainText(
      `${spots.filter((spot) => spot.district === district && spot.location && spot.legalStatus !== 'PROHIBITED').length}范围内候选`,
    );
  }
  await page.getByRole('button', { name: '查看全重庆', exact: true }).click();
  await expect(page.locator('.trip-summary')).toContainText('全重庆 · 不限半径');
  await page.getByText('精确设置新计划', { exact: true }).click();
  await page
    .getByRole('combobox', { name: '查找区域', exact: true })
    .selectOption('彭水苗族土家族自治县');
  await page.getByRole('button', { name: '核查出钓计划' }).click();
  await expect(page.locator('.trip-summary')).toContainText('彭水苗族土家族自治县 · 不限半径');
});
