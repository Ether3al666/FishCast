import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenMeteoProvider, parseForecast } from '../src/services/weatherProvider';
import { weatherErrorMessage } from '../src/services/weatherErrors';
const location = { lat: 29.56, lon: 106.55, crs: 'WGS84' as const };
const payload = {
  timezone: 'Asia/Shanghai',
  hourly: {
    time: ['2026-11-17T06:00'],
    temperature_2m: [18],
    relative_humidity_2m: [70],
    precipitation: [0],
    wind_speed_10m: [8],
    wind_direction_10m: [90],
    pressure_msl: [1012],
    weather_code: [1],
  },
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe('Open-Meteo 真实接口适配', () => {
  it('首次请求接近 30 秒才失败时，重试等待也不能超出总上限', async () => {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), ms);
      return controller.signal;
    });
    const fetch = vi.fn().mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new TypeError('Failed to fetch')), 29500);
        }),
    );
    vi.stubGlobal('fetch', fetch);
    let settled = false;
    const outcome = new OpenMeteoProvider()
      .getHourlyForecast({ ...location, timezone: 'Asia/Shanghai' })
      .catch((error: unknown) => {
        settled = true;
        return error;
      });
    await vi.advanceTimersByTimeAsync(29999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await outcome).toMatchObject({ name: 'TimeoutError' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('瞬时网络失败后自动重试一次并返回真实预报', async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload)));
    vi.stubGlobal('fetch', fetch);
    const outcome = new OpenMeteoProvider()
      .getHourlyForecast({ ...location, timezone: 'Asia/Shanghai' })
      .then(
        (forecast) => ({ forecast, error: null }),
        (error: unknown) => ({ forecast: null, error }),
      );
    await vi.advanceTimersByTimeAsync(1000);
    const result = await outcome;
    expect(result.error).toBeNull();
    expect(result.forecast?.isDemo).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('临时 HTTP 503 会重试，HTTP 429 和无效数据不会重试', async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload)));
    vi.stubGlobal('fetch', fetch);
    const outcome = new OpenMeteoProvider()
      .getHourlyForecast({ ...location, timezone: 'Asia/Shanghai' })
      .then(
        (forecast) => ({ forecast, error: null }),
        (error: unknown) => ({ forecast: null, error }),
      );
    await vi.advanceTimersByTimeAsync(1000);
    expect((await outcome).error).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const response of [new Response('', { status: 429 }), new Response('{}')]) {
      fetch.mockReset().mockResolvedValue(response);
      await expect(
        new OpenMeteoProvider().getHourlyForecast({ ...location, timezone: 'Asia/Shanghai' }),
      ).rejects.toThrow();
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });
  it('持续网络失败最多请求两次，不无限重试', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetch);
    const outcome = new OpenMeteoProvider()
      .getHourlyForecast({ ...location, timezone: 'Asia/Shanghai' })
      .catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await outcome).toBeInstanceOf(TypeError);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('切换地点取消请求后不会继续自动重试', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetch);
    const controller = new AbortController();
    const outcome = new OpenMeteoProvider()
      .getHourlyForecast({ ...location, timezone: 'Asia/Shanghai' }, controller.signal)
      .catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    await vi.advanceTimersByTimeAsync(1000);
    expect(await outcome).toMatchObject({ name: 'AbortError' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('区分连接超时、网络失败、HTTP 限流与数据错误，不暴露原始请求信息', () => {
    expect(weatherErrorMessage(new DOMException('timeout', 'TimeoutError'))).toContain('30 秒');
    expect(weatherErrorMessage(new TypeError('Failed to fetch'))).toContain('无法连接天气接口');
    expect(weatherErrorMessage(new TypeError('AbortSignal.any is not a function'))).toContain(
      '不兼容',
    );
    expect(weatherErrorMessage(new Error('天气服务返回 HTTP 429'))).toContain('请求过于频繁');
    expect(weatherErrorMessage(new Error('天气服务返回 HTTP 503'))).toContain('HTTP 503');
    expect(weatherErrorMessage(new Error('天气 API 时间序列不连续'))).toContain('数据不完整');
    expect(weatherErrorMessage(new SyntaxError('bad JSON'))).toContain('格式异常');
    expect(
      weatherErrorMessage(new Error('https://example.org/private?location=secret')),
    ).not.toContain('secret');
  });
  it('正确转换中国时区，不伪造 null', () => {
    const forecast = parseForecast(
      { ...payload, hourly: { ...payload.hourly, temperature_2m: [null] } },
      location,
    );
    expect(forecast.hours[0].time).toBe('2026-11-17T06:00:00+08:00');
    expect(forecast.hours[0].temperature).toBeNull();
    expect(forecast.isDemo).toBe(false);
  });
  it('拒绝缺列、长度错误与错误时区', () => {
    expect(() => parseForecast({}, location)).toThrow();
    expect(() => parseForecast({ ...payload, timezone: 'UTC' }, location)).toThrow();
    expect(() =>
      parseForecast({ ...payload, hourly: { ...payload.hourly, wind_speed_10m: [] } }, location),
    ).toThrow();
  });
  it('只请求官方 API，明确 km/h 与时区', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload)));
    vi.stubGlobal('fetch', fetch);
    const forecast = await new OpenMeteoProvider().getHourlyForecast({
      ...location,
      timezone: 'Asia/Shanghai',
    });
    const url = new URL(String(fetch.mock.calls[0][0]));
    expect(url.hostname).toBe('api.open-meteo.com');
    expect(url.searchParams.get('timezone')).toBe('Asia/Shanghai');
    expect(url.searchParams.get('wind_speed_unit')).toBe('kmh');
    expect(forecast.hours[0].windSpeed).toBe(8);
  });
  it('网络和 HTTP 失败应抛出错误，不返回示例', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(
      new OpenMeteoProvider().getHourlyForecast({ ...location, timezone: 'Asia/Shanghai' }),
    ).rejects.toThrow();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    await expect(
      new OpenMeteoProvider().getHourlyForecast({ ...location, timezone: 'Asia/Shanghai' }),
    ).rejects.toThrow();
  });
  it('错误坐标不发起请求', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(
      new OpenMeteoProvider().getHourlyForecast({
        ...location,
        lat: 95,
        timezone: 'Asia/Shanghai',
      }),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('不接受负降水、异常湿度与非连续预报', () => {
    expect(() =>
      parseForecast({ ...payload, hourly: { ...payload.hourly, precipitation: [-1] } }, location),
    ).toThrow();
    expect(() =>
      parseForecast(
        { ...payload, hourly: { ...payload.hourly, relative_humidity_2m: [101] } },
        location,
      ),
    ).toThrow();
    const hourly = Object.fromEntries(
      Object.entries(payload.hourly).map(([key, value]) => [
        key,
        key === 'time' ? ['2026-11-17T06:00', '2026-11-17T08:00'] : [...value, ...value],
      ]),
    );
    expect(() => parseForecast({ ...payload, hourly }, location)).toThrow('不连续');
  });
});
