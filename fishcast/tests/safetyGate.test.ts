import { describe, expect, it } from 'vitest';
import type { Forecast, Spot } from '../src/domain/models';
import { safetyGate } from '../src/engines/safetyGate';
import { demoSpots } from '../src/data/demo-fixtures';
import { realSpots } from '../src/data/spots';
import { RuleBasedPlanner } from '../src/planners/RuleBasedPlanner';

// 仅用于单元测试的合成输入，不是任何真实地点的开放声明。
const now = new Date('2026-11-16T00:00:00Z');
const start = '2026-11-17T06:00:00+08:00',
  end = '2026-11-17T08:00:00+08:00';
const location = { lat: 29.56, lon: 106.55, crs: 'WGS84' as const };
const spot: Spot = {
  id: 'test-only',
  name: '合成测试输入',
  district: 'TEST',
  location,
  waterType: 'POND',
  fishSpecies: [],
  methods: [],
  legalStatus: 'VERIFIED_OPEN',
  legalConditions: [],
  evidence: [
    { url: 'https://example.org/test-only', title: 'TEST ONLY', retrievedAt: now.toISOString() },
  ],
  verifiedAt: now.toISOString(),
  appliesClosedSeason: false,
  isDemo: false,
  notes: '',
};
const weather: Forecast = {
  source: 'TEST ONLY',
  fetchedAt: now.toISOString(),
  timezone: 'Asia/Shanghai',
  location,
  hours: [6, 7].map((hour) => ({
    time: `2026-11-17T0${hour}:00:00+08:00`,
    temperature: 18,
    humidity: 60,
    precipitation: 0,
    windSpeed: 5,
    windDirection: 90,
    pressure: 1015,
    code: 1,
  })),
  stale: false,
  isDemo: false,
};
const run = (s = spot, w: Forecast | null = weather, a = start, b = end) =>
  safetyGate(s, w, a, b, now);

describe('合规与安全硬闸门', () => {
  it('合成完整输入通过资料闸门，但不是安全认证', () => expect(run().eligible).toBe(true));
  it.each(['UNKNOWN', 'PROHIBITED', 'CONDITIONAL'] as const)('%s 绝不通过', (legalStatus) =>
    expect(run({ ...spot, legalStatus }).eligible).toBe(false),
  );
  it('demo 永不进入正式推荐', () => demoSpots.forEach((s) => expect(run(s).eligible).toBe(false)));
  it('真实种子为空且无 demo', () => expect(realSpots).toEqual([]));
  it('没有来源或证据过期不可推荐', () => {
    expect(run({ ...spot, evidence: [] }).eligible).toBe(false);
    expect(run({ ...spot, verifiedAt: '2026-10-01T00:00:00Z' }).eligible).toBe(false);
    expect(run({ ...spot, verifiedAt: '2027-01-01T00:00:00Z' }).eligible).toBe(false);
  });
  it('拒绝不合法坐标与未知位置', () => {
    expect(run({ ...spot, location: { ...location, lat: 999 } }).eligible).toBe(false);
    expect(run({ ...spot, location: null }).eligible).toBe(false);
  });
  it('缺失、过时和示例天气全部拒绝', () => {
    expect(run(spot, null).eligible).toBe(false);
    expect(run(spot, { ...weather, stale: true }).eligible).toBe(false);
    expect(run(spot, { ...weather, isDemo: true }).eligible).toBe(false);
    expect(run(spot, { ...weather, fetchedAt: 'invalid' }).eligible).toBe(false);
  });
  it('天气坐标不匹配则拒绝', () =>
    expect(run(spot, { ...weather, location: { ...location, lat: 31 } }).eligible).toBe(false));
  it('部分时段和缺失天气指标不视为完整', () => {
    expect(run(spot, { ...weather, hours: weather.hours.slice(0, 1) }).eligible).toBe(false);
    expect(
      run(spot, { ...weather, hours: weather.hours.map((h) => ({ ...h, windSpeed: null })) })
        .eligible,
    ).toBe(false);
  });
  it('雷暴、强风、强降水触发中止阈值', () => {
    for (const override of [{ code: 95 }, { windSpeed: 45 }, { precipitation: 12 }]) {
      expect(
        run(spot, { ...weather, hours: weather.hours.map((h) => ({ ...h, ...override })) })
          .eligible,
      ).toBe(false);
    }
  });
  it('只对适用禁捕水域检查跨入禁钓期的时间窗', () => {
    const result = run(
      { ...spot, appliesClosedSeason: true },
      weather,
      '2027-02-28T23:00:00+08:00',
      '2027-03-01T02:00:00+08:00',
    );
    expect(result.reasons).toContain('时间窗涉及禁钓期（适用禁捕水域）');
    expect(run({ ...spot, appliesClosedSeason: false }).reasons).not.toContain(
      '时间窗涉及禁钓期（适用禁捕水域）',
    );
  });
  it('无效或反向时间窗被拒绝', () => {
    expect(run(spot, weather, 'bad', end).eligible).toBe(false);
    expect(run(spot, weather, end, start).eligible).toBe(false);
  });
  it('P0 规划器不生成分数或排名', () => {
    const results = new RuleBasedPlanner().plan(
      {
        location,
        startAt: start,
        endAt: end,
        targetSpecies: '鲫鱼',
        method: 'TAIDIAO',
        radiusKm: 30,
      },
      { spots: demoSpots, forecast: weather },
    );
    expect(results).toHaveLength(2);
    expect(results.every((r) => !r.eligible && r.score === null && r.confidence === 'LOW')).toBe(
      true,
    );
  });
});
