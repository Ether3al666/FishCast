import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const total = JSON.parse(readFileSync('src/data/chongqing-spots.json', 'utf8')).length;

test('真实候选列表、许可筛选、资料来源和直接详情', async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', (r) => r.abort());
  await page.goto('/#/map');
  await expect(page.locator('.spot-card')).toHaveCount(total);
  await expect(page.locator('.spot-card').first()).toContainText('凉风村垂钓基地');
  await expect(page.locator('.spot-card').first()).not.toContainText('DEMO');
  await page.getByRole('combobox', { name: '按资料类型查看' }).selectOption('VERIFIED_OPEN');
  await expect(page.getByText('没有符合筛选条件的记录。')).toBeVisible();
  await page.getByRole('combobox', { name: '按资料类型查看' }).selectOption('UNKNOWN');
  await expect(page.locator('.spot-card')).toHaveCount(total);
  await page.getByRole('link', { name: '凉风村垂钓基地', exact: true }).click();
  await expect(page.getByRole('heading', { name: '凉风村垂钓基地' })).toBeVisible();
  await page.getByText('公开资料与来源', { exact: false }).click();
  await expect(page.getByRole('link', { name: /万盛融媒体/ })).toHaveAttribute(
    'href',
    'https://cqwsnews.net/news-detail?id=5001008076',
  );
  await expect(page.locator('main')).toContainText('不是钓位导航');
  await expect(page.locator('main')).toContainText('2026-07-06');
  await page.reload();
  await expect(page.getByRole('heading', { name: '凉风村垂钓基地' })).toBeVisible();
  await page.goto('/#/spots/cq-dongfeng');
  await expect(page.locator('main')).toContainText('村委会位置未作为钓场标记');
  await expect(page.getByRole('link', { name: /高德 POI/ })).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
