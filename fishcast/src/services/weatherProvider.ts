import { z } from 'zod';
import { locationSchema } from '../domain/models';
import type { Forecast, GeoLocation, WeatherProvider } from '../domain/models';

const values = z.array(z.number().finite().nullable());
const apiSchema = z.object({
  timezone: z.literal('Asia/Shanghai'),
  hourly: z.object({
    time: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:00$/)).min(1),
    temperature_2m: values,
    relative_humidity_2m: z.array(z.number().finite().min(0).max(100).nullable()),
    precipitation: z.array(z.number().finite().nonnegative().nullable()),
    wind_speed_10m: z.array(z.number().finite().nonnegative().nullable()),
    wind_direction_10m: z.array(z.number().finite().min(0).max(360).nullable()),
    pressure_msl: z.array(z.number().finite().positive().nullable()),
    weather_code: z.array(z.number().int().min(0).max(99).nullable()),
  }),
});
export function parseForecast(raw: unknown, location: GeoLocation): Forecast {
  const data = apiSchema.parse(raw),
    h = data.hourly;
  if (Object.values(h).some((column) => column.length !== h.time.length))
    throw new Error('天气 API 数据长度不一致');
  const hours = h.time.map((time, i) => ({
    time: `${time}:00+08:00`,
    temperature: h.temperature_2m[i],
    humidity: h.relative_humidity_2m[i],
    precipitation: h.precipitation[i],
    windSpeed: h.wind_speed_10m[i],
    windDirection: h.wind_direction_10m[i],
    pressure: h.pressure_msl[i],
    code: h.weather_code[i],
  }));
  if (
    hours.some((h) => !Number.isFinite(Date.parse(h.time))) ||
    hours.some((h, i) => i > 0 && Date.parse(h.time) - Date.parse(hours[i - 1].time) !== 3600000)
  )
    throw new Error('天气 API 时间序列不连续');
  return {
    source: 'Open-Meteo',
    fetchedAt: new Date().toISOString(),
    timezone: 'Asia/Shanghai',
    location,
    hours,
    stale: false,
    isDemo: false,
  };
}
export class OpenMeteoProvider implements WeatherProvider {
  async getHourlyForecast(
    input: GeoLocation & { timezone: 'Asia/Shanghai' },
    signal?: AbortSignal,
  ): Promise<Forecast> {
    const location = locationSchema.parse(input);
    const params = new URLSearchParams({
      latitude: String(location.lat),
      longitude: String(location.lon),
      timezone: input.timezone,
      forecast_days: '3',
      wind_speed_unit: 'kmh',
      temperature_unit: 'celsius',
      precipitation_unit: 'mm',
      hourly:
        'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,pressure_msl,weather_code',
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: AbortSignal.any([AbortSignal.timeout(12000), ...(signal ? [signal] : [])]),
    });
    if (!response.ok) throw new Error(`天气服务返回 HTTP ${response.status}`);
    return parseForecast(await response.json(), location);
  }
}
