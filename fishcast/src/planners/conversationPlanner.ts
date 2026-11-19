import type { FishingMethod, Forecast, GeoLocation, PlanRequest } from '../domain/models';
import { SEARCH_DISTRICTS, type SearchArea } from '../config/regions';

export type TripDraft = {
  date?: string;
  start?: string;
  end?: string;
  species?: string;
  method?: FishingMethod;
  radius?: number;
  searchArea?: SearchArea;
};
export const localDate = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(date);
export const methodLabel = (method?: FishingMethod) =>
  method === 'TAIDIAO' ? '台钓' : method === 'LUYA' ? '路亚' : '暂不限定';

// Intentionally bounded local grammar, not a model or general-purpose language understanding.
export function parseTripMessage(text: string, previous: TripDraft, now = new Date()) {
  const draft = { ...previous };
  const recognized: string[] = [];
  const issues: string[] = [];
  if (
    /下周|本周|周末|星期|周[一二三四五六日天]|不要|不是|不想|不去|不钓|或者|或明天|或后天/.test(
      text,
    )
  )
    issues.push('这句话含有暂不支持或不明确的条件。请明确写“明天上午”，或用精确设置选择日期。');
  const relative = [...text.matchAll(/今天|明天|后天/g)].map((m) => m[0]);
  const dates = [...text.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0]);
  if (new Set([...relative, ...dates]).size > 1) issues.push('一次请只指定一个出钓日期。');
  if (dates.length || relative.length) {
    draft.date =
      dates[0] ??
      localDate(
        new Date(
          +now +
            ({ 今天: 0, 明天: 1, 后天: 2 }[relative[0] as '今天' | '明天' | '后天'] ?? 0) *
              86400000,
        ),
      );
    recognized.push('日期');
  }
  const periods = [...text.matchAll(/上午|早上|下午|晚上/g)].map((m) => m[0]);
  const timeRange = text.match(
    /(\d{1,2})(?::(\d{2})|点)\s*(?:到|至|[-—~～])\s*(\d{1,2})(?::(\d{2})|点)/,
  );
  if (new Set(periods).size > 1 || (periods.length && timeRange))
    issues.push('请用一个时段或一组精确时间描述，避免歧义。');
  if (timeRange) {
    draft.start = `${timeRange[1].padStart(2, '0')}:${timeRange[2] ?? '00'}`;
    draft.end = `${timeRange[3].padStart(2, '0')}:${timeRange[4] ?? '00'}`;
    if (
      Number(timeRange[1]) > 23 ||
      Number(timeRange[3]) > 23 ||
      Number(timeRange[2] ?? 0) > 59 ||
      Number(timeRange[4] ?? 0) > 59
    )
      issues.push('时间需要在 00:00–23:59 之间。');
    recognized.push('时段');
  } else if (periods.length) {
    [draft.start, draft.end] =
      periods[0] === '下午'
        ? ['12:00', '18:00']
        : periods[0] === '晚上'
          ? ['18:00', '22:00']
          : ['06:00', '12:00'];
    recognized.push('时段');
  } else if (/\d\s*(?:点|:)|中午|全天|傍晚|凌晨/.test(text))
    issues.push('请给出完整时段，例如 07:30-11:00，或使用上午、下午、晚上。');
  const species = [...text.matchAll(/鲫鱼|鲤鱼|草鱼|暂不限定/g)].map((m) => m[0]);
  if (new Set(species).size > 1) issues.push('请先选择一种目标鱼种，或填写“暂不限定”。');
  if (species.length) {
    draft.species = species[0];
    recognized.push('鱼种');
  }
  const methods = [...text.matchAll(/台钓|路亚/g)].map((m) => m[0]);
  if (new Set(methods).size > 1) issues.push('请先选择一种钓法。');
  if (methods.length) {
    draft.method = methods[0] === '台钓' ? 'TAIDIAO' : 'LUYA';
    recognized.push('钓法');
  }
  const radius = text.match(/(\d+(?:\.\d+)?)\s*(?:公里|千米|km)/i);
  const areaText = text.replace(/\s/g, '');
  const areas: SearchArea[] = SEARCH_DISTRICTS.filter((d) =>
    areaText.includes(
      d === '忠县' ? d : d.replace(/(?:土家族苗族自治县|苗族土家族自治县|土家族自治县|区|县)$/, ''),
    ),
  );
  if (/主城九区|主城9区|整个主城|全主城/.test(areaText)) areas.push('MAIN_CITY');
  if (/全重庆|重庆全市|重庆全域|整个重庆|全市/.test(areaText)) areas.push('CHONGQING');
  if (areas.length > 1 || (areas.length && radius))
    issues.push('请选择一个区县、全重庆、主城九区或公里半径，一次使用一种范围。');
  if (areas.length === 1) {
    draft.searchArea = areas[0];
    recognized.push('区域');
  }
  if (radius) {
    delete draft.searchArea;
    draft.radius = Number(radius[1]);
    recognized.push('范围');
    if (draft.radius < 5 || draft.radius > 100) issues.push('范围请设置为 5–100 公里。');
  }
  if (/推荐|附近|找.*钓|看看.*场所/.test(text)) recognized.push('查找场所');
  if (/-\s*\d+\s*(?:公里|千米|km)/i.test(text)) issues.push('范围请设置为 5–100 公里。');
  return { draft: issues.length ? previous : draft, recognized, issues };
}

