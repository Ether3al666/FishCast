import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenMeteoProvider, parseForecast } from '../src/services/weatherProvider';
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
afterEach(() => vi.unstubAllGlobals());
describe('Open-Meteo 真实接口适配', () => {
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
