import {
  locationSchema,
  type Forecast,
  type GeoLocation,
  type PlanRequest,
  type Spot,
} from '../domain/models';
import { RULES } from '../config/scoring-rules';
import { matchesArea } from '../config/regions';

export function distanceKm(a: GeoLocation, b: GeoLocation) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function demandIssues(spot: Spot, request: PlanRequest) {
  const issues: string[] = [];
  if (request.targetSpecies !== '暂不限定' && !spot.fishSpecies.includes(request.targetSpecies))
    issues.push(spot.fishSpecies.length ? '目标鱼种不匹配' : '缺少目标鱼种资料');
  if (request.method !== 'OTHER' && !spot.methods.includes(request.method))
    issues.push(spot.methods.length ? '钓法不匹配' : '缺少钓法资料');
  return issues;
}
export function findCandidates(request: PlanRequest, spots: Spot[]) {
  let outsideRadius = 0,
    outsideArea = 0,
    withoutLocation = 0,
    excluded = 0;
  const candidates = spots
    .flatMap((spot) => {
      if (spot.isDemo || spot.legalStatus === 'PROHIBITED' || !spot.evidence.length) {
        excluded++;
        return [];
      }
      if (!matchesArea(spot, request.searchArea)) {
        outsideArea++;
        return [];
      }
      if (!locationSchema.safeParse(spot.location).success) {
        withoutLocation++;
        return [];
      }
      if (
        (request.targetSpecies !== '暂不限定' &&
          spot.fishSpecies.length &&
          !spot.fishSpecies.includes(request.targetSpecies)) ||
        (request.method !== 'OTHER' &&
          spot.methods.length &&
          !spot.methods.includes(request.method))
      ) {
        excluded++;
        return [];
      }
      const distance = distanceKm(request.location, spot.location!);
      if (!request.searchArea && distance > request.radiusKm) {
        outsideRadius++;
        return [];
      }
      const methodMatch = request.method !== 'OTHER' && spot.methods.includes(request.method);
      const methodHint = request.method !== 'OTHER' && spot.methodHints?.includes(request.method);
      const notes = [
        request.targetSpecies === '暂不限定'
          ? '未限定鱼种'
          : spot.fishSpecies.includes(request.targetSpecies)
            ? '资料记录了目标鱼种'
            : '鱼种信息请咨询场所',
        methodMatch
          ? '资料记录了所选钓法'
          : methodHint
            ? '名称含所选钓法线索，具体服务请咨询场所'
            : '钓法信息请咨询场所',
      ];
      return [
        {
          spot,
          distanceKm: distance,
          notes,
          priority: methodMatch
            ? 2
            : methodHint
              ? 1
              : request.method !== 'OTHER' && spot.methodHints?.length
                ? -1
                : 0,
        },
      ];
    })
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        a.distanceKm - b.distanceKm ||
        a.spot.id.localeCompare(b.spot.id),
    );
  return { candidates, outsideRadius, outsideArea, withoutLocation, excluded };
}

export function weatherWindows(forecast: Forecast | null, request: PlanRequest) {
  type Window = {
    startAt: string;
    endAt: string;
    rainMm: number;
    windKmh: number;
    minTemp: number;
    maxTemp: number;
  };
  const unavailable = (message: string): { windows: Window[]; message: string } => ({
    windows: [],
    message,
  });
  if (
    !forecast ||
    forecast.stale ||
    forecast.isDemo ||
    !Number.isFinite(Date.parse(forecast.fetchedAt)) ||
    Date.now() - Date.parse(forecast.fetchedAt) > 1800000 ||
    Date.parse(forecast.fetchedAt) > Date.now() + 60000
  )
    return unavailable('当地近期真实天气不可用，请刷新后重试。');
  if (distanceKm(forecast.location, request.location) > 0.1)
    return unavailable('天气位置不匹配，请重新查询这个场所。');
  const start = Date.parse(request.startAt),
    end = Date.parse(request.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < Date.now() || end <= start)
    return unavailable('出行时间无效或已过去，请修改时间。');
  const hours = forecast.hours
    .filter((h) => Date.parse(h.time) < end && Date.parse(h.time) + 3600000 > start)
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  const expected = Math.ceil((end - Math.floor(start / 3600000) * 3600000) / 3600000);
  if (
    hours.length !== expected ||
    new Set(hours.map((h) => h.time)).size !== expected ||
    hours.some(
      (h, i) =>
        [h.temperature, h.precipitation, h.windSpeed, h.code].some(
          (v) => v === null || !Number.isFinite(v),
        ) ||
        (i > 0 && Date.parse(h.time) - Date.parse(hours[i - 1].time) !== 3600000),
    )
  )
    return unavailable('预报未完整覆盖所选时段，暂不比较时间窗口。');
  if (
    hours.some(
      (h) =>
        [95, 96, 99].includes(h.code!) ||
        h.windSpeed! >= RULES.stopWindKmh ||
        h.precipitation! >= RULES.stopHourlyRainMm,
    )
  )
    return unavailable('所选时段预报存在雷暴、强风或强降水，暂停出钓安排。');
  const windows: Window[] = [];
  for (let i = 0; i < hours.length - 1; i++) {
    const pair = hours.slice(i, i + 2),
      at = Date.parse(pair[0].time);
    if (at < start || at + 7200000 > end) continue;
    windows.push({
      startAt: pair[0].time,
      endAt: new Date(at + 7200000).toISOString(),
      rainMm: pair.reduce((v, h) => v + h.precipitation!, 0),
      windKmh: Math.max(...pair.map((h) => h.windSpeed!)),
      minTemp: Math.min(...pair.map((h) => h.temperature!)),
      maxTemp: Math.max(...pair.map((h) => h.temperature!)),
    });
  }
  windows.sort(
    (a, b) =>
      a.rainMm - b.rainMm || a.windKmh - b.windKmh || Date.parse(a.startAt) - Date.parse(b.startAt),
  );
  return {
    windows: windows.slice(0, 2),
    message: windows.length
      ? '按累计降水较少、最大风速较小排序；仅比较预报，不代表鱼口或现场安全。'
      : '所选时段不足两个完整小时，可查看逐小时天气或延长时段。',
  };
}