export function createTripRequest(
  draft: TripDraft,
  location: GeoLocation,
  now = new Date(),
): { request?: PlanRequest; issue?: string } {
  if (!draft.date) return { issue: '你打算哪天出发？可以回复“明天”或“后天”。' };
  if (!draft.start || !draft.end)
    return { issue: '想安排哪个时段？可以回复“上午”“下午”，或“07:30-11:00”。' };
  const startAt = `${draft.date}T${draft.start}:00+08:00`,
    endAt = `${draft.date}T${draft.end}:00+08:00`;
  const start = new Date(startAt),
    end = new Date(endAt);
  if (
    !Number.isFinite(+start) ||
    !Number.isFinite(+end) ||
    localDate(start) !== draft.date ||
    +start <= +now ||
    +end <= +start
  )
    return { issue: '请选择未来日期与时间，并让结束时间晚于开始时间。' };
  if (draft.date > localDate(new Date(+now + 6 * 86400000)))
    return { issue: '目前只核查未来 7 天内的计划；天气可能尚未覆盖所选时段。' };
  return {
    request: {
      location,
      startAt,
      endAt,
      targetSpecies: draft.species ?? '暂不限定',
      method: draft.method ?? 'OTHER',
      radiusKm: draft.radius ?? 30,
      ...(draft.searchArea ? { searchArea: draft.searchArea } : {}),
    },
  };
}

export function summarizeWeather(forecast: Forecast | null, request: PlanRequest) {
  if (!forecast) return '天气暂不可用。请刷新天气后重新核查，我不会用示例数值补齐。';
  if (forecast.stale || Date.now() - Date.parse(forecast.fetchedAt) > 1800000)
    return '当前为非实时天气缓存，请刷新后重新核查。';
  if (
    forecast.location.lat !== request.location.lat ||
    forecast.location.lon !== request.location.lon
  )
    return '天气位置与当前参考位置不匹配，请刷新后重试。';
  const prefix = forecast.isDemo ? 'DEMO / 示例天气，仅演示：' : '出发地预报：';
  const start = Date.parse(request.startAt),
    end = Date.parse(request.endAt);
  const hours = forecast.hours.filter(
    (h) => Date.parse(h.time) < end && Date.parse(h.time) + 3600000 > start,
  );
  const count = Math.ceil((end - Math.floor(start / 3600000) * 3600000) / 3600000);
  if (
    hours.length < count ||
    hours.some((h) => h.temperature === null || h.windSpeed === null || h.precipitation === null)
  )
    return `${prefix}所选时段天气不完整，暂不概括该时段。`;
  const temperatures = hours.map((h) => h.temperature!);
  return `${prefix}${Math.min(...temperatures).toFixed(1)}–${Math.max(...temperatures).toFixed(1)}°C，最大预报风速 ${Math.max(...hours.map((h) => h.windSpeed!)).toFixed(1)} km/h，覆盖小时累计降水 ${hours.reduce((sum, h) => sum + h.precipitation!, 0).toFixed(1)} mm。${hours.some((h) => [95, 96, 99].includes(h.code ?? -1)) ? '预报含雷暴，请暂停出钓安排。' : ''}天气不代表现场安全。`;
}
