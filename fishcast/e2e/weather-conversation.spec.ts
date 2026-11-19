import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const catalog = JSON.parse(
  readFileSync(new URL('../src/data/chongqing-spots.json', import.meta.url), 'utf8'),
) as { id: string; name: string; location?: { lat: number; lon: number } }[];

// Explicit test-only Open-Meteo responses, never data for the production catalog.
function forecastFixture({ morningTemperature = 18, morningRain = 0.2, afternoonRain = 1.5 } = {}) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(
    new Date(Date.now() + 86400000),
  );
  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  const morning = (hour: number) => hour >= 6 && hour < 12;
  const afternoon = (hour: number) => hour >= 12 && hour < 18;
  const column = (value: number) => hours.map(() => value);
  return {
    timezone: 'Asia/Shanghai',
    hourly: {
      time: hours.map((hour) => `${day}T${String(hour).padStart(2, '0')}:00`),
      temperature_2m: hours.map((hour) =>
        morning(hour) ? morningTemperature : afternoon(hour) ? 24 : 12,
      ),
      relative_humidity_2m: column(70),
      precipitation: hours.map((hour) =>
        morning(hour) ? morningRain : afternoon(hour) ? afternoonRain : 0,
      ),
      wind_speed_10m: hours.map((hour) => (afternoon(hour) ? 10 : 8)),
      wind_direction_10m: column(90),
      pressure_msl: column(1012),
      weather_code: column(3),
    },
  };
}

async function send(page: Page, message: string) {
  const input = page.getByRole('textbox', { name: '告诉助手你的出钓想法' });
  await input.fill(message);
  await input.press('Enter');
}

async function expectWeatherOnly(page: Page) {
  const reply = page.getByRole('region', { name: '天气回答', exact: true });
  await expect(reply).toBeVisible();
  await expect(page.locator('.trip-candidate, .trip-stats')).toHaveCount(0);
  await expect(page.getByRole('log')).not.toContainText('核查已失效');
  return reply;
}

async function expectRain(reply: Locator, amount: string) {
  const metric = reply.getByRole('group', { name: '累计降水', exact: true });
  await expect(metric.locator('strong')).toHaveText(amount);
  await expect(metric).toContainText('mm');
}

test('天气快捷问题和连续追问只回答天气，明确找钓点后才显示列表', async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ json: forecastFixture() }),
  );
  await page.goto('/#/plan');
  await page.getByRole('button', { name: '先看看明天上午的天气', exact: false }).click();
  const reply = await expectWeatherOnly(page);
  await expect(reply).toContainText('06:00–12:00');
  await expect(reply.getByRole('group', { name: '气温范围' })).toContainText('18.0');
  await expect(reply.getByRole('group', { name: '气温范围' })).toContainText('°C');
  await expectRain(reply, '1.2');
  await expect(reply.getByRole('group', { name: '最大风速' })).toContainText('8.0');
  await expect(reply.getByRole('group', { name: '最大风速' })).toContainText('km/h');

  await send(page, '会下雨吗');
  await expectWeatherOnly(page);
  await expect(reply).toContainText('06:00–12:00');
  await expectRain(reply, '1.2');
  await send(page, '那下午呢');
  await expectWeatherOnly(page);
  await expect(reply).toContainText('12:00–18:00');
  await expectRain(reply, '9.0');
  await expect(reply.getByRole('group', { name: '气温范围' })).toContainText('24.0');
  await reply.getByRole('button', { name: '看看上午', exact: true }).click();
  await expectRain(reply, '1.2');

  await send(page, '找几个附近钓点');
  await expect(page.locator('.trip-candidate')).toHaveCount(3);
  await expect(reply).toHaveCount(0);
});

test('请求尚未完成时提问会自动更新，重新查询后展示新数据而非失效提示', async ({ page }) => {
  let releaseResponse!: () => void;
  const pending = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  let refreshed = false;
  let requests = 0;
  await page.route('https://api.open-meteo.com/**', async (route) => {
    requests++;
    await pending;
    await route.fulfill({
      json: forecastFixture(refreshed ? { morningTemperature: 31, morningRain: 1.1 } : {}),
    });
  });
  await page.goto('/#/plan', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => requests).toBeGreaterThan(0);
  await send(page, '明天上午天气怎么样');
  const reply = await expectWeatherOnly(page);
  await expect(reply.getByRole('status')).toContainText(/正在|加载|查询|读取/);
  await expect(reply.getByRole('group', { name: '累计降水' })).toHaveCount(0);
  releaseResponse();
  await expectRain(reply, '1.2');
  await expect(reply.getByRole('group', { name: '气温范围' })).toContainText('18.0');
  await expectWeatherOnly(page);

  const initialRequests = requests;
  refreshed = true;
  await reply.getByRole('button', { name: '重新查询天气', exact: true }).click();
  await expect.poll(() => requests).toBeGreaterThan(initialRequests);
  await expectRain(reply, '6.6');
  await expect(reply.getByRole('group', { name: '气温范围' })).toContainText('31.0');
  await expectWeatherOnly(page);
});

