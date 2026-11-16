import { expect, test } from '@playwright/test';

// 测试 SDK 替身，仅验证页面交互与生命周期；不冒充真实高德底图，不消耗账号服务额度。
const fakeSDK = `(() => {
  class Map {
    constructor(container, options) {
      this.container = container;
      this.handlers = {};
      this.container.setAttribute('data-default-center', JSON.stringify(options.center));
      this.container.setAttribute('data-zoom', options.zoom);
      this.base = document.createElement('div');
      this.base.textContent = 'TEST SDK / 地图测试替身';
      this.base.style.padding = '100px 20px';
      this.container.appendChild(this.base);
      setTimeout(() => this.handlers.complete?.(), 30);
    }
    on(name, callback) { this.handlers[name] = callback; }
    off(name) { delete this.handlers[name]; }
    add(markers) { markers.forEach(marker => { this.container.appendChild(marker.content); marker.content.addEventListener('click', marker.click); }); }
    remove(markers) { markers.forEach(marker => marker.content.remove()); }
    resize() {}
    setZoomAndCenter(zoom, center) { this.container.setAttribute('data-zoom', zoom); this.container.setAttribute('data-center', JSON.stringify(center)); }
    destroy() { this.container.replaceChildren(); }
  }
  class Marker {
    constructor(options) { this.content = options.content; }
    on(name, callback) { this.click = callback; }
    off() { this.content.removeEventListener('click', this.click); }
  }
  window.AMap = { Map, Marker };
  window.___onAPILoaded();
})();`;

test.beforeEach(async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', (route) => route.abort());
  await page.route('https://webapi.amap.com/maps?**', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: fakeSDK }),
  );
});

test('地图按需加载，默认重庆视图，示例标记可选且随筛选更新', async ({ page }) => {
  let sdkCalls = 0;
  const extraServices: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname === 'webapi.amap.com' && url.pathname === '/maps') sdkCalls++;
    if (url.hostname === 'restapi.amap.com') extraServices.push(url.pathname);
  });
  await page.goto('/#/map');
  expect(sdkCalls).toBe(0);
  await page.getByRole('button', { name: '加载重庆地图' }).click();
  await expect(page.getByText('高德基础地图 · 重庆', { exact: true })).toBeVisible();
  expect(sdkCalls).toBe(1);
  const center = JSON.parse(
    (await page.getByTestId('amap-container').getAttribute('data-default-center')) ?? '[]',
  );
  expect(center[0]).toBeGreaterThan(106.5);
  expect(center[1]).toBeGreaterThan(29.5);
  await expect(page.locator('.map-pin')).toHaveCount(0);
  await page.getByRole('button', { name: '体验示例场景' }).click();
  await expect(page.locator('.map-pin')).toHaveCount(2);
  await page
    .getByRole('button', { name: '示例水域 A · 待核实 · DEMO 示例位置', exact: true })
    .click();
  await expect(page.locator('.map-selection')).toContainText('虚构展示位置');
  await expect(page.locator('.map-selection')).toContainText('示例水域 A');
  await page.getByRole('combobox').selectOption('PROHIBITED');
  await expect(page.locator('.map-pin')).toHaveCount(1);
  await expect(page.locator('.map-selection')).toHaveCount(0);
  await page.getByRole('button', { name: '示例水域 B · DEMO', exact: true }).click();
  await expect(page.locator('.map-selection')).toContainText('禁止垂钓');
  await page.getByRole('button', { name: '回到重庆默认视图' }).click();
  await expect(page.getByTestId('amap-container')).toHaveAttribute('data-zoom', '11');
  await page.locator('.map-selection').getByRole('link').click();
  await expect(page.getByRole('heading', { name: '模拟禁止垂钓' })).toBeVisible();
  expect(extraServices).toEqual([]);
});

test('地图加载失败可重试，候选列表不受影响', async ({ page }) => {
  let failures = true;
  await page.route('https://webapi.amap.com/maps?**', (route) =>
    failures ? route.abort() : route.fulfill({ contentType: 'text/javascript', body: fakeSDK }),
  );
  await page.goto('/#/map');
  await page.getByRole('button', { name: '加载重庆地图' }).click();
  await expect(page.getByRole('heading', { name: '地图暂时不可用' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '候选水域', exact: true })).toBeVisible();
  failures = false;
  await page.getByRole('button', { name: '重试加载地图' }).click();
  await expect(page.getByText('高德基础地图 · 重庆', { exact: true })).toBeVisible();
});

test('地图卸载重访复用 SDK，手机页面不溢出', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  let calls = 0;
  page.on('request', (request) => {
    if (request.url().startsWith('https://webapi.amap.com/maps?')) calls++;
  });
  await page.goto('/#/map');
  await page.getByRole('button', { name: '加载重庆地图' }).click();
  await expect(page.locator('.map-toolbar')).toBeVisible();
  await page.locator('.mobile-nav').getByRole('link', { name: '探索首页' }).click();
  await page.locator('.mobile-nav').getByRole('link', { name: '地图找点' }).click();
  await page.getByRole('button', { name: '加载重庆地图' }).click();
  await expect(page.locator('.map-toolbar')).toBeVisible();
  expect(calls).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
