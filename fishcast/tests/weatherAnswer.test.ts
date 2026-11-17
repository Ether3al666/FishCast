import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Forecast, PlanRequest } from '../src/domain/models';
import { getWeatherAnswer } from '../src/planners/weatherAnswer';
import { WeatherReply } from '../src/components/plan/WeatherReply';

// TEST ONLY: an API-shaped fixture, never imported by production or used as live weather.
const location = { lat: 29.56, lon: 106.55, crs: 'WGS84' as const };
const request: PlanRequest = {
  location,
  startAt: '2026-11-18T08:00:00+08:00',
  endAt: '2026-11-18T12:00:00+08:00',
  targetSpecies: '暂不限定',
  method: 'OTHER',
  radiusKm: 30,
};
const makeForecast = (): Forecast => ({
  source: 'TEST ONLY weather service',
  fetchedAt: '2026-11-17T10:00:00+08:00',
  timezone: 'Asia/Shanghai',
  location: { ...location },
  stale: false,
  isDemo: false,
  hours: Array.from({ length: 4 }, (_, i) => ({
    time: `2026-11-18T${String(8 + i).padStart(2, '0')}:00:00+08:00`,
    temperature: 15 + i,
    humidity: 70,
    precipitation: 0,
    windSpeed: 8 + i,
    windDirection: 180,
    pressure: 1013,
    code: 1,
  })),
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime('2026-11-17T02:00:00Z');
});
afterEach(() => vi.useRealTimers());

describe('天气专用回答', () => {
  it('针对温度提问直接回答温度范围，并把温度指标排在最前', () => {
    const answer = getWeatherAnswer(makeForecast(), request, 'temperature');
    expect(answer.status).toBe('ready');
    if (answer.status !== 'ready') throw new Error('expected ready');
    expect(answer.summary).toContain('气温为 15.0–18.0°C');
    expect(answer.metricOrder[0]).toBe('temperature');
    expect(answer.summary).not.toContain('钓点');
    expect(answer.windKmh).toBe(11);
  });
  it('0 mm 是明确无降水预报，null 是数据缺失', () => {
    const forecast = makeForecast();
    const dry = getWeatherAnswer(forecast, request, 'rain');
    expect(dry.status).toBe('ready');
    expect(dry.summary).toContain('没有降水');
    expect(dry.summary).toContain('0.0 mm');
    forecast.hours[1].precipitation = null;
    const missing = getWeatherAnswer(forecast, request, 'rain');
    expect(missing.status).toBe('unavailable');
    expect(missing.summary).not.toContain('0.0');
  });
  it('半小时边界覆盖相交的整个小时，并明确累计范围', () => {
    const forecast = makeForecast();
    forecast.hours.forEach((h) => {
      h.precipitation = 1;
    });
    const answer = getWeatherAnswer(
      forecast,
      { ...request, startAt: '2026-11-18T08:30:00+08:00', endAt: '2026-11-18T10:30:00+08:00' },
      'rain',
    );
    expect(answer.status).toBe('ready');
    if (answer.status !== 'ready') throw new Error('expected ready');
    expect(answer.rainMm).toBe(3);
    expect(answer.hours).toHaveLength(3);
    expect(answer.coverageNote).toContain('08:00–11:00');
    expect(answer.coverageNote).toContain('整小时');
  });
  it.each([
    [
      '缓存标记过期',
      (f: Forecast) => {
        f.stale = true;
      },
    ],
    [
      '缓存超过30分钟',
      (f: Forecast) => {
        f.fetchedAt = '2026-11-17T09:29:00+08:00';
      },
    ],
    [
      '示例',
      (f: Forecast) => {
        f.isDemo = true;
      },
    ],
    [
      '位置不符',
      (f: Forecast) => {
        f.location.lon += 0.01;
      },
    ],
    [
      '获取时间格式错误',
      (f: Forecast) => {
        f.fetchedAt = 'invalid';
      },
    ],
    [
      '未来获取时间',
      (f: Forecast) => {
        f.fetchedAt = '2026-11-17T11:00:00+08:00';
      },
    ],
    [
      '缺小时',
      (f: Forecast) => {
        f.hours.splice(1, 1);
      },
    ],
    [
      '重复小时',
      (f: Forecast) => {
        f.hours[1] = { ...f.hours[0] };
      },
    ],
    [
      '非整点小时',
      (f: Forecast) => {
        f.hours[0].time = '2026-11-18T08:30:00+08:00';
      },
    ],
    [
      '无效小时',
      (f: Forecast) => {
        f.hours[0].time = '';
      },
    ],
    [
      '无限温度',
      (f: Forecast) => {
        f.hours[0].temperature = Infinity;
      },
    ],
    [
      '缺少天气码',
      (f: Forecast) => {
        f.hours[0].code = null;
      },
    ],
    [
      '负数风速',
      (f: Forecast) => {
        f.hours[0].windSpeed = -1;
      },
    ],
  ])('%s 不输出正常结论', (_, mutate) => {
    const forecast = makeForecast();
    mutate(forecast);
    const answer = getWeatherAnswer(forecast, request);
    expect(answer.status).toBe('unavailable');
    expect(answer).not.toHaveProperty('rainMm');
    expect(answer.summary).not.toContain('没有降水');
  });
  it('无天气和非法时间可读地失败，不用0代替', () => {
    expect(getWeatherAnswer(null, request).status).toBe('unavailable');
    expect(getWeatherAnswer(makeForecast(), { ...request, startAt: '' }).status).toBe(
      'unavailable',
    );
  });
  it('不接受会被Date.parse自动归一化的不存在日期', () => {
    const answer = getWeatherAnswer(
      makeForecast(),
      {
        ...request,
        startAt: '2026-02-30T08:00:00+08:00',
        endAt: '2026-02-30T12:00:00+08:00',
      },
      'overview',
      Date.parse('2026-02-28T10:00:00+08:00'),
    );
    expect(answer.status).toBe('unavailable');
    expect(answer.summary).toContain('所选时间无效');
  });
  it('强风和雷暴只给天气依据，不生成许可或鱼口结论', () => {
    const forecast = makeForecast();
    forecast.hours[0].code = 95;
    forecast.hours[0].windSpeed = 42;
    const answer = getWeatherAnswer(forecast, request, 'wind');
    expect(answer.status).toBe('ready');
    if (answer.status !== 'ready') throw new Error('expected ready');
    expect(answer.summary).toContain('42.0 km/h');
    expect(answer.weatherAlerts.join(' ')).toMatch(/雷暴/);
    expect(answer.weatherAlerts.join(' ')).toMatch(/强风/);
    expect(answer.summary).not.toMatch(/开放|可钓|鱼口|安全/);
  });
});