test('全天问题失败可重试，日期单独指定也查全天，375px不溢出', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  let failing = true;
  await page.route('https://api.open-meteo.com/**', (route) =>
    failing ? route.abort() : route.fulfill({ json: forecastFixture() }),
  );
  await page.goto('/#/plan');
  await send(page, '明天全天气温如何');
  const reply = await expectWeatherOnly(page);
  await expect(reply.getByRole('alert')).toBeVisible();
  await expect(reply.getByRole('group', { name: '累计降水' })).toHaveCount(0);
  failing = false;
  await reply.getByRole('button', { name: '重新查询天气', exact: true }).click();
  await expectRain(reply, '10.2');
  await expect(reply).toContainText(/全天|00:00.*(?:24:00|00:00)/);
  await expectWeatherOnly(page);

  await page.getByRole('button', { name: '新对话', exact: true }).click();
  await send(page, '明天气温如何');
  await expectWeatherOnly(page);
  await expectRain(reply, '10.2');
  await expect(reply).toContainText(/全天|00:00.*(?:24:00|00:00)/);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
});

test('这里下午的天气沿用所选场所及其坐标，不退回参考中心', async ({ page }) => {
  const coordinates: { lat: number; lon: number }[] = [];
  await page.route('https://api.open-meteo.com/**', (route) => {
    const url = new URL(route.request().url());
    const current = {
      lat: Number(url.searchParams.get('latitude')),
      lon: Number(url.searchParams.get('longitude')),
    };
    coordinates.push(current);
    const center = coordinates[0];
    const local = current.lat !== center.lat || current.lon !== center.lon;
    return route.fulfill({ json: forecastFixture({ afternoonRain: local ? 2 : 1.5 }) });
  });
  await page.goto('/#/plan');
  await expect(page.getByRole('button', { name: '刷新天气', exact: true })).toBeEnabled();
  await send(page, '明天上午，附近30公里找钓点');
  await expect(page.locator('.trip-candidate')).toHaveCount(3);
  const first = page.locator('.trip-candidate').first();
  const href = await first.locator('h4 a').getAttribute('href');
  const spot = catalog.find((item) => href?.endsWith(`/spots/${item.id}`));
  expect(spot?.location).toBeDefined();
  await first.getByRole('button', { name: '查这里的天气', exact: true }).click();
  await expect
    .poll(() =>
      coordinates.some(
        (point) => point.lat === spot!.location!.lat && point.lon === spot!.location!.lon,
      ),
    )
    .toBe(true);
  expect(coordinates[0]).not.toEqual({
    lat: spot!.location!.lat,
    lon: spot!.location!.lon,
  });

  await send(page, '这里下午会下雨吗');
  const reply = await expectWeatherOnly(page);
  await expect(reply).toContainText(spot!.name);
  await expect(reply).toContainText('12:00–18:00');
  await expectRain(reply, '12.0');
});

test('区县天气先选具体位置，切换区县不会沿用旧地点，问几点去才展示时段比较', async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ json: forecastFixture() }),
  );
  await page.goto('/#/plan');
  await send(page, '明天上午万州天气怎么样');
  const reply = await expectWeatherOnly(page);
  await expect(reply).toContainText('想查万州区哪里的天气');
  await expect(reply.getByRole('group')).toHaveCount(0);
  const selector = reply.getByRole('combobox', { name: '天气查询地点' });
  await selector.selectOption({ index: 1 });
  await expectRain(reply, '1.2');
  await send(page, '几点去合适');
  await expectWeatherOnly(page);
  await expect(reply.locator('.weather-answer-comparison')).toBeVisible();
  await send(page, '那酉阳呢');
  await expect(reply).toContainText('想查酉阳土家族苗族自治县哪里的天气');
  await expect(reply.getByRole('group')).toHaveCount(0);
  await reply.getByRole('button', { name: '查看出发地天气' }).click();
  await expectRain(reply, '1.2');
  await expect(reply).toContainText('重庆主城区');
  await send(page, '看全天');
  await expectRain(reply, '10.2');
});

test('完整场所名称优先于包含的短名称，附近找点和重新核查沿用该位置', async ({ page }) => {
  const target = catalog.find((spot) => spot.name === '龙井流水欢乐钓场')!;
  const requested: string[] = [];
  await page.route('https://api.open-meteo.com/**', (route) => {
    const url = new URL(route.request().url());
    requested.push(`${url.searchParams.get('latitude')},${url.searchParams.get('longitude')}`);
    return route.fulfill({ json: forecastFixture() });
  });
  await page.goto('/#/plan');
  await send(page, `明天上午${target.name}会下雨吗`);
  const reply = await expectWeatherOnly(page);
  await expect(reply).toContainText(target.name);
  await expectRain(reply, '1.2');
  expect(requested).toContain(`${target.location!.lat},${target.location!.lon}`);
  await reply.getByRole('button', { name: '看看附近钓点' }).click();
  await expect(page.locator('.trip-candidate').first()).toContainText(target.name);
  await expect(page.locator('.trip-candidate').first()).toContainText('0.0 km');
  await expect(page.getByRole('log')).toContainText(`以${target.name}为中心`);
  await page.getByRole('button', { name: '重新核查草稿' }).click();
  await expect(page.locator('.trip-candidate').first()).toContainText('0.0 km');
});
