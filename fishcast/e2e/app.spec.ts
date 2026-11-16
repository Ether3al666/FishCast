import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // 浏览器失败分支稳定使用断网模拟；不把测试响应当真实天气。
  await page.route('https://api.open-meteo.com/**', (route) => route.abort());
});
test('API 失败可读、真实库为空、重试可操作', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '好去处，值得认真核实。' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('天气获取失败');
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.spot-card')).toHaveCount(0);
});
test('示例隔离、状态筛选、详情及退出', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '体验示例场景' }).click();
  await expect(page.locator('.demo-banner')).toContainText('DEMO');
  await expect(page.locator('.spot-card')).toHaveCount(2);
  await page.locator('.site-header').getByRole('link', { name: '地图找点' }).click();
  await expect(page.getByRole('heading', { name: '地图服务尚未启用' })).toBeVisible();
  await page.getByRole('button', { name: '查看候选列表' }).click();
  await expect(page).toHaveURL(/#\/map$/);
  await page.getByRole('combobox').selectOption('PROHIBITED');
  await expect(page.locator('.spot-card:visible')).toHaveCount(1);
  await page.getByRole('link', { name: '示例水域 B', exact: true }).click();
  await expect(page.getByRole('heading', { name: '模拟禁止垂钓' })).toBeVisible();
  await page.locator('.demo-banner').getByRole('button').click();
  await expect(page.getByRole('heading', { name: '当前模式下没有这条记录' })).toBeVisible();
});

test('天气成功（测试响应）后失败保留缓存并标记非实时，示例不覆盖真实缓存', async ({ page }) => {
  let fail = false;
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
  const time = Array.from({ length: 24 }, (_, i) => `${day}T${String(i).padStart(2, '0')}:00`);
  const column = (value: number) => time.map(() => value);
  // 仅用于网络分支验收的 synthetic fixture，不保存为真实天气截图。
  await page.route('https://api.open-meteo.com/**', (route) =>
    fail
      ? route.abort()
      : route.fulfill({
          json: {
            timezone: 'Asia/Shanghai',
            hourly: {
              time,
              temperature_2m: column(18),
              relative_humidity_2m: column(70),
              precipitation: column(0),
              wind_speed_10m: column(5),
              wind_direction_10m: column(90),
              pressure_msl: column(1010),
              weather_code: column(1),
            },
          },
        }),
  );
  await page.goto('/');
  await expect(page.locator('.temperature strong')).toHaveText('18°');
  await page.getByRole('button', { name: '体验示例场景' }).click();
  await expect(page.locator('.demo-banner')).toBeVisible();
  await page.locator('.demo-banner').getByRole('button').click();
  await expect(page.locator('.temperature strong')).toHaveText('18°');
  fail = true;
  await page.getByRole('button', { name: '刷新天气' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText(/非实时缓存 · 获取于/)).toBeVisible();
  await expect(page.locator('.temperature strong')).toHaveText('18°');
});

test('键盘跳转不破坏 HashRouter，反向时间窗被拒绝', async ({ page }) => {
  await page.goto('/#/plan');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '跳到主要内容' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/plan$/);
  await page.getByLabel('开始时间', { exact: true }).fill('18:00');
  await page.getByRole('button', { name: '核查出钓计划' }).click();
  await expect(page.getByRole('alert')).toContainText('结束时间晚于开始时间');
});
test('规划提交无可靠资料时返回空结果，修改条件清除旧计划', async ({ page }) => {
  await page.goto('/#/plan');
  await page.getByRole('button', { name: '核查出钓计划' }).click();
  await expect(page.getByText('暂无可靠时段建议 · 合格钓点不足', { exact: true })).toBeVisible();
  await expect(page.getByText('已核查 0 条候选，0 个进入正式推荐', { exact: true })).toBeVisible();
  await page.getByLabel('目标鱼种').selectOption('鲤鱼');
  await expect(page.getByRole('heading', { name: '把时间留给水边' })).toBeVisible();
});
test('离线明确提示，深链接刷新不 404', async ({ page, context }) => {
  await page.goto('/#/about');
  await page.reload();
  await expect(page.getByRole('heading', { name: '每一条信息，都有来处' })).toBeVisible();
  await context.setOffline(true);
  await expect(page.locator('.offline-banner')).toBeVisible();
  await context.setOffline(false);
});
test('默认不请求定位，拒绝定位后仍可用', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: (_success: unknown, fail: () => void) => fail() },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '使用我的位置' }).click();
  await expect(page.getByRole('status')).toContainText('定位未获授权');
  await expect(page.getByRole('heading', { name: '先看天气，再做决定' })).toBeVisible();
});
for (const width of [375, 768, 1440]) {
  test(`${width}px 主要路由没有横向溢出`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    for (const path of ['/', '/map', '/plan', '/about']) {
      await page.goto(`/#${path}`);
      await expect(page.locator('main')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.goto('/');
    await expect(page.getByRole('alert')).toBeVisible();
    await page.screenshot({ path: `docs/evidence/home-${width}-api-failure.png`, fullPage: true });
    await page.getByRole('button', { name: '体验示例场景' }).click();
    await expect(page.locator('.notice.warning')).toContainText('DEMO');
    await page.screenshot({ path: `docs/evidence/home-${width}-DEMO.png`, fullPage: true });
  });
}
