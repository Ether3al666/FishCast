import {
  locationSchema,
  type Forecast,
  type HourlyWeather,
  type PlanRequest,
} from '../domain/models';
import { RULES } from '../config/scoring-rules';

export type WeatherFocus = 'overview' | 'rain' | 'wind' | 'temperature';
export type WeatherMetric = Exclude<WeatherFocus, 'overview'>;
type CompleteHour = HourlyWeather & {
  temperature: number;
  precipitation: number;
  windSpeed: number;
  code: number;
};
export type WeatherAnswer =
  | { status: 'unavailable'; summary: string }
  | {
      status: 'ready';
      summary: string;
      metricOrder: WeatherMetric[];
      rainMm: number;
      windKmh: number;
      minTemp: number;
      maxTemp: number;
      hours: CompleteHour[];
      coverageNote: string;
      weatherAlerts: string[];
    };

const HOUR = 3_600_000;
const unavailable = (summary: string): WeatherAnswer => ({ status: 'unavailable', summary });
const clock = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const day = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: 'long',
  day: 'numeric',
});
const dayKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function weatherPeriod(startAt: string | number, endAt: string | number) {
  const start = typeof startAt === 'number' ? startAt : Date.parse(startAt);
  const end = typeof endAt === 'number' ? endAt : Date.parse(endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return '时间待调整';
  return `${day.format(start)} ${clock.format(start)}–${dayKey.format(start) === dayKey.format(end) ? '' : `${day.format(end)} `}${clock.format(end)}`;
}

// Both request and provider times must be unambiguous ISO instants, not local browser times.
function timestamp(value: string) {
  if (typeof value !== 'string') return NaN;
  const parts = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
  );
  if (!parts) return NaN;
  const [year, month, day, hour, minute, second] = parts.slice(1).map(Number);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate() ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  )
    return NaN;
  return Date.parse(value);
}

export function getWeatherAnswer(
  forecast: Forecast | null,
  request: PlanRequest,
  focus: WeatherFocus = 'overview',
  now = Date.now(),
): WeatherAnswer {
  const start = timestamp(request.startAt),
    end = timestamp(request.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= now)
    return unavailable('所选时间无效或已经结束，请调整日期和时段。');
  if (!forecast) return unavailable('暂时没有这个位置的天气预报，请重新查询天气。');
  if (forecast.isDemo) return unavailable('当前是示例天气，无法回答真实天气情况，请重新查询天气。');
  const fetched = timestamp(forecast.fetchedAt);
  if (!Number.isFinite(fetched) || fetched > now + 60_000)
    return unavailable('天气更新时间异常，请重新查询天气。');
  if (forecast.stale || now - fetched > 30 * 60_000)
    return unavailable('这份天气缓存已过期，请重新查询天气后查看。');
  if (
    !locationSchema.safeParse(forecast.location).success ||
    !locationSchema.safeParse(request.location).success ||
    forecast.location.lat !== request.location.lat ||
    forecast.location.lon !== request.location.lon
  )
    return unavailable('天气位置与当前参考位置不匹配，请重新查询天气。');
  if (forecast.timezone !== 'Asia/Shanghai' || !forecast.source.trim())
    return unavailable('天气来源或时区信息不完整，请重新查询天气。');
  if (
    !forecast.hours.length ||
    forecast.hours.some((hour) => !Number.isFinite(timestamp(hour.time)))
  )
    return unavailable('逐小时天气时间信息不完整，请重新查询天气。');

  const coverageStart = Math.floor(start / HOUR) * HOUR;
  const expected = Math.ceil((end - coverageStart) / HOUR);
  const selected = forecast.hours
    .filter((hour) => timestamp(hour.time) < end && timestamp(hour.time) + HOUR > start)
    .sort((a, b) => timestamp(a.time) - timestamp(b.time));
  if (
    selected.length !== expected ||
    selected.some(
      (hour, i) =>
        timestamp(hour.time) !== coverageStart + i * HOUR ||
        [hour.temperature, hour.precipitation, hour.windSpeed, hour.code].some(
          (value) => value === null || !Number.isFinite(value),
        ) ||
        hour.precipitation! < 0 ||
        hour.windSpeed! < 0 ||
        !Number.isInteger(hour.code) ||
        hour.code! < 0 ||
        hour.code! > 99,
    )
  )
    return unavailable('预报未完整覆盖所选时段，或关键天气数据缺失，请重新查询天气或调整时段。');

  const hours = selected as CompleteHour[];
  const minTemp = Math.min(...hours.map((hour) => hour.temperature));
  const maxTemp = Math.max(...hours.map((hour) => hour.temperature));
  const rainMm = hours.reduce((sum, hour) => sum + hour.precipitation, 0);
  const windKmh = Math.max(...hours.map((hour) => hour.windSpeed));
  if (!Number.isFinite(rainMm)) return unavailable('降水数据异常，请重新查询天气。');
  const rainText = rainMm > 0 ? '预报有降水' : '预报没有降水';
  const summaries: Record<WeatherFocus, string> = {
    temperature: `所选时段预报气温为 ${minTemp.toFixed(1)}–${maxTemp.toFixed(1)}°C。`,
    rain: `${rainText}，覆盖小时累计 ${rainMm.toFixed(1)} mm。`,
    wind: `所选时段最大预报风速为 ${windKmh.toFixed(1)} km/h。`,
    overview: `${minTemp.toFixed(1)}–${maxTemp.toFixed(1)}°C；${rainText}，累计 ${rainMm.toFixed(1)} mm；最大预报风速 ${windKmh.toFixed(1)} km/h。`,
  };
  const weatherAlerts: string[] = [];
  if (hours.some((hour) => [95, 96, 99].includes(hour.code)))
    weatherAlerts.push('预报含雷暴，请避开该时段的户外垂钓。');
  if (windKmh >= RULES.stopWindKmh)
    weatherAlerts.push(
      `最大预报风速达到强风规则阈值（${RULES.stopWindKmh} km/h），不宜安排户外垂钓。`,
    );
  if (hours.some((hour) => hour.precipitation >= RULES.stopHourlyRainMm))
    weatherAlerts.push(`预报有单小时降水达到 ${RULES.stopHourlyRainMm} mm 的时段，请避开强降水。`);
  const metricOrder: WeatherMetric[] =
    focus === 'overview'
      ? ['temperature', 'rain', 'wind']
      : [
          focus,
          ...(['temperature', 'rain', 'wind'] as WeatherMetric[]).filter(
            (metric) => metric !== focus,
          ),
        ];
  return {
    status: 'ready',
    summary: summaries[focus],
    metricOrder,
    rainMm,
    windKmh,
    minTemp,
    maxTemp,
    hours,
    weatherAlerts,
    coverageNote: `降水按覆盖的整小时累计：${weatherPeriod(coverageStart, coverageStart + expected * HOUR)}${start % HOUR || end % HOUR ? '，包含时段边界外的部分时间' : ''}。`,
  };
}