const renderReply = (overrides: Partial<Parameters<typeof WeatherReply>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(WeatherReply, {
      request,
      forecast: makeForecast(),
      loading: false,
      locationLabel: '重庆参考位置',
      focus: 'rain',
      intent: 'WEATHER',
      onRefresh: () => {},
      onAsk: () => {},
      ...overrides,
    }),
  );
describe('天气回答界面隔离', () => {
  it('天气问题只有天气指标，不混入钓点目录和时间比较', () => {
    const html = renderReply();
    expect(html).toContain('aria-label="天气回答"');
    expect(html).toContain('weather-answer-metrics');
    expect(html).toContain('那下午呢');
    expect(html).not.toContain('两小时比较');
    expect(html).not.toContain('预报非实测');
    expect(html).not.toContain('342');
  });
  it('只在TIMING意图显示现有的两小时比较', () => {
    expect(renderReply({ intent: 'TIMING' })).toContain('两小时比较');
  });
  it('加载、请求失败和失效缓存不展示正常统计，刷新成功能更新', () => {
    expect(renderReply({ loading: true })).not.toContain('weather-answer-metrics');
    const error = renderReply({ error: '无法连接天气接口，请重试。' });
    expect(error).toContain('无法连接天气接口');
    expect(error).not.toContain('weather-answer-metrics');
    expect(renderReply({ forecast: { ...makeForecast(), stale: true } })).not.toContain(
      'weather-answer-metrics',
    );
    const fresh = makeForecast();
    fresh.hours[0].precipitation = 2;
    expect(renderReply({ forecast: fresh })).toContain('2.0');
  });
});
