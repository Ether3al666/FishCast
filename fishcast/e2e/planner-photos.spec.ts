import { test, expect } from '@playwright/test';

test('场所图片失败时显示带标记的示意图，资料折叠且选点仍可用', async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', (r) => r.abort());
  let photoRequests = 0;
  await page.route(/https:\/\/(aos-comment\.amap\.com|store\.is\.autonavi\.com)\//, (r) => {
    photoRequests++;
    return r.abort();
  });
  await page.goto('/#/plan');
  await expect(page.getByRole('button', { name: '刷新天气', exact: true })).toBeEnabled();
  const input = page.getByRole('textbox', { name: '告诉助手你的出钓想法' });
  await input.fill('明天上午，九龙坡区');
  await input.press('Enter');
  const cards = page.locator('.trip-photo-card');
  await expect(cards).toHaveCount(3);
  await cards.last().scrollIntoViewIfNeeded();
  await expect(page.locator('.trip-photo figcaption')).toHaveText(
    Array(3).fill('水景示意 · 非实景'),
  );
  expect(photoRequests).toBeGreaterThan(0);
  await expect
    .poll(() =>
      page
        .locator('.trip-photo img')
        .evaluateAll((images) =>
          images.every(
            (i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await expect(cards.first().locator('.trip-card-details p').first()).not.toBeVisible();
  await cards.first().getByText('地址与钓法', { exact: true }).click();
  await expect(cards.first().locator('.trip-card-details p').first()).toBeVisible();
  await expect(cards.first().getByRole('link', { name: '场所资料', exact: true })).toHaveAttribute(
    'href',
    /#\/spots\//,
  );
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await cards.first().getByRole('button', { name: '查这里的天气', exact: true }).click();
  await expect(page.getByRole('region', { name: '所选场所天气' }).getByRole('alert')).toBeVisible();
  await expect(page.locator('.trip-windows')).toHaveCount(0);
});
