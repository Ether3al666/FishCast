import type { Forecast, Spot } from '../domain/models';
import { RULES } from '../config/scoring-rules';
import { locationSchema } from '../domain/models';

export function safetyGate(
  spot: Spot,
  weather: Forecast | null,
  startAt: string,
  endAt: string,
  now = new Date(),
) {
  const reasons: string[] = [];
  const start = new Date(startAt),
    end = new Date(endAt);
  const validWindow = Number.isFinite(+start) && Number.isFinite(+end) && end > start;
  if (!validWindow) reasons.push('时间窗无效');
  if (validWindow && start < now) reasons.push('开始时间已过去');
  if (spot.isDemo) reasons.push('DEMO 示例不得进入正式推荐');
  if (!locationSchema.safeParse(spot.location).success) reasons.push('缺少有效 WGS84 坐标');
  if (spot.legalStatus !== 'VERIFIED_OPEN')
    reasons.push(spot.legalStatus === 'PROHIBITED' ? '明确禁止垂钓' : '开放许可未完成核实');
  const verified = spot.verifiedAt ? Date.parse(spot.verifiedAt) : NaN;
  if (
    !Number.isFinite(verified) ||
    verified > +now ||
    +now - verified > RULES.evidenceMaxAgeDays * 86400000
  )
    reasons.push('许可证据缺失或已过期');
  if (!spot.evidence.length) reasons.push('缺少可追溯来源');
  if (spot.legalConditions.length) reasons.push('场所附加条件尚需核对');
  if (spot.appliesClosedSeason && validWindow) {
    for (let year = start.getUTCFullYear() - 1; year <= end.getUTCFullYear() + 1; year++) {
      if (
        +start < Date.parse(`${year}-07-01T00:00:00+08:00`) &&
        +end > Date.parse(`${year}-03-01T00:00:00+08:00`)
      ) {
        reasons.push('时间窗涉及禁钓期（适用禁捕水域）');
        break;
      }
    }
  }
  if (
    !weather ||
    weather.stale ||
    weather.isDemo ||
    +now - Date.parse(weather.fetchedAt) > 3600000 ||
    Date.parse(weather.fetchedAt) > +now ||
    !Number.isFinite(Date.parse(weather.fetchedAt))
  )
    reasons.push('无有效近期真实天气');
  else if (validWindow) {
    if (
      spot.location &&
      (Math.abs(weather.location.lat - spot.location.lat) > 0.01 ||
        Math.abs(weather.location.lon - spot.location.lon) > 0.01)
    )
      reasons.push('天气坐标与钓点不匹配');
    const expected = Math.ceil((+end - Math.floor(+start / 3600000) * 3600000) / 3600000);
    const hours = weather.hours.filter(
      (hour) => +new Date(hour.time) < +end && +new Date(hour.time) + 3600000 > +start,
    );
    if (
      new Set(hours.map((h) => h.time)).size < expected ||
      hours.some(
        (h) =>
          h.temperature === null ||
          h.windSpeed === null ||
          h.precipitation === null ||
          h.code === null,
      )
    )
      reasons.push('时间窗内天气数据不完整');
    if (
      hours.some(
        (h) =>
          (h.windSpeed ?? 0) >= RULES.stopWindKmh ||
          (h.precipitation ?? 0) >= RULES.stopHourlyRainMm ||
          [95, 96, 99].includes(h.code ?? -1),
      )
    )
      reasons.push('预报存在雷暴、强风或强降水风险，暂停推荐');
  }
  return {
    eligible: reasons.length === 0,
    reasons,
    warnings: ['尚未接入权威预警与水位，不能据此判断安全'],
  };
}
